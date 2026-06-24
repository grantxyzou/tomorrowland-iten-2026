import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import {
  tmrwGold, goldLit, muted, clashRed, sans, display, mono,
} from '../components/lineup/theme.js';

// Gates the whole app behind Google sign-in. While the session bootstraps we
// show a splash; signed in → render the app; otherwise → the "Access Pass"
// ticket sign-in screen.
//
// The Google Identity Services button hands us a short-lived Google ID token
// (`credential`). We POST it once to /api/auth, which verifies it, checks the
// 3-email allowlist, and sets our own session cookie. From then on the cookie
// carries identity.
//
// GIS only renders Google's own button (theme/size/shape/text/width), so it
// can't BE the gold ticket button. We use the invisible-overlay technique: the
// gold button is purely visual (pointer-events:none) and the real GIS button is
// rendered transparently on top of it, sized to cover it — so a tap on the gold
// button lands on Google's button and fires the same callback. No backend change.

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const PAGE_BG = '#070a1a';

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

// Keyframes can't live in inline style objects — inject them once. Animations
// are applied via classes so a prefers-reduced-motion media query can disable
// them all in one place.
const ANIM_CSS = `
@keyframes tlsi-rise { from { opacity:0; transform:translateY(26px); } to { opacity:1; transform:none; } }
@keyframes tlsi-pulse { 0%,100% { transform:scale(1); opacity:.9; } 50% { transform:scale(1.35); opacity:.4; } }
@keyframes tlsi-flicker { 0%,100%{opacity:1;} 92%{opacity:1;} 94%{opacity:.55;} 96%{opacity:1;} }
.tlsi-rise { animation: tlsi-rise .7s cubic-bezier(.2,.7,.2,1) both; }
.tlsi-flicker { animation: tlsi-flicker 4s infinite; }
.tlsi-dot { animation: tlsi-pulse 2.4s infinite; }
@media (prefers-reduced-motion: reduce) {
  .tlsi-rise, .tlsi-flicker, .tlsi-dot { animation: none !important; }
}`;
function injectAnim() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('tlsi-anim')) return;
  const el = document.createElement('style');
  el.id = 'tlsi-anim';
  el.textContent = ANIM_CSS;
  document.head.appendChild(el);
}

// Faint lineup name-wall behind the ticket (top/left or top/right anchored).
const NAMES = [
  { t: 'ARMIN VAN BUUREN', top: '5%',  left: '3%',  size: 46, color: '#1a2347', ls: '-.02em' },
  { t: 'JOHN SUMMIT',      top: '11%', right: '4%', size: 38, color: '#202a52' },
  { t: 'COSMIC GATE',      top: '20%', left: '8%',  size: 30, color: '#172143' },
  { t: 'KASKADE',          top: '26%', right: '6%', size: 52, color: '#1c2750' },
  { t: 'VINI VICI',        top: '38%', left: '2%',  size: 34, color: '#161f3e' },
  { t: 'GARETH EMERY',     top: '46%', right: '3%', size: 40, color: '#1b2550' },
  { t: 'BEN NICKY',        top: '58%', left: '6%',  size: 30, color: '#161f3e' },
  { t: 'DARREN STYLES',    top: '64%', right: '7%', size: 46, color: '#1d2853' },
  { t: 'GABRY PONTE',      top: '74%', left: '4%',  size: 36, color: '#192243' },
  { t: 'MATHAME',          top: '82%', right: '5%', size: 30, color: '#161f3e' },
  { t: 'W&W',              top: '90%', left: '10%', size: 42, color: '#1a2347' },
  { t: 'CASSIAN',          top: '33%', left: '38%', size: 24, color: '#141c39' },
  { t: 'ARCANDO',          top: '70%', left: '40%', size: 24, color: '#141c39' },
];

const DOTS = ['#e9b949', '#34d3a6', '#e0639b', '#7da2e8'];

function SignIn() {
  const { completeLogin } = useAuth();
  const btnRef = useRef(null);
  const authRef = useRef(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [btnWidth, setBtnWidth] = useState(360);

  // Track the auth area's width so the transparent GIS button spans the gold one.
  useEffect(() => {
    injectAnim();
    const node = authRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const w = Math.min(400, Math.max(200, Math.round(node.clientWidth)));
      setBtnWidth(w);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

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
          theme: 'filled_black', size: 'large', shape: 'pill',
          text: 'continue_with', width: btnWidth,
        });
      }
    }).catch(() => { if (!cancelled) setError('Could not load Google sign-in.'); });

    return () => { cancelled = true; };
  }, [completeLogin, btnWidth]);

  return (
    <div style={shell}>
      {/* background: faint lineup name-wall, masked toward the centre */}
      <div style={nameWall} aria-hidden="true">
        {NAMES.map((n) => (
          <div
            key={n.t}
            style={{
              position: 'absolute', top: n.top, left: n.left, right: n.right,
              fontSize: n.size, color: n.color, letterSpacing: n.ls,
            }}
          >{n.t}</div>
        ))}
      </div>
      {/* top spotlight glow */}
      <div style={spotlight} aria-hidden="true" />

      {/* ticket */}
      <div className="tlsi-rise" style={ticketWrap}>
        <div style={ticket}>
          <div style={rainbow} />

          <div style={{ padding: '34px 34px 30px' }}>
            {/* header */}
            <div style={{ marginBottom: 26 }}>
              <div className="tlsi-flicker" style={kicker}>★ THE BUDHOLE · ACCESS PASS ★</div>
              <div style={titleWrap}>
                <span style={wordmark}>Tomorrowland</span><br />
                <span style={{ ...display, color: tmrwGold }}>Consciencia</span>
              </div>
            </div>

            {/* status dots */}
            <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 26 }}>
              {DOTS.map((c, i) => (
                <span
                  key={c}
                  className="tlsi-dot"
                  style={{ width: 11, height: 11, borderRadius: '50%', background: c, animationDelay: `${i * 0.4}s` }}
                />
              ))}
              <span style={{ flex: 1, height: 1, background: '#243056', margin: '0 6px' }} />
              <span style={{ ...mono, fontSize: 10, color: '#6f7aa6' }}>5 STAGES</span>
            </div>

            {/* tagline */}
            <div style={{ ...display, fontStyle: 'italic', fontWeight: 700, fontSize: 21, color: '#eef1fb', lineHeight: 1.25, marginBottom: 6 }}>
              Let&rsquo;s Ducking Go.
            </div>
            <div style={{ ...mono, fontSize: 11, color: '#8a93b8', marginBottom: 28 }}>
              Forget about Monday to Friday, &rsquo;cause we&rsquo;ve been working like a slave.
            </div>

            {/* auth: visual gold button + transparent GIS overlay */}
            <div ref={authRef} style={{ position: 'relative', width: '100%', height: 58 }}>
              <button type="button" style={goldBtn} tabIndex={-1} aria-hidden="true">
                <span style={gIcon}>
                  <svg viewBox="0 0 48 48" width="16" height="16" aria-hidden="true">
                    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
                    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
                    <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
                    <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
                  </svg>
                </span>
                Continue with Google
              </button>
              {/* the real (transparent) Google button, stretched to cover the gold one */}
              <div
                ref={btnRef}
                style={{
                  position: 'absolute', inset: 0, zIndex: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transform: 'scaleY(1.35)',
                  pointerEvents: busy ? 'none' : 'auto',
                }}
              />
            </div>

            {busy && <div style={{ ...sans, fontSize: 13, color: muted, marginTop: 14, textAlign: 'center' }}>Signing in…</div>}
            {error && <div role="alert" style={{ ...sans, fontSize: 13, color: clashRed, marginTop: 14, textAlign: 'center' }}>{error}</div>}
          </div>

          {/* perforation */}
          <div style={{ position: 'relative', height: 0, borderTop: '2px dashed #2b3563' }} />
          <div style={{ ...notch, left: -14 }} />
          <div style={{ ...notch, right: -14 }} />

          {/* stub */}
          <div style={stub}>
            <div style={{ ...mono, fontSize: 11, color: '#8a93b8', letterSpacing: '0.06em' }}>
              Created with <span style={{ color: '#e0639b' }}>♥</span> for my favourite people
            </div>
          </div>
        </div>
      </div>

      <div style={copyright}>© 2026 MOTIONCRAFT STUDIO · ALL RIGHTS RESERVED</div>
    </div>
  );
}

function Splash() {
  return (
    <div style={{ ...shell, justifyContent: 'center' }}>
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
  alignItems: 'center', justifyContent: 'center', padding: '40px 20px',
  background: PAGE_BG, color: '#eef1fb', textAlign: 'center',
  position: 'relative', overflow: 'hidden',
};

const nameWall = {
  position: 'absolute', inset: 0, pointerEvents: 'none', userSelect: 'none',
  ...sans, fontWeight: 700, textTransform: 'uppercase', overflow: 'hidden',
  WebkitMaskImage: 'radial-gradient(ellipse 75% 70% at 50% 46%, transparent 30%, #000 78%)',
  maskImage: 'radial-gradient(ellipse 75% 70% at 50% 46%, transparent 30%, #000 78%)',
};

const spotlight = {
  position: 'absolute', top: -260, left: '50%', transform: 'translateX(-50%)',
  width: 680, height: 680, borderRadius: '50%', pointerEvents: 'none',
  background: 'radial-gradient(circle, rgba(233,185,73,0.1) 0%, rgba(233,185,73,0) 66%)',
};

const ticketWrap = { position: 'relative', width: '100%', maxWidth: 430 };

const ticket = {
  position: 'relative',
  background: 'linear-gradient(165deg,#141b39 0%,#10162e 60%)',
  borderRadius: 22,
  boxShadow: '0 30px 80px -20px rgba(0,0,0,.85), 0 0 0 1px rgba(233,185,73,.06)',
  overflow: 'hidden',
};

const rainbow = { height: 6, background: 'linear-gradient(90deg,#c9a227,#f0d98a,#e9b949,#e0639b,#34d3a6,#7da2e8)' };

const kicker = { ...mono, fontSize: 10, letterSpacing: '0.2em', color: tmrwGold, marginBottom: 10 };

const titleWrap = { ...display, fontWeight: 900, fontSize: 38, lineHeight: 0.95, color: goldLit, letterSpacing: '-0.01em' };

const wordmark = { ...sans, fontWeight: 600, letterSpacing: '0.01em', textTransform: 'uppercase' };

const goldBtn = {
  position: 'absolute', inset: 0, width: '100%',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 13,
  borderRadius: 14, border: 'none', background: '#f3e6c4', color: '#1a1405',
  ...sans, fontWeight: 800, fontSize: 16, pointerEvents: 'none',
};

const gIcon = {
  display: 'inline-flex', width: 24, height: 24, background: '#fff',
  borderRadius: '50%', alignItems: 'center', justifyContent: 'center',
};

const notch = {
  position: 'absolute', bottom: 64, width: 28, height: 28, borderRadius: '50%',
  background: PAGE_BG, border: '1px solid #2b3563',
};

const stub = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 34px', background: '#0d1226' };

const copyright = { position: 'relative', ...mono, fontSize: 10, color: '#4a5689', marginTop: 26, letterSpacing: '0.14em' };
