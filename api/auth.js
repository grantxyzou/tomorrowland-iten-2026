// Vercel Serverless Function — sign-in / sign-out / session check.
// Auto-served at /api/auth.
//
// Flow: the client gets a Google ID token from the "Sign in with Google" button
// (Google Identity Services) and POSTs it here. We verify that token against
// Google, confirm the email is on our 3-person allowlist, and — if so — set our
// own signed session cookie (see api/_auth.js). From then on the data endpoints
// trust the cookie; Google is not contacted again until the session expires.
//
//   POST { action:'login', idToken }  -> verify + Set-Cookie, returns {person,email}
//   POST { action:'logout' }          -> clears the cookie
//   GET                               -> { person, email } if signed in, else 401

import { OAuth2Client } from 'google-auth-library';
import { getSession, personForEmail, sessionCookie, clearCookie } from './_auth.js';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const client = new OAuth2Client(CLIENT_ID);

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
      const person = personForEmail(payload.email);
      if (!person) {
        return res.status(403).json({ error: 'not allowed' });
      }

      res.setHeader('Set-Cookie', sessionCookie({ person, email: payload.email.toLowerCase() }));
      return res.status(200).json({ person, email: payload.email.toLowerCase() });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'auth error' });
  }
}
