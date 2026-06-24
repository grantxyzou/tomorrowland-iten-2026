import { useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { LAST_UPDATED } from './data/trip.js';
import ItineraryTab from './components/ItineraryTab.jsx';
import LineupTab from './components/LineupTab.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const TABS = [
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'lineup',    label: 'Lineup'    },
];

const mono = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };

// Format the last-updated timestamp for display
function formatUpdated(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState('itinerary');

  const paper    = '#ede7d8';
  const ink      = '#1a1614';
  const muted    = '#5c544c';
  const rule     = '#cabda4';
  const accent   = '#a82a13';
  const cardBg   = '#f5efde';

  // "Direction D — Midnight" background for the Lineup tab: cool nebula glows
  // over a near-black midnight wash that bottoms at the canvas/well tone, so the
  // (lighter) card surfaces read as raised. (The Itinerary tab keeps the light
  // desert theme.) The Lineup runs as a full dark theme.
  const lineupAtmosphere =
    'radial-gradient(120% 80% at 30% -10%, rgba(46,64,132,0.34), rgba(46,64,132,0) 55%),' +
    'radial-gradient(95% 75% at 85% 30%, rgba(78,58,128,0.24), rgba(78,58,128,0) 60%),' +
    'radial-gradient(110% 95% at 12% 92%, rgba(20,40,84,0.34), rgba(20,40,84,0) 60%),' +
    'radial-gradient(150% 120% at 50% 45%, rgba(8,12,32,0) 42%, rgba(4,6,16,0.92) 100%),' +
    'linear-gradient(178deg, #0d1430 0%, #0a0e22 55%, #070b1c 100%)';

  // Dark-theme chrome only on the Lineup tab.
  const dark = activeTab === 'lineup';
  const lineupAccent = '#e9b949'; // gold active-tab indicator (Direction D spotlight)
  const activeIndex = TABS.findIndex(t => t.id === activeTab);

  return (
    <div style={{ minHeight: '100dvh', color: ink, position: 'relative' }}>

      {/* Single page-level heading for screen readers / document outline. */}
      <h1 className="sr-only">Tomorrowland 2026 trip planner</h1>

      {/* ── Crossfading theme backgrounds ───────────────────────
          Two viewport-fixed layers (light desert + dark Cage) whose
          opacity swaps on tab change. Lets the whole surface dissolve
          between themes — a `background` transition can't tween gradients. */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: paper, opacity: dark ? 0 : 1, transition: 'opacity var(--dur-theme) var(--ease-out)' }} />
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: '#0a0e22', backgroundImage: lineupAtmosphere, opacity: dark ? 1 : 0, transition: 'opacity var(--dur-theme) var(--ease-out)' }} />

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header style={{ backgroundColor: ink, color: paper, padding: '12px 16px', paddingTop: 'calc(12px + env(safe-area-inset-top))', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#938b81' }}>
              Europe 2026
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', marginTop: 2 }}>
              Grant · Desmond · Lawrence
            </div>
          </div>
          {/* Countdown to departure */}
          <Countdown target="2026-07-15" />
        </div>
      </header>

      {/* ── Last updated banner ─────────────────────────────── */}
      <div style={{ backgroundColor: dark ? '#0c1228' : cardBg, borderBottom: `1px solid ${dark ? '#1c2342' : rule}`, padding: '6px 16px', transition: 'background-color var(--dur-theme) var(--ease-out), border-color var(--dur-theme) var(--ease-out)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...mono, fontSize: 10, color: dark ? '#9aa3c4' : muted, letterSpacing: '0.12em', textTransform: 'uppercase', transition: 'color var(--dur-theme) var(--ease-out)' }}>
            Updated {formatUpdated(LAST_UPDATED)}
          </span>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <nav role="tablist" aria-label="Sections" style={{ backgroundColor: dark ? '#0c1228' : paper, borderBottom: `1px solid ${dark ? '#1c2342' : rule}`, position: 'sticky', top: 53, zIndex: 40, transition: 'background-color var(--dur-theme) var(--ease-out), border-color var(--dur-theme) var(--ease-out)' }}>
        <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto', display: 'flex', overflowX: 'auto' }} className="no-scrollbar">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={active}
                aria-controls="tabpanel"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...mono,
                  flex: 1,
                  padding: '12px 16px',
                  minHeight: 44,
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: active ? (dark ? lineupAccent : accent) : (dark ? '#9aa3c4' : muted),
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'transform var(--dur-press) var(--ease-out), color var(--dur-base) var(--ease-out)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
          {/* Sliding active-tab indicator — glides between tabs and eases
              its colour (rust → gold) as the theme crossfades. */}
          <span aria-hidden="true" style={{
            position: 'absolute', bottom: 0, left: 0, height: 2, borderRadius: 2,
            width: `${100 / TABS.length}%`, transform: `translateX(${activeIndex * 100}%)`,
            backgroundColor: dark ? lineupAccent : accent,
            transition: 'transform var(--dur-base) var(--ease-drawer), background-color var(--dur-theme) var(--ease-out)',
          }} />
        </div>
      </nav>

      {/* ── Tab content ─────────────────────────────────────── */}
      <main
        id="tabpanel"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        style={{ maxWidth: 680, margin: '0 auto', padding: '24px max(16px, env(safe-area-inset-right)) calc(64px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))' }}
      >
        <div key={activeTab} className="fx-fade" style={{ opacity: 1 }}>
          {/* Keyed by tab so switching tabs resets a crashed boundary. */}
          <ErrorBoundary key={activeTab}>
            {activeTab === 'itinerary' && <ItineraryTab />}
            {activeTab === 'lineup'    && <LineupTab    />}
          </ErrorBoundary>
        </div>
      </main>

      {/* Vercel Web Analytics — sends page views to /_vercel/insights (served
          automatically once Web Analytics is enabled for the project). */}
      <Analytics />
    </div>
  );
}

// Days until departure countdown
function Countdown({ target }) {
  const mono2 = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dep = new Date(target);
  dep.setHours(0, 0, 0, 0);
  const diff = Math.ceil((dep - today) / 86_400_000);

  if (diff < 0) return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ ...mono2, fontSize: 10, color: '#938b81', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Trip</div>
      <div style={{ ...mono2, fontSize: 13, color: '#e8b84b', fontWeight: 700 }}>Underway ✈</div>
    </div>
  );
  if (diff === 0) return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ ...mono2, fontSize: 13, color: '#e8b84b', fontWeight: 700 }}>Today! ✈</div>
    </div>
  );
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ ...mono2, fontSize: 10, color: '#938b81', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Departure in</div>
      <div style={{ ...mono2, fontSize: 18, color: '#e8b84b', fontWeight: 700, lineHeight: 1 }}>{diff} days</div>
    </div>
  );
}
