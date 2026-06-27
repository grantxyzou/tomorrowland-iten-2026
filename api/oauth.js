// Vercel Serverless Function — server-side Google OAuth 2.0 (authorization-code)
// sign-in. Auto-served at /api/oauth. This is the universal fallback to the
// in-page Google Identity Services (GIS) button used by api/auth.js.
//
// WHY: GIS renders a JS button that fails on older Android WebViews (no FedCM /
// blocked popups / the modern GIS script won't run), leaving the sign-in button
// dead. This route needs no client-side Google JS at all — it's plain top-level
// navigation, so it works in any browser that can follow a link.
//
// Two GET steps on the same URL:
//   GET /api/oauth                 -> 302 to Google's consent screen
//   GET /api/oauth?code=…&state=…  -> exchange code, verify, Set-Cookie, 302 /
//
// On success it sets the SAME signed session cookie as api/auth.js, so the rest
// of the app is identical from there on. Errors redirect to /?auth_error=… so
// the sign-in screen can show a message.

import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { Redis } from '@upstash/redis';
import { sessionCookie, serializeCookie, resolvePersonName } from './_auth.js';

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL  || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const STATE_COOKIE = 'tml_oauth_state';

// The redirect URI must match a value registered in the Google Cloud OAuth
// client EXACTLY. Derive it from the incoming request so prod "just works"
// (preview hosts are dynamic and won't be registered — same as GIS today).
function redirectUri(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}/api/oauth`;
}

function readCookie(req, name) {
  const header = req.headers?.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

function bounce(res, target) {
  res.setHeader('Location', target);
  res.status(302).end();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('[oauth] not configured', {
      stage: 'config',
      hasClientId: !!CLIENT_ID,
      hasClientSecret: !!CLIENT_SECRET,
      ua: req.headers['user-agent'] || '',
    });
    return bounce(res, '/?auth_error=failed');
  }

  const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, redirectUri(req));
  const { code, state } = req.query || {};

  // ── Start step: no code yet → kick off the consent redirect ──
  if (!code) {
    // DIAGNOSTIC: who is falling through to the redirect fallback? A spike of
    // Android UAs here means the GIS button isn't working for them.
    console.log('[oauth] start redirect', { stage: 'start', ua: req.headers['user-agent'] || '' });
    const nonce = crypto.randomBytes(16).toString('hex');
    // Short-lived HttpOnly cookie holds the CSRF state for the round-trip.
    res.setHeader('Set-Cookie', serializeCookie(STATE_COOKIE, nonce, { maxAge: 600 }));
    const url = client.generateAuthUrl({
      scope: ['openid', 'email'],
      response_type: 'code',
      prompt: 'select_account',
      state: nonce,
    });
    return bounce(res, url);
  }

  // ── Callback step: Google redirected back with ?code & ?state ──
  try {
    const expected = readCookie(req, STATE_COOKIE);
    // Clear the state cookie regardless of outcome (single-use).
    const clearState = serializeCookie(STATE_COOKIE, '', { maxAge: 0 });
    if (!expected || !state || state !== expected) {
      // DIAGNOSTIC: state cookie didn't round-trip. hadExpected:false usually
      // means the cookie was dropped between start and callback (host mismatch,
      // 3rd-party-cookie blocking, or an in-app browser that wiped it).
      console.error('[oauth] state mismatch', {
        stage: 'state',
        hadExpected: !!expected,
        hadState: !!state,
        ua: req.headers['user-agent'] || '',
      });
      res.setHeader('Set-Cookie', clearState);
      return bounce(res, '/?auth_error=state');
    }

    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: CLIENT_ID });
    const payload = ticket.getPayload();

    if (!payload || payload.email_verified !== true) {
      console.error('[oauth] email not verified', {
        stage: 'email-unverified',
        emailVerified: payload?.email_verified,
        ua: req.headers['user-agent'] || '',
      });
      res.setHeader('Set-Cookie', clearState);
      return bounce(res, '/?auth_error=failed');
    }

    const email  = payload.email.toLowerCase();
    const person = await resolvePersonName(redis, email, payload.given_name);

    // Success: mint our session cookie (and clear the transient state cookie).
    res.setHeader('Set-Cookie', [
      clearState,
      sessionCookie({ person, email }),
    ]);
    return bounce(res, '/');
  } catch (err) {
    // DIAGNOSTIC: getToken() or verifyIdToken() threw. reason carries Google's
    // specific cause (bad code, redirect_uri mismatch, clock skew, etc.).
    console.error('[oauth] callback failed', {
      stage: 'token-exchange',
      reason: err?.message || String(err),
      ua: req.headers['user-agent'] || '',
    });
    res.setHeader('Set-Cookie', serializeCookie(STATE_COOKIE, '', { maxAge: 0 }));
    return bounce(res, '/?auth_error=failed');
  }
}
