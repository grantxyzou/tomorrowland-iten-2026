import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { tmrwGold, muted, clashRed, sans, display, mono } from '../components/lineup/theme.js';

// Gates the whole app behind Google sign-in. While the session bootstraps we
// show a splash; signed in → render the app; otherwise → the cinematic sign-in
// screen (scrolling-name intro → black "Access Pass" ticket).
//
// The Google Identity Services button hands us a short-lived Google ID token
// (`credential`). We POST it once to /api/auth, which verifies it, checks the
// 3-email allowlist, and sets our own session cookie.
//
// GIS only renders Google's own button, so it can't BE the styled ticket button.
// We use the invisible-overlay technique: the visual button is inert
// (pointer-events:none) and the real GIS button is rendered transparently on top
// of it, sized to cover it — so a tap lands on Google's button. No backend change.

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const PAGE_BG = '#070a1a';
const INTRO_MS = 5200; // names scroll + fade + ticket rise (4s delay + 1s) then settle

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

// Keyframes can't live in inline style objects — inject them once. The reduced-
// motion block disables every animation (incl. the scrolling names) at once.
const ANIM_CSS = `
@keyframes tlsi-scrollL { from { transform:translateX(0); } to { transform:translateX(-50%); } }
@keyframes tlsi-scrollR { from { transform:translateX(-50%); } to { transform:translateX(0); } }
@keyframes tlsi-introIn { from { opacity:0; } to { opacity:1; } }
@keyframes tlsi-introOut { from { opacity:1; } to { opacity:0; } }
@keyframes tlsi-ticketRise { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:none; } }
@keyframes tlsi-flicker { 0%,100%{opacity:1;} 92%{opacity:1;} 94%{opacity:.5;} 96%{opacity:1;} }
.tlsi-flicker { animation: tlsi-flicker 4s infinite; }
.tlsi-introlayer { animation: tlsi-introIn .8s ease forwards, tlsi-introOut 1.5s 2.5s ease forwards; }
.tlsi-ticket { animation: tlsi-ticketRise 1s 4s cubic-bezier(.2,.7,.2,1) both; }
@media (prefers-reduced-motion: reduce) {
  .tlsi-flicker, .tlsi-introlayer, .tlsi-ticket, .tlsi-track { animation: none !important; }
}`;
function injectAnim() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('tlsi-anim')) return;
  const el = document.createElement('style');
  el.id = 'tlsi-anim';
  el.textContent = ANIM_CSS;
  document.head.appendChild(el);
}

function prefersReduced() {
  return typeof window !== 'undefined' && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Scrolling lineup name-wall. Each row repeats its names twice so a -50% shift
// loops seamlessly. `bright` toggles the louder palette used during the intro.
const NAME_ROWS = [
  { names: ['ARMIN VAN BUUREN', 'JOHN SUMMIT', 'KASKADE'],            size: 56, color: '#1a2347', bright: '#1e2a54', dir: 'L' },
  { names: ['GARETH EMERY', 'DARREN STYLES', 'W&W', 'BEN NICKY'],     size: 44, color: '#202a52', bright: '#232f63', dir: 'R' },
  { names: ['COSMIC GATE', 'VINI VICI', 'MATHAME', 'CASSIAN'],        size: 52, color: '#1c2749', bright: '#1a2449', dir: 'L' },
  { names: ['GABRY PONTE', 'ARCANDO', 'ARMIN VAN BUUREN'],            size: 48, color: '#1f2a58', bright: '#202b5a', dir: 'R' },
];

function NameRow({ row, bright }) {
  const seq = [...row.names, ...row.names];
  return (
    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <div
        className="tlsi-track"
        style={{
          display: 'inline-flex', gap: 80,
          animation: `tlsi-scroll${row.dir} 28s linear infinite`,
        }}
      >
        {seq.map((n, i) => (
          <span
            key={i}
            style={{
              ...sans, fontWeight: 700, fontSize: row.size,
              textTransform: 'uppercase', letterSpacing: '-.02em',
              color: bright ? row.bright : row.color,
            }}
          >{n}</span>
        ))}
      </div>
    </div>
  );
}

function NameField({ bright }) {
  return (
    <div style={nameField} aria-hidden="true">
      {NAME_ROWS.map((row, i) => <NameRow key={i} row={row} bright={bright} />)}
    </div>
  );
}

function SignIn() {
  const { completeLogin } = useAuth();
  const btnRef = useRef(null);
  const authRef = useRef(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [btnWidth, setBtnWidth] = useState(360);
  const [introOver, setIntroOver] = useState(() => prefersReduced());
  // True only once GIS has actually rendered its (invisible) button. Until then
  // the overlay stays click-through so taps reach the real /api/oauth link
  // underneath — the fallback path for browsers where GIS never runs.
  const [gisReady, setGisReady] = useState(false);

  // Run the intro once, then settle. Skip button / unmount clear the timer.
  useEffect(() => {
    injectAnim();
    if (introOver) return;
    const id = setTimeout(() => setIntroOver(true), INTRO_MS);
    return () => clearTimeout(id);
  }, [introOver]);

  // Surface errors bounced back from the /api/oauth redirect flow, then strip
  // the query param so a refresh doesn't re-show the message.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const code = new URLSearchParams(window.location.search).get('auth_error');
    if (!code) return;
    setError(code === 'denied'
      ? "This Google account isn't on the guest list."
      : 'Sign-in failed. Please try again.');
    const url = window.location.pathname + window.location.hash;
    window.history.replaceState(null, '', url);
  }, []);

  // Track the auth area's width so the transparent GIS button spans the visual one.
  useEffect(() => {
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
    const timers = [];

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
        setGisReady(false);
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'filled_black', size: 'large', shape: 'pill',
          text: 'signin_with', width: btnWidth,
        });
        // GIS injects an <iframe> asynchronously. Only treat the overlay as live
        // once it appears — otherwise leave taps falling through to the link.
        const t = setTimeout(() => {
          if (!cancelled && btnRef.current?.querySelector('iframe')) setGisReady(true);
        }, 1500);
        timers.push(t);
      }
    }).catch(() => { if (!cancelled) setError('Could not load Google sign-in.'); });

    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [completeLogin, btnWidth]);

  return (
    <div style={shell}>
      {/* persistent scrolling name-wall behind everything */}
      <div style={persistentWall} aria-hidden="true"><NameField /></div>

      {/* cinematic intro overlay */}
      {!introOver && (
        <div className="tlsi-introlayer" style={introLayer}>
          <NameField bright />
          <button type="button" onClick={() => setIntroOver(true)} style={skipBtn}>
            <span style={{ ...mono, fontSize: 10, letterSpacing: '0.16em', color: '#4a5689' }}>SKIP INTRO →</span>
          </button>
        </div>
      )}

      {/* ticket screen */}
      <div style={ticketScreen}>
        <div style={ticketWrap}>
          <div className={introOver ? undefined : 'tlsi-ticket'} style={ticket}>
            <div style={goldHairline} />

            <div style={{ padding: '34px 34px 30px', textAlign: 'left' }}>
              <div style={{ marginBottom: 26 }}>
                <div className="tlsi-flicker" style={kicker}>THE BUDHOLE EXCLUSIVE APP</div>
                <div style={titleWrap}>
                  <span style={wordmark}>Tomorrowland</span><br />
                  <span style={{ ...display, color: '#ccc' }}>Consciencia</span>
                </div>
              </div>

              <div style={{ ...display, fontStyle: 'italic', fontWeight: 700, fontSize: 21, color: '#ffffff', lineHeight: 1.25, marginBottom: 6 }}>
                Let&rsquo;s Ducking Go.
              </div>
              <div style={{ ...mono, fontSize: 11, color: '#666', marginBottom: 28 }}>
                Forget about Monday to Friday, &rsquo;cause we&rsquo;ve been working like a slave.
              </div>

              {/* auth: real /api/oauth link (works everywhere) + transparent GIS
                  overlay on top for modern devices. The overlay only intercepts
                  taps once GIS has actually rendered; otherwise taps fall through
                  to the link, which is the fallback for old Android / no-GIS. */}
              <div ref={authRef} style={{ position: 'relative', width: '100%', height: 52 }}>
                <a href="/api/oauth" style={authBtn}>
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </a>
                <div
                  ref={btnRef}
                  style={{
                    position: 'absolute', inset: 0, zIndex: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transform: 'scaleY(1.35)',
                    pointerEvents: gisReady && !busy ? 'auto' : 'none',
                  }}
                />
              </div>

              {busy && <div style={{ ...sans, fontSize: 13, color: muted, marginTop: 14 }}>Signing in…</div>}
              {error && <div role="alert" style={{ ...sans, fontSize: 13, color: clashRed, marginTop: 14 }}>{error}</div>}
            </div>

            {/* perforation */}
            <div style={{ position: 'relative', height: 0, borderTop: '1px dashed #2a2a2a' }} />
            <div style={{ ...notch, left: -14 }} />
            <div style={{ ...notch, right: -14 }} />

            {/* stub */}
            <div style={stub}>
              <div style={{ ...mono, fontSize: 11, color: '#333', letterSpacing: '0.06em' }}>
                Created with <span style={{ color: '#444' }}>♥</span> for my favourite people
              </div>
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
    <div style={{ ...shell, alignItems: 'center', justifyContent: 'center' }}>
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
  background: PAGE_BG, color: '#eef1fb', textAlign: 'center',
  position: 'relative', overflow: 'hidden',
};

const nameField = {
  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
  justifyContent: 'center', gap: 24, overflow: 'hidden',
};

const persistentWall = { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' };

const introLayer = {
  position: 'fixed', inset: 0, zIndex: 20, background: PAGE_BG,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  overflow: 'hidden', pointerEvents: 'none',
};

const skipBtn = {
  position: 'absolute', bottom: 32, right: 36, padding: 8,
  background: 'none', border: 'none', cursor: 'pointer', pointerEvents: 'auto',
};

const ticketScreen = {
  position: 'relative', zIndex: 1, minHeight: '100dvh',
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', padding: '40px 20px',
};

const ticketWrap = { position: 'relative', width: '100%', maxWidth: 430, display: 'flex', flexDirection: 'column', alignItems: 'center' };

const ticket = {
  position: 'relative', width: '100%', background: '#080808', borderRadius: 22,
  boxShadow: '0 40px 100px -20px rgba(0,0,0,.98), 0 0 0 1px rgba(255,255,255,.08)',
  overflow: 'hidden',
};

const goldHairline = { height: 1, background: 'linear-gradient(90deg,transparent,rgba(233,185,73,.35),rgba(233,185,73,.6),rgba(233,185,73,.35),transparent)' };

const kicker = { ...mono, fontSize: 10, letterSpacing: '0.26em', color: 'rgba(233,185,73,.55)', marginBottom: 10 };

const titleWrap = { ...display, fontWeight: 700, fontSize: 38, lineHeight: 0.95, color: '#ffffff', letterSpacing: '-0.01em' };

const wordmark = { ...sans, fontWeight: 600, letterSpacing: '0.01em', textTransform: 'uppercase' };

const authBtn = {
  position: 'absolute', inset: 0, width: '100%', boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
  borderRadius: 30, border: '1px solid #3c3c3c', background: '#202124', color: '#fff',
  ...sans, fontWeight: 500, fontSize: 15, letterSpacing: '0.25px',
  textDecoration: 'none', cursor: 'pointer',
};

const notch = {
  position: 'absolute', bottom: 64, width: 28, height: 28, borderRadius: '50%',
  background: '#0a0a0a', border: '1px solid #1f1f1f',
};

const stub = { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 34px', background: '#0a0a0a' };

const copyright = {
  position: 'fixed', bottom: 22, left: 0, width: '100%', textAlign: 'center',
  zIndex: 5, pointerEvents: 'none',
  ...mono, fontSize: 10, color: '#4a5689', letterSpacing: '0.14em',
};
