import { useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { LAST_UPDATED } from './data/trip.js';
import ItineraryTab from './components/ItineraryTab.jsx';
import LineupTab from './components/LineupTab.jsx';

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

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: paper, color: ink }}>

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
      <div style={{ backgroundColor: cardBg, borderBottom: `1px solid ${rule}`, padding: '6px 16px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Updated {formatUpdated(LAST_UPDATED)}
          </span>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────── */}
      <nav role="tablist" aria-label="Sections" style={{ backgroundColor: paper, borderBottom: `1px solid ${rule}`, position: 'sticky', top: 53, zIndex: 40 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', overflowX: 'auto' }} className="no-scrollbar">
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
                  color: active ? accent : muted,
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? `2px solid ${accent}` : '2px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'transform var(--dur-press) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Tab content ─────────────────────────────────────── */}
      <main
        id="tabpanel"
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        style={{ maxWidth: 680, margin: '0 auto', padding: '24px max(16px, env(safe-area-inset-right)) calc(64px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))' }}
      >
        {activeTab === 'itinerary' && <ItineraryTab />}
        {activeTab === 'lineup'    && <LineupTab    />}
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
