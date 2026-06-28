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
import { getSession, requireSession, sessionCookie, clearCookie, resolvePersonName, isNunu } from './_auth.js';

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
        const ldgRaw = await redis.hget(`group:${G0_ID}:members`, userId);
        if (ldgRaw) {
          const ldgMember = typeof ldgRaw === 'string' ? JSON.parse(ldgRaw) : ldgRaw;
          if (!isNunu(ldgMember?.displayName)) {
            return res.status(403).json({ error: 'denied', deniedBy: 'Nunu' });
          }
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
