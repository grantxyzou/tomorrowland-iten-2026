// Vercel Serverless Function — lightweight crew status / pings.
// Auto-served at /api/status.
//
// Not a chat thread — a glanceable "current status" board. Each person posts
// one short line ("Heading to mainstage", "Food break", "Where are you?", or
// free text) and everyone sees it, refreshing on the same near-real-time poll
// as picks. Built for a field with terrible signal: writes queue offline and
// flush on reconnect (see src/hooks/useCrewStatus.js).
//
// Storage: two Redis hashes, both keyed by "<person>" with the same ~4h TTL.
//   crew_status  value = JSON { text, ts }            — the glanceable board
//   crew_loc     value = JSON { lat, lng, acc, ts }   — opt-in GPS pin
// They're kept separate so a text post and a location post never clobber each
// other (no read-modify-write). A few-hour TTL lets stale entries fade after the
// day winds down (picks have no TTL; statuses + pins do — the deliberate
// difference). Location sharing is strictly opt-in, client-side.

import { Redis } from '@upstash/redis';

const PEOPLE = ['Grant', 'Desmond', 'Lawrence'];
const HASH_KEY = 'crew_status';
const LOC_KEY = 'crew_loc';
const TTL_SEC = 60 * 60 * 4;   // statuses + pins fade after ~4h
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

// Location pins: { lat, lng, acc, ts }. Validate everything is a finite number
// in range and drop anything malformed — never trust the stored blob.
function toLocations(flat) {
  const out = {};
  for (const person of Object.keys(flat || {})) {
    if (!PEOPLE.includes(person)) continue;
    const raw = flat[person];
    try {
      const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const lat = Number(v?.lat), lng = Number(v?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
      const acc = Number.isFinite(Number(v?.acc)) ? Number(v.acc) : null;
      out[person] = { lat, lng, acc, ts: v.ts || null };
    } catch { /* skip malformed entry */ }
  }
  return out;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const [flat, locFlat] = await Promise.all([
        redis.hgetall(HASH_KEY),
        redis.hgetall(LOC_KEY),
      ]);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ statuses: toStatuses(flat), locations: toLocations(locFlat) });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      // Clear one person's status (e.g. "I'm back, ignore me").
      if (body.action === 'clear') {
        if (!PEOPLE.includes(body.person)) return res.status(400).json({ error: 'invalid person' });
        await redis.hdel(HASH_KEY, body.person);
        return res.status(200).json({ ok: true });
      }

      // Drop one person's location pin (sharing turned off).
      if (body.action === 'unshare-loc') {
        if (!PEOPLE.includes(body.person)) return res.status(400).json({ error: 'invalid person' });
        await redis.hdel(LOC_KEY, body.person);
        return res.status(200).json({ ok: true });
      }

      // Publish one person's opt-in GPS pin. Validate the coordinates hard.
      if (body.action === 'location') {
        if (!PEOPLE.includes(body.person)) return res.status(400).json({ error: 'invalid person' });
        const lat = Number(body.lat), lng = Number(body.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          return res.status(400).json({ error: 'invalid coordinates' });
        }
        const acc = Number.isFinite(Number(body.acc)) ? Math.round(Number(body.acc)) : null;
        const value = JSON.stringify({ lat, lng, acc, ts: Date.now() });
        await redis.hset(LOC_KEY, { [body.person]: value });
        await redis.expire(LOC_KEY, TTL_SEC);
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
