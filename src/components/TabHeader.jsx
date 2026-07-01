import { HERO_H, hdrEyebrow, hdrName, hdrCountLabel, hdrCountValue } from './lineup/theme.js';
import { countdownLabel } from '../lib/countdown.js';

// Shared header shell used by BOTH tabs: the hero banner (tab-specific gradient
// body via {children} + an overlaid identity strip), which bleeds full-width and
// scrolls away with the page. The tab switcher now lives in the bottom bar
// (TabPills), so the banner is the whole shell. Identity strip is white-on-
// gradient with shadows for legibility.
export default function TabHeader({ kicker, crewName, departureDate, statusChip, children }) {
  const countdown = countdownLabel(departureDate);
  return (
    <>
      {/* Hero banner — bleeds out of <main>'s padding; scrolls away on scroll. */}
      <div style={{ margin: '-24px -16px 0', overflow: 'hidden' }}>
        <div style={{ position: 'relative', height: HERO_H, overflow: 'hidden', backgroundColor: '#0a0e22' }}>
          {/* Tab-specific body fills the banner; only it cross-fades on tab switch
              (over the steady dark base) while the overlaid strip stays put. */}
          <div className="fx-fade" style={{ position: 'absolute', inset: 0 }}>
            {children}
          </div>

          {/* Identity strip — overlaid at the top (NOT faded: identical across tabs) */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '11px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              {kicker && (
                <div style={{ ...hdrEyebrow, color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>{kicker}</div>
              )}
              {crewName && (
                <div style={{ ...hdrName, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.55)', marginTop: 1 }}>{crewName}</div>
              )}
              {statusChip && <div style={{ marginTop: 6 }}>{statusChip}</div>}
            </div>
            {countdown && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ ...hdrCountLabel, color: 'rgba(255,255,255,0.65)', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>DEPARTURE IN</div>
                <div style={{ ...hdrCountValue, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.55)', marginTop: 1 }}>{countdown}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
