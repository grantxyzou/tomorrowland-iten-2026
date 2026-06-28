// Vercel Serverless Function — sign-in / sign-out / session check / account delete.
// Auto-served at /api/auth.
//
// Flow: the client gets a Google ID token from the "Sign in with Google" button
// (Google Identity Services) and POSTs it here. We verify that token against
// Google and — if the email is verified — set our own signed session cookie (see
// api/_auth.js). From then on the data endpoints trust the cookie; Google is not
// contacted again until the session expires.
//
// Person name for the session is resolved from existing group memberships first
// (so LDG crew keep their stable pick-key names), falling back to Google given_name.
//
//   POST { action:'login',  idToken } -> verify + Set-Cookie, returns {person,email}
//   POST { action:'logout' }          -> clears the cookie
//   POST { action:'delete' }          -> removes all user data + clears cookie
//   GET                               -> { person, email } if signed in, else 401

import { OAuth2Client } from 'google-auth-library';
import { Redis } from '@upstash/redis';
import { getSession, requireSession, sessionCookie, clearCookie, resolvePersonName, isNunu, validateDisplayName, remapPickFields } from './_auth.js';

const G0_ID = 'ldg';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const client = new OAuth2Client(CLIENT_ID);

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL  || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET') {
      const s = getSession(req);
      if (!s) return res.status(401).json({ error: 'unauthorized' });
      return res.status(200).json({ person: s.person, email: s.email });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      if (body.action === 'logout') {
        res.setHeader('Set-Cookie', clearCookie());
        return res.status(200).json({ ok: true });
      }

      // Delete account: remove all user data from every group + clear the session.
      if (body.action === 'delete') {
        const session = requireSession(req, res);
        if (!session) return;
        const userId = session.email.toLowerCase();

        // Nunu's decree: ldg members other than Nunu can't delete (it would drop
        // them from the original crew). Non-ldg users delete normally.
        const inLdg = await redis.hexists(`group:${G0_ID}:members`, userId);
        if (inLdg && !isNunu(userId)) {
          return res.status(403).json({ error: 'denied', deniedBy: 'Nunu' });
        }

        const groupIds = await redis.smembers(`user:${userId}:groups`);
        for (const gid of (groupIds || [])) {
          const raw = await redis.hget(`group:${gid}:members`, userId);
          if (!raw) continue;
          const member = typeof raw === 'string' ? JSON.parse(raw) : raw;
          const displayName = member?.displayName;

          await redis.hdel(`group:${gid}:members`, userId);

          if (displayName) {
            const flat = await redis.hgetall(`group:${gid}:picks`);
            const myFields = Object.keys(flat || {}).filter(f => f.endsWith(`|${displayName}`));
            if (myFields.length) await redis.hdel(`group:${gid}:picks`, ...myFields);
            await redis.hdel(`group:${gid}:status`, displayName);
            await redis.hdel(`group:${gid}:loc`,    displayName);
          }
        }
        if ((groupIds || []).length > 0) await redis.del(`user:${userId}:groups`);

        res.setHeader('Set-Cookie', clearCookie());
        return res.status(200).json({ ok: true });
      }

      // Rename: change the caller's display name across ALL their crews and
      // re-key their picks/status/location, then re-mint the session. Identity is
      // global (one session.person, data keyed by it everywhere), so renaming has
      // to be global to stay consistent. Order = data → member records → cookie,
      // so a partial failure is idempotent (re-running completes it).
      if (body.action === 'rename') {
        const session = requireSession(req, res);
        if (!session) return;
        const userId = session.email.toLowerCase();

        const check = validateDisplayName(body.name);
        if (!check.ok) return res.status(400).json({ error: check.error });
        const N = check.value;

        const groupIds = (await redis.smembers(`user:${userId}:groups`)) || [];

        // Load every crew's roster once: lets us find my old name(s), detect a
        // global name collision, and guard against sweeping a same-named member.
        const rosters = {}; // gid -> { email -> member }
        const oldNames = new Set();
        if (session.person) oldNames.add(session.person);
        for (const gid of groupIds) {
          const flat = await redis.hgetall(`group:${gid}:members`);
          const roster = {};
          for (const [email, raw] of Object.entries(flat || {})) {
            roster[email] = typeof raw === 'string' ? JSON.parse(raw) : raw;
          }
          rosters[gid] = roster;
          if (roster[userId]?.displayName) oldNames.add(roster[userId].displayName);
        }
        oldNames.delete(N); // never sweep the target name onto itself

        // Global collision: another member already uses N in any of my crews.
        for (const gid of groupIds) {
          for (const [email, m] of Object.entries(rosters[gid])) {
            if (email !== userId && m?.displayName === N) {
              return res.status(409).json({ error: 'name taken' });
            }
          }
        }

        // Re-key data first, then member records.
        for (const gid of groupIds) {
          const othersNames = new Set(
            Object.entries(rosters[gid])
              .filter(([email]) => email !== userId)
              .map(([, m]) => m?.displayName)
              .filter(Boolean)
          );
          for (const O of oldNames) {
            if (othersNames.has(O)) continue; // don't steal a same-named member's data

            const picksFlat = await redis.hgetall(`group:${gid}:picks`);
            for (const [oldF, newF] of remapPickFields(Object.keys(picksFlat || {}), O, N)) {
              await redis.hset(`group:${gid}:picks`, { [newF]: picksFlat[oldF] });
              await redis.hdel(`group:${gid}:picks`, oldF);
            }
            const st = await redis.hget(`group:${gid}:status`, O);
            if (st != null) {
              await redis.hset(`group:${gid}:status`, { [N]: st });
              await redis.hdel(`group:${gid}:status`, O);
            }
            const lc = await redis.hget(`group:${gid}:loc`, O);
            if (lc != null) {
              await redis.hset(`group:${gid}:loc`, { [N]: lc });
              await redis.hdel(`group:${gid}:loc`, O);
            }
            const trashKey = `group:${gid}:picks_trash:${O}`;
            const trash = await redis.get(trashKey);
            if (trash != null) {
              const ttl = await redis.ttl(trashKey);
              await redis.set(`group:${gid}:picks_trash:${N}`, trash, ttl > 0 ? { ex: ttl } : {});
              await redis.del(trashKey);
            }
          }
          const mine = rosters[gid][userId];
          if (mine) {
            await redis.hset(`group:${gid}:members`, { [userId]: JSON.stringify({ ...mine, displayName: N }) });
          }
        }

        // Re-mint the session last (so a half-failure leaves session.person = old).
        res.setHeader('Set-Cookie', sessionCookie({ person: N, email: session.email }));
        return res.status(200).json({ person: N });
      }

      // Default action: login with a Google ID token.
      const idToken = body.idToken;
      if (typeof idToken !== 'string' || !idToken) {
        return res.status(400).json({ error: 'missing idToken' });
      }
      if (!CLIENT_ID) {
        return res.status(500).json({ error: 'auth not configured' });
      }

      let payload;
      try {
        const ticket = await client.verifyIdToken({ idToken, audience: CLIENT_ID });
        payload = ticket.getPayload();
      } catch {
        return res.status(401).json({ error: 'invalid token' });
      }

      if (!payload || payload.email_verified !== true) {
        return res.status(401).json({ error: 'email not verified' });
      }

      const email  = payload.email.toLowerCase();
      const person = await resolvePersonName(redis, email, payload.given_name);

      res.setHeader('Set-Cookie', sessionCookie({ person, email }));
      return res.status(200).json({ person, email });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'auth error' });
  }
}
