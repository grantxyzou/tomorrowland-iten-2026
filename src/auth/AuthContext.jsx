import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch, setUnauthorizedHandler } from '../lib/api.js';

// Holds the signed-in identity for the whole app. On mount it asks the server
// who we are (GET /api/auth, cookie-based); the result drives the AuthGate.
//
// status: 'loading'  — bootstrapping, show a splash
//         'authed'   — { person, email } valid, render the app
//         'anon'     — not signed in, show the Google sign-in screen
//
// `person` is the source of truth for identity — it replaces the old
// localStorage person-picker. A user can only ever be themselves.

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [person, setPerson] = useState(null);
  const [email, setEmail]   = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth', { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const { person, email } = await res.json();
        setPerson(person); setEmail(email); setStatus('authed');
      } else {
        setPerson(null); setEmail(null); setStatus('anon');
      }
    } catch {
      // Network down on a cold open: we can't prove a session, so gate.
      setPerson(null); setEmail(null); setStatus('anon');
    }
  }, []);

  // Called by AuthGate once Google hands us an ID token.
  const completeLogin = useCallback((data) => {
    setPerson(data.person); setEmail(data.email); setStatus('authed');
  }, []);

  const logout = useCallback(async () => {
    try { await apiFetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    }); } catch {}
    setPerson(null); setEmail(null); setStatus('anon');
  }, []);

  // Any 401 from a data endpoint means the session lapsed — drop to the gate.
  // Registered once; the handler only flips UI state (outboxes are untouched).
  useEffect(() => {
    setUnauthorizedHandler(() => { setStatus('anon'); setPerson(null); setEmail(null); });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <AuthContext.Provider value={{ status, person, email, refresh, completeLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
