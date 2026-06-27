// Vercel Serverless Function — shared DJ picks for the crew.
// Auto-served at /api/picks.
//
// Storage: a Redis hash per group, keyed group:<gid>:picks.
//   field = "<setId>|<person>"  value = "1"   (presence == picked)
// Each toggle is one atomic HSET/HDEL, so concurrent edits never clobber.
// The `g` query param selects the group; omit to use the original GDL crew (g0).

import { Redis } from '@upstash/redis';
import { requireMembership } from './_auth.js';

const G0_ID = 'ldg';
const SEP = '|';

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL  || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

// Rebuild the flat hash into the shape the UI uses: { [setId]: { [person]: true } }
function toPicks(flat) {
  const picks = {};
  for (const field of Object.keys(flat || {})) {
    const i = field.lastIndexOf(SEP);
    if (i === -1) continue;
    const setId = field.slice(0, i);
    const person = field.slice(i + 1);
    (picks[setId] ||= {})[person] = true;
  }
  return picks;
}

export default async function handler(req, res) {
  try {
    const gid = req.query?.g || G0_ID;
    const HASH_KEY = `group:${gid}:picks`;

    // Auth gate: every read and write needs a valid session + group membership.
    const mem = await requireMembership(req, res, gid, redis);
    if (!mem) return;
    const { session } = mem;

    if (req.method === 'GET') {
      const flat = await redis.hgetall(HASH_KEY);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ picks: toPicks(flat) });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      // Reset everyone's picks — guarded. A full wipe requires the explicit
      // phrase, so a stray script or accidental call can't nuke the crew's data.
      if (body.action === 'reset') {
        if (body.confirm !== 'RESET') {
          return res.status(400).json({ error: 'reset requires confirm: "RESET"' });
        }
        await redis.del(HASH_KEY);
        return res.status(200).json({ ok: true });
      }

      // Clear all of ONE person's picks (used by the per-person reset).
      // Only touches the SIGNED-IN person's fields. Stashes a 24h backup first.
      if (body.action === 'clearMine') {
        const person = session.person;
        const flat = (await redis.hgetall(HASH_KEY)) || {};
        const fields = Object.keys(flat).filter(f => f.endsWith(`${SEP}${person}`));
        if (fields.length) {
          await redis.set(`group:${gid}:picks_trash:${person}`, JSON.stringify(fields), { ex: 86400 });
          await redis.hdel(HASH_KEY, ...fields);
        }
        return res.status(200).json({ ok: true, cleared: fields.length });
      }

      // Restore the last clear for the signed-in person (server-side undo).
      if (body.action === 'restoreTrash') {
        const person = session.person;
        const raw = await redis.get(`group:${gid}:picks_trash:${person}`);
        const fields = Array.isArray(raw) ? raw : (raw ? JSON.parse(raw) : []);
        if (fields.length) {
          const obj = {};
          for (const f of fields) obj[f] = '1';
          await redis.hset(HASH_KEY, obj);
        }
        return res.status(200).json({ ok: true, restored: fields.length });
      }

      // Toggle one (set, person) flag. The person is the signed-in user — a
      // forged body.person can't toggle someone else's pick.
      const { setId, picked } = body;
      const person = session.person;
      if (typeof setId !== 'string' || !setId || setId.includes(SEP)) {
        return res.status(400).json({ error: 'invalid setId' });
      }
      const field = `${setId}${SEP}${person}`;
      if (picked) {
        await redis.hset(HASH_KEY, { [field]: '1' });
      } else {
        await redis.hdel(HASH_KEY, field);
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'storage unavailable' });
  }
}
