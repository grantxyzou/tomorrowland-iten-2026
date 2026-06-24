import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import {
  tmrwBg, paper, ink, muted, tmrwGold, goldLit, inkOnGold,
  shPanel, rPanel, sans, display,
} from '../components/lineup/theme.js';

// Gates the whole app behind Google sign-in. While the session bootstraps we
// show a splash; signed in → render the app; otherwise → the sign-in screen
// with the official Google Identity Services button.
//
// The GIS button hands us a short-lived Google ID token (`credential`). We POST
// it once to /api/auth, which verifies it, checks the 3-email allowlist, and
// sets our own session cookie. From then on the cookie carries identity.

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Load the GIS script once, even under StrictMode's double-mount.
let gsiPromise = null;
function loadGsi() {
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = GSI_SRC; s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return gsiPromise;
}

function SignIn() {
  const { completeLogin } = useAuth();
  const btnRef = useRef(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function handleCredential(response) {
      setBusy(true); setError(null);
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'login', idToken: response.credential }),
        });
        if (res.ok) {
          completeLogin(await res.json());
          return;
        }
        if (res.status === 403) setError("This Google account isn't on the guest list.");
        else setError('Sign-in failed. Please try again.');
      } catch {
        setError('Network error — check your connection and retry.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    if (!CLIENT_ID) { setError('Sign-in is not configured (missing client ID).'); return; }

    loadGsi().then(() => {
      if (cancelled || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredential,
      });
      if (btnRef.current) {
        btnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with',
        });
      }
    }).catch(() => { if (!cancelled) setError('Could not load Google sign-in.'); });

    return () => { cancelled = true; };
  }, [completeLogin]);

  return (
    <div style={shell}>
      <div style={card}>
        <div style={{ ...display, fontSize: 30, color: goldLit, lineHeight: 1.1 }}>Tomorrowland 2026</div>
        <div style={{ ...sans, fontSize: 14, color: muted, marginTop: 8, marginBottom: 24 }}>
          Crew trip planner — sign in to continue.
        </div>
        <div ref={btnRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 44, opacity: busy ? 0.5 : 1 }} />
        {busy && <div style={{ ...sans, fontSize: 13, color: muted, marginTop: 14 }}>Signing in…</div>}
        {error && <div role="alert" style={{ ...sans, fontSize: 13, color: '#ff8d86', marginTop: 14 }}>{error}</div>}
        <div style={{ ...sans, fontSize: 11, color: muted, marginTop: 24, opacity: 0.7 }}>
          Private — invited crew only.
        </div>
      </div>
    </div>
  );
}

function Splash() {
  return (
    <div style={shell}>
      <div style={{ ...display, fontSize: 24, color: tmrwGold, opacity: 0.9 }}>Tomorrowland 2026</div>
      <div style={{ ...sans, fontSize: 13, color: muted, marginTop: 10 }}>Loading…</div>
    </div>
  );
}

export default function AuthGate({ children }) {
  const { status } = useAuth();
  if (status === 'loading') return <Splash />;
  if (status !== 'authed') return <SignIn />;
  return children;
}

const shell = {
  minHeight: '100dvh', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', padding: 24,
  backgroundColor: tmrwBg, color: ink, textAlign: 'center',
};

const card = {
  maxWidth: 360, width: '100%', padding: '32px 28px',
  backgroundColor: paper, borderRadius: rPanel, boxShadow: shPanel,
};
