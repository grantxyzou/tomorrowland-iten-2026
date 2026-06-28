// Vercel Serverless Function — group management.
// Auto-served at /api/groups.
//
// A group is a private crew: members share picks, status, and a map.
// Each group gets a short id (gid) and an 8-char join code for the /join/<CODE> link.
//
// GET  /api/groups           → { groups: [{id, name, kicker, departureDate, role, displayName, color}] }
// GET  /api/groups?g=<gid>   → { id, name, members: [{userId, displayName, color, role}] }
// POST {action:'create', name, displayName, color, kicker?, departureDate?} → { gid, code }
// POST {action:'join',   code, displayName, color} → { gid }
// POST {action:'invite', g}                        → { code }   (members only)
// POST {action:'leave',  g}                        → { ok: true }

import crypto from 'crypto';
import { Redis } from '@upstash/redis';
import { requireSession, requireMembership, isNunu, validateKicker, validateDepartureDate } from './_auth.js';

const G0_ID = 'ldg';
const MAX_NAME_LEN    = 40;
const MAX_DISPLAY_LEN = 20;
const MAX_MEMBERS     = 50;         // hard cap per group
const MAX_CREATES_DAY = 5;          // creates per user per 24 h
const MAX_JOINS_HOUR  = 20;         // joins per user per hour
const CODE_TTL_SEC    = 60 * 60 * 24 * 30; // join codes expire after 30 days

async function checkRateLimit(redis, key, max, windowSec) {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, windowSec);
  return count > max;
}

// Ten vivid festival colours — assigned in order to avoid visual collisions.
const PALETTE = [
  '#e9b949', // gold  (matches GDL Grant)
  '#8fb6ff', // blue  (matches GDL Desmond)
  '#e23b3b', // red   (matches GDL Lawrence)
  '#4ECDC4', // teal
  '#96CEB4', // mint
  '#DDA0DD', // plum
  '#F7DC6F', // yellow
  '#BB8FCE', // lavender
  '#85C1E9', // sky
  '#98D8C8', // seafoam
];

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL  || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

function genId() {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8);
}

// 8 uppercase hex chars — unguessable, easy to read aloud.
function genCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function pickColor(usedColors) {
  return PALETTE.find(c => !usedColors.has(c)) ?? PALETTE[usedColors.size % PALETTE.length];
}

function parseMember(raw) {
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
}

export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store');

    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const session = requireSession(req, res);
      if (!session) return;
      const userId = session.email.toLowerCase();

      // GET ?g=<gid> — group detail with member list
      if (req.query?.g) {
        const gid = req.query.g;
        const mem = await requireMembership(req, res, gid, redis);
        if (!mem) return;

        const [metaRaw, membersFlat] = await Promise.all([
          redis.get(`group:${gid}:meta`),
          redis.hgetall(`group:${gid}:members`),
        ]);
        const meta = parseMember(metaRaw) || {};
        const members = Object.entries(membersFlat || {}).map(([uid, v]) => {
          const m = parseMember(v) || {};
          return { userId: uid, displayName: m.displayName, color: m.color, role: m.role };
        });
        return res.status(200).json({ id: gid, name: meta.name, members });
      }

      // GET — list all groups I belong to
      const groupIds = await redis.smembers(`user:${userId}:groups`);
      if (!groupIds || groupIds.length === 0) {
        return res.status(200).json({ groups: [] });
      }

      const groups = await Promise.all(
        groupIds.map(async gid => {
          const [metaRaw, memberRaw] = await Promise.all([
            redis.get(`group:${gid}:meta`),
            redis.hget(`group:${gid}:members`, userId),
          ]);
          if (!metaRaw || !memberRaw) return null;
          const meta   = parseMember(metaRaw) || {};
          const member = parseMember(memberRaw) || {};
          return { id: gid, name: meta.name, kicker: meta.kicker, departureDate: meta.departureDate, role: member.role, displayName: member.displayName, color: member.color };
        })
      );
      return res.status(200).json({ groups: groups.filter(Boolean) });
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const session = requireSession(req, res);
      if (!session) return;
      const userId = session.email.toLowerCase();
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      // ── create ───────────────────────────────────────────────────────────
      if (body.action === 'create') {
        const name        = String(body.name        || '').trim().slice(0, MAX_NAME_LEN);
        const displayName = String(body.displayName || '').trim().slice(0, MAX_DISPLAY_LEN);
        if (!name)        return res.status(400).json({ error: 'name is required' });
        if (!displayName) return res.status(400).json({ error: 'displayName is required' });
        const color = PALETTE.includes(body.color) ? body.color : PALETTE[0];

        // Optional per-crew header fields (fall back to app defaults when unset).
        const kicker = validateKicker(body.kicker);
        if (!kicker.ok) return res.status(400).json({ error: kicker.error });
        const departureDate = validateDepartureDate(body.departureDate);
        if (!departureDate.ok) return res.status(400).json({ error: departureDate.error });

        if (await checkRateLimit(redis, `ratelimit:create:${userId}`, MAX_CREATES_DAY, 86400)) {
          return res.status(429).json({ error: 'too many crews created today — try again tomorrow' });
        }

        const gid  = genId();
        const code = genCode();
        const now  = Date.now();

        await redis.set(`group:${gid}:meta`, JSON.stringify({
          id: gid, name, createdBy: userId, createdAt: now, code,
          ...(kicker.value        ? { kicker: kicker.value }               : {}),
          ...(departureDate.value ? { departureDate: departureDate.value } : {}),
        }));
        await redis.hset(`group:${gid}:members`, {
          [userId]: JSON.stringify({ displayName, color, role: 'admin', joinedAt: now }),
        });
        await redis.set(`joincode:${code}`, gid, { ex: CODE_TTL_SEC });
        await redis.sadd(`user:${userId}:groups`, gid);
        return res.status(200).json({ gid, code });
      }

      // ── join ─────────────────────────────────────────────────────────────
      if (body.action === 'join') {
        const code        = String(body.code        || '').trim().toUpperCase();
        const displayName = String(body.displayName || '').trim().slice(0, MAX_DISPLAY_LEN);
        if (!code)        return res.status(400).json({ error: 'code is required' });
        if (!displayName) return res.status(400).json({ error: 'displayName is required' });

        if (await checkRateLimit(redis, `ratelimit:join:${userId}`, MAX_JOINS_HOUR, 3600)) {
          return res.status(429).json({ error: 'too many join attempts — try again in an hour' });
        }

        const gid = await redis.get(`joincode:${code}`);
        if (!gid) return res.status(404).json({ error: 'invalid or expired code' });

        const existing = await redis.hget(`group:${gid}:members`, userId);
        if (existing) return res.status(409).json({ error: 'already a member', gid });

        const membersFlat = await redis.hgetall(`group:${gid}:members`);

        if (Object.keys(membersFlat || {}).length >= MAX_MEMBERS) {
          return res.status(403).json({ error: 'this crew is full' });
        }
        const usedColors  = new Set(
          Object.values(membersFlat || {})
            .map(v => parseMember(v)?.color)
            .filter(Boolean)
        );
        const color = PALETTE.includes(body.color) && !usedColors.has(body.color)
          ? body.color
          : pickColor(usedColors);

        const now = Date.now();
        await redis.hset(`group:${gid}:members`, {
          [userId]: JSON.stringify({ displayName, color, role: 'member', joinedAt: now }),
        });
        await redis.sadd(`user:${userId}:groups`, gid);
        return res.status(200).json({ gid });
      }

      // ── invite ─────────────────────────────────────────────────────────────
      // Return a shareable join code for a crew the caller belongs to. Reuses the
      // crew's stored code while it's still valid; otherwise mints a fresh one and
      // persists it on the meta (so older crews like `ldg`, created before codes
      // were stored, get one on first invite). Multiple codes → same gid is fine.
      if (body.action === 'invite') {
        const gid = String(body.g || '').trim();
        if (!gid) return res.status(400).json({ error: 'g is required' });
        const mem = await requireMembership(req, res, gid, redis);
        if (!mem) return;

        const meta = parseMember(await redis.get(`group:${gid}:meta`)) || {};
        if (meta.code && (await redis.get(`joincode:${meta.code}`)) === gid) {
          return res.status(200).json({ code: meta.code });
        }
        const code = genCode();
        await redis.set(`joincode:${code}`, gid, { ex: CODE_TTL_SEC });
        await redis.set(`group:${gid}:meta`, JSON.stringify({ ...meta, id: meta.id || gid, code }));
        return res.status(200).json({ code });
      }

      // ── leave ─────────────────────────────────────────────────────────────
      if (body.action === 'leave') {
        const gid = String(body.g || '').trim();
        if (!gid) return res.status(400).json({ error: 'g is required' });

        const existingRaw = await redis.hget(`group:${gid}:members`, userId);
        if (!existingRaw) return res.status(403).json({ error: 'not a member' });

        const member      = parseMember(existingRaw) || {};
        const displayName = member.displayName;

        // Nunu's decree: only Nunu may abandon the original crew.
        if (gid === G0_ID && !isNunu(userId)) {
          return res.status(403).json({ error: 'denied', deniedBy: 'Nunu' });
        }

        await redis.hdel(`group:${gid}:members`, userId);
        await redis.srem(`user:${userId}:groups`, gid);

        // Best-effort self-data deletion from picks/status/loc.
        // PR-1 field keys are still person names — update to email in PR-2.
        const flat = await redis.hgetall(`group:${gid}:picks`);
        const myPickFields = Object.keys(flat || {}).filter(f => f.endsWith(`|${displayName}`));
        if (myPickFields.length) await redis.hdel(`group:${gid}:picks`, ...myPickFields);
        await redis.hdel(`group:${gid}:status`, displayName);
        await redis.hdel(`group:${gid}:loc`,    displayName);

        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'unknown action' });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('[groups]', err);
    return res.status(500).json({ error: 'storage unavailable' });
  }
}
