// Shared auth helper for the serverless functions — session signing + the
// email allowlist. The leading underscore keeps Vercel from exposing this file
// as its own route (it's a library, not an endpoint).
//
// Model: after Google verifies WHO you are (api/auth.js), we mint our OWN
// stateless session cookie so the data endpoints never have to call Google
// again and we need no user database. The cookie is just:
//
//   base64url(JSON{ person, email, exp }) . base64url(HMAC-SHA256(payload))
//
// HMAC'd with SESSION_SECRET. Tamper with either half and the signature check
// fails; past `exp` and it's rejected. HttpOnly + Secure + SameSite=Lax (the
// SPA and the API are the same origin, so Lax sends the cookie on every
// same-origin fetch and gives CSRF protection for free).

import crypto from 'crypto';

export const COOKIE = 'tml_session';
const MAX_AGE_SEC = 60 * 60 * 24 * 30;   // 30 days

const SECRET = process.env.SESSION_SECRET || '';

// "email:Person,email:Person" -> Map(lowercased email -> person). Parsed once.
const ALLOWED = (() => {
  const map = new Map();
  for (const pair of (process.env.ALLOWED_EMAILS || '').split(',')) {
    const i = pair.lastIndexOf(':');
    if (i === -1) continue;
    const email = pair.slice(0, i).trim().toLowerCase();
    const person = pair.slice(i + 1).trim();
    if (email && person) map.set(email, person);
  }
  return map;
})();

export function personForEmail(email) {
  return ALLOWED.get(String(email || '').trim().toLowerCase()) || null;
}

// Derive a stable display name for this user by checking group memberships
// first (so existing crew members keep their pick-field-compatible name),
// then falling back to Google's given_name, then the email local-part.
// `redis` is the caller's Redis instance; `userId` must be lowercase email.
export async function resolvePersonName(redis, userId, givenName) {
  try {
    const groupIds = await redis.smembers(`user:${userId}:groups`);
    if (groupIds?.length > 0) {
      for (const gid of groupIds) {
        const raw = await redis.hget(`group:${gid}:members`, userId);
        if (!raw) continue;
        const member = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (member?.displayName) return member.displayName;
      }
    }
  } catch {}
  return givenName || userId.split('@')[0] || 'You';
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function hmac(payloadB64) {
  return crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
}

// Sign a session for `person`/`email`, valid for MAX_AGE_SEC.
export function signSession({ person, email }) {
  const payload = b64url(JSON.stringify({ person, email, exp: Date.now() + MAX_AGE_SEC * 1000 }));
  return `${payload}.${hmac(payload)}`;
}

// Verify and decode a session cookie value. Returns { person, email, exp } or
// null. Constant-time signature compare; rejects bad sig or expired sessions.
export function verifySession(value) {
  if (!SECRET || typeof value !== 'string') return null;
  const dot = value.indexOf('.');
  if (dot === -1) return null;
  const payloadB64 = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = hmac(payloadB64);
  // timingSafeEqual throws on length mismatch — guard first.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!data || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (typeof data.person !== 'string' || typeof data.email !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}

// Build a Set-Cookie string. Pass maxAge:0 to clear.
export function serializeCookie(name, value, { maxAge = MAX_AGE_SEC } = {}) {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  return parts.join('; ');
}

export function sessionCookie(session) {
  return serializeCookie(COOKIE, signSession(session));
}

export function clearCookie() {
  return serializeCookie(COOKIE, '', { maxAge: 0 });
}

function parseCookies(req) {
  const header = req.headers?.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

// Read + verify the session off the request, or null.
export function getSession(req) {
  return verifySession(parseCookies(req)[COOKIE]);
}

// Gate a handler: returns the session, or writes a 401 and returns null.
// Callers do:  const s = requireSession(req, res); if (!s) return;
export function requireSession(req, res) {
  const session = getSession(req);
  if (!session) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  return session;
}

// Membership gate: runs requireSession then checks group:<gid>:members for the
// caller's email. Returns { session, userId, member } or writes 401/403 and
// returns null. `redis` is the caller's Redis instance.
export async function requireMembership(req, res, gid, redis) {
  const session = requireSession(req, res);
  if (!session) return null;
  const userId = session.email.toLowerCase();
  const raw = await redis.hget(`group:${gid}:members`, userId);
  if (!raw) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(403).json({ error: 'not a member of this group' });
    return null;
  }
  const member = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return { session, userId, member };
}
