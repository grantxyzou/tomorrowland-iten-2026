import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { tmrwGold, muted, clashRed, sans, display, mono } from '../components/lineup/theme.js';
import { isInAppBrowser, platformOS, chromeIntentUrl } from '../lib/inAppBrowser.js';

// Gates the whole app behind Google sign-in. While the session bootstraps we
// show a splash; signed in → render the app; otherwise → the cinematic sign-in
// screen (scrolling-name intro → black "Access Pass" ticket).
//
// Sign-in is a plain top-level navigation to /api/oauth — a server-side OAuth
// 2.0 authorization-code flow that sets our session cookie and redirects back.
// It needs no client-side Google JS, so it works in any browser that can follow
// a link (desktop, Android Chrome, most in-app WebViews). On return, AuthContext's
// session check picks up the cookie and renders the app.
//
// (We previously layered a transparent Google Identity Services button over this
// link. GIS silently no-ops in many real environments — FedCM / third-party-cookie
// / in-app WebView — and once its iframe rendered it both captured the tap AND
// covered this link, leaving the working fallback unreachable. A single tap can't
// target both, so we dropped the overlay and use the redirect as the one reliable
// path. See PR — root-caused via prod logs showing zero server contact on tap.)

const PAGE_BG = '#070a1a';
const INTRO_MS = 5200; // names scroll + fade + ticket rise (4s delay + 1s) then settle

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

// Shown instead of the Google button when we're inside an in-app browser, where
// Google blocks OAuth. Coaches the user into a real browser: a one-tap Chrome
// escape on Android, an instruction on iOS, plus a copy-link both can use. A
// quiet "try anyway" link keeps a false positive from locking anyone out.
function WebViewCoach() {
  const [copied, setCopied] = useState(false);
  const os = platformOS();
  const href = typeof window !== 'undefined' ? window.location.href : '/';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div role="group" aria-label="Open in your browser to sign in">
      <div style={coachCard}>
        <div style={{ ...sans, fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
          Open in your browser to sign in
        </div>
        <div style={{ ...mono, fontSize: 11, color: '#8a8a8a', lineHeight: 1.55 }}>
          Google blocks sign-in inside apps like Instagram and WhatsApp. Continue in your browser to finish.
        </div>

        {os === 'android' && (
          <a href={chromeIntentUrl(href)} style={{ ...authBtn, marginTop: 16 }}>Open in Chrome</a>
        )}
        {os === 'ios' && (
          <div style={{ ...sans, fontSize: 13, color: '#cbd2e8', lineHeight: 1.5, marginTop: 14 }}>
            Tap the <strong>⋯</strong> or <strong>Share</strong> icon, then choose{' '}
            <strong>&ldquo;Open in Browser&rdquo;</strong> (or &ldquo;Open in Safari&rdquo;).
          </div>
        )}

        <button type="button" onClick={copyLink} style={{ ...authBtnGhost, marginTop: 10 }}>
          {copied ? 'Link copied ✓' : 'Copy link'}
        </button>
      </div>

      <a href="/api/oauth" style={tryAnyway}>Try signing in anyway &rarr;</a>
    </div>
  );
}

function SignIn() {
  const [error, setError] = useState(null);
  const [introOver, setIntroOver] = useState(() => prefersReduced());
  // Detected once: are we inside an app's embedded browser (Instagram/WhatsApp/
  // …) where Google refuses OAuth? If so we coach to a real browser instead of
  // showing a dead "Sign in with Google" button.
  const [inApp] = useState(() => isInAppBrowser());

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
    setError('Sign-in failed. Please try again.');
    const url = window.location.pathname + window.location.hash;
    window.history.replaceState(null, '', url);
  }, []);

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

              {inApp ? (
                /* Opened inside an app's in-app browser — Google refuses OAuth
                   here, so coach the user into a real browser instead. */
                <WebViewCoach />
              ) : (
                /* Sign-in is a plain top-level navigation to the server-side OAuth
                   redirect flow (/api/oauth) — works in any browser that can follow
                   a link. No client-side Google JS, no overlay. */
                <a href="/api/oauth" style={authBtn}>
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </a>
              )}

              <p style={{ ...mono, fontSize: 10, color: '#555', letterSpacing: '0.05em', lineHeight: 1.6, marginTop: 16, marginBottom: 0, textAlign: 'center' }}>
                By signing in you agree to our{' '}
                <a href="/privacy" style={{ color: '#777', textDecorationColor: '#555' }}>Privacy Policy</a>.
              </p>

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
  width: '100%', height: 52, boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
  borderRadius: 30, border: '1px solid #3c3c3c', background: '#202124', color: '#fff',
  ...sans, fontWeight: 500, fontSize: 15, letterSpacing: '0.25px',
  textDecoration: 'none', cursor: 'pointer',
};

const coachCard = {
  border: '1px solid rgba(233,185,73,.28)', borderRadius: 14, background: 'rgba(233,185,73,.05)',
  padding: '16px 16px 18px', textAlign: 'left',
};

const authBtnGhost = {
  width: '100%', height: 46, boxSizing: 'border-box',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 30, border: '1px solid #3c3c3c', background: 'transparent', color: '#eee',
  ...sans, fontWeight: 500, fontSize: 14, cursor: 'pointer', textDecoration: 'none',
};

const tryAnyway = {
  display: 'block', textAlign: 'center', marginTop: 14,
  ...mono, fontSize: 11, letterSpacing: '0.04em', color: '#666', textDecoration: 'none',
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
