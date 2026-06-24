// Vercel Serverless Function — live set-time overrides for the lineup.
// Auto-served at /api/lineup.
//
// The full lineup ships in the app bundle (src/data/lineup.js) so it always
// works offline. This endpoint stores a small PATCH on top of it: when
// Tomorrowland revises a timetable mid-festival, we publish the corrected
// times here and every phone picks them up on its next poll/refresh — no
// redeploy. If this endpoint is unreachable, the app simply renders the
// bundled baseline times, so it's fully offline-safe.
//
// Storage: a single Redis string "lineup_overrides" holding JSON:
//   { overrides: { [setId]: { start?, end?, status?, stage?, day? } }, updatedAt }
// Overrides are read all-at-once and written rarely, so one GET / one SET is
// simpler than per-field hash ops.

import { Redis } from '@upstash/redis';
import { requireSession } from './_auth.js';

const KEY = 'lineup_overrides';
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;          // 24h "HH:MM"
const STATUSES = ['new', 'edited', 'deleted'];
const FIELDS = ['start', 'end', 'status', 'stage', 'day'];

// Support either the Upstash Marketplace vars or the legacy KV_* vars.
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL  || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

// Keep only known fields, drop anything malformed. A bad value is ignored
// rather than rejected so one typo can't block the whole publish.
function sanitize(overrides) {
  const out = {};
  for (const [setId, patch] of Object.entries(overrides || {})) {
    if (typeof setId !== 'string' || !setId || !patch || typeof patch !== 'object') continue;
    const clean = {};
    for (const f of FIELDS) {
      const v = patch[f];
      if (v == null) continue;
      if ((f === 'start' || f === 'end') && (typeof v !== 'string' || !HHMM.test(v))) continue;
      if (f === 'status' && !STATUSES.includes(v)) continue;
      if ((f === 'stage' || f === 'day') && typeof v !== 'string') continue;
      clean[f] = v;
    }
    if (Object.keys(clean).length) out[setId] = clean;
  }
  return out;
}

export default async function handler(req, res) {
  try {
    // Auth gate: reading and publishing overrides both need a valid session.
    const session = requireSession(req, res);
    if (!session) return;

    if (req.method === 'GET') {
      const raw = await redis.get(KEY);
      const data = raw
        ? (typeof raw === 'string' ? JSON.parse(raw) : raw)
        : { overrides: {}, updatedAt: null };
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      // Publishing the timetable is guarded the same way as the picks reset:
      // the explicit confirm token means a stray script can't rewrite the
      // schedule for everyone.
      if (body.confirm !== 'PUBLISH') {
        return res.status(400).json({ error: 'publishing overrides requires confirm: "PUBLISH"' });
      }
      const overrides = sanitize(body.overrides);
      const payload = { overrides, updatedAt: Date.now() };
      await redis.set(KEY, JSON.stringify(payload));
      return res.status(200).json({ ok: true, count: Object.keys(overrides).length, updatedAt: payload.updatedAt });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'storage unavailable' });
  }
}
