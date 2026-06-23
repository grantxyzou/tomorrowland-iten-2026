// Vercel Serverless Function — lightweight crew status / pings.
// Auto-served at /api/status.
//
// Not a chat thread — a glanceable "current status" board. Each person posts
// one short line ("Heading to mainstage", "Food break", "Where are you?", or
// free text) and everyone sees it, refreshing on the same near-real-time poll
// as picks. Built for a field with terrible signal: writes queue offline and
// flush on reconnect (see src/hooks/useCrewStatus.js).
//
// Storage: a Redis hash "crew_status".
//   field = "<person>"   value = JSON { text, ts }
// A few-hour TTL on the key lets stale statuses fade after the day winds down
// (picks have no TTL; statuses do — the one deliberate difference).

import { Redis } from '@upstash/redis';

const PEOPLE = ['Grant', 'Desmond', 'Lawrence'];
const HASH_KEY = 'crew_status';
const TTL_SEC = 60 * 60 * 4;   // statuses fade after ~4h
const MAX_LEN = 80;

// Support either the Upstash Marketplace vars or the legacy KV_* vars.
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL  || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

// Each hash value is JSON; tolerate either a parsed object (Upstash auto-parse)
// or a raw string, and skip anything malformed.
function toStatuses(flat) {
  const out = {};
  for (const person of Object.keys(flat || {})) {
    if (!PEOPLE.includes(person)) continue;
    const raw = flat[person];
    try {
      const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (v && typeof v.text === 'string') out[person] = { text: v.text, ts: v.ts || null };
    } catch { /* skip malformed entry */ }
  }
  return out;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const flat = await redis.hgetall(HASH_KEY);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ statuses: toStatuses(flat) });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      // Clear one person's status (e.g. "I'm back, ignore me").
      if (body.action === 'clear') {
        if (!PEOPLE.includes(body.person)) return res.status(400).json({ error: 'invalid person' });
        await redis.hdel(HASH_KEY, body.person);
        return res.status(200).json({ ok: true });
      }

      // Set one person's status. Validate against the crew + cap the length.
      if (!PEOPLE.includes(body.person)) return res.status(400).json({ error: 'invalid person' });
      const text = String(body.text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);
      if (!text) return res.status(400).json({ error: 'empty status' });
      const value = JSON.stringify({ text, ts: Date.now() });
      await redis.hset(HASH_KEY, { [body.person]: value });
      await redis.expire(HASH_KEY, TTL_SEC);   // refresh the fade window on each post
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'storage unavailable' });
  }
}
