// Vercel Serverless Function — shared DJ picks for the crew.
// Auto-served at /api/picks (Vercel detects the api/ folder for any project).
//
// Storage: a single Redis hash "picks".
//   field = "<setId>|<person>"  value = "1"   (presence == picked)
// Each toggle is one atomic HSET/HDEL, so concurrent edits never clobber.

import { Redis } from '@upstash/redis';

const PEOPLE = ['Grant', 'Desmond', 'Lawrence'];
const HASH_KEY = 'picks';
const SEP = '|';

// Support either the Upstash Marketplace vars or the legacy KV_* vars.
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
    if (req.method === 'GET') {
      const flat = await redis.hgetall(HASH_KEY);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ picks: toPicks(flat) });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      // Reset everyone's picks — guarded. A full wipe requires the explicit
      // phrase, so a stray script or accidental call can't nuke the crew's
      // data. The check runs BEFORE any delete.
      if (body.action === 'reset') {
        if (body.confirm !== 'RESET') {
          return res.status(400).json({ error: 'reset requires confirm: "RESET"' });
        }
        await redis.del(HASH_KEY);
        return res.status(200).json({ ok: true });
      }

      // Clear all of ONE person's picks (used by the per-person reset).
      // Only touches that person's fields — never the rest of the crew's.
      if (body.action === 'clearMine') {
        if (!PEOPLE.includes(body.person)) {
          return res.status(400).json({ error: 'invalid person' });
        }
        const flat = (await redis.hgetall(HASH_KEY)) || {};
        const fields = Object.keys(flat).filter(f => f.endsWith(`${SEP}${body.person}`));
        if (fields.length) await redis.hdel(HASH_KEY, ...fields);
        return res.status(200).json({ ok: true, cleared: fields.length });
      }

      // Toggle one (set, person) flag.
      const { setId, person, picked } = body;
      if (typeof setId !== 'string' || !setId || setId.includes(SEP)) {
        return res.status(400).json({ error: 'invalid setId' });
      }
      if (!PEOPLE.includes(person)) {
        return res.status(400).json({ error: 'invalid person' });
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
