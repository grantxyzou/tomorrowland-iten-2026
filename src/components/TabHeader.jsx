import { HERO_H, hdrEyebrow, hdrName, hdrCountLabel, hdrCountValue, hdrSubline } from './lineup/theme.js';
import { countdownLabel } from '../lib/countdown.js';

// Shared header shell used identically by BOTH tabs, so switching tabs never
// jumps and the two headers read as one shell. Structure:
//   [ bleed wrapper ]
//     [ banner (height HERO_H): tab-specific gradient body + overlaid identity ]
//     [ tab switcher — the banner's bottom strip ]
// `children` is the tab-specific body (Itinerary sky+clock / Lineup wordmark);
// the identity strip (kicker · name · DEPARTURE IN · countdown) and the tab bar
// are shared. Text is white-on-gradient with shadows so it's legible over any
// sky/ink the body renders behind it.
export default function TabHeader({ kicker, crewName, departureDate, updated, tabBar, children }) {
  const countdown = countdownLabel(departureDate);
  return (
    // Bleed out of <main>'s padding (24px top / 16px sides) so the banner runs
    // edge-to-edge; round only the bottom so the tab strip tucks in cleanly.
    <div style={{ margin: '-24px -16px 16px', overflow: 'hidden', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }}>
      <div style={{ position: 'relative', height: HERO_H, overflow: 'hidden', backgroundColor: '#0a0e22' }}>
        {/* Tab-specific body fills the banner. It (and only it) cross-fades on
            tab switch — over the steady dark base — while the overlaid identity
            strip and the tab bar below stay put, so the shared shell reads as
            motionless. */}
        <div className="fx-fade" style={{ position: 'absolute', inset: 0 }}>
          {children}
        </div>

        {/* Shared identity strip — overlaid on the top of the body (NOT faded:
            identical on both tabs, so it must not move/flicker on switch) */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '11px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            {kicker && (
              <div style={{ ...hdrEyebrow, color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>{kicker}</div>
            )}
            {crewName && (
              <div style={{ ...hdrName, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.55)', marginTop: 1 }}>{crewName}</div>
            )}
            {updated && (
              <div style={{ ...hdrSubline, color: 'rgba(255,255,255,0.6)', textShadow: '0 1px 4px rgba(0,0,0,0.7)', marginTop: 3 }}>UPDATED {updated}</div>
            )}
          </div>
          {countdown && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ ...hdrCountLabel, color: 'rgba(255,255,255,0.65)', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>DEPARTURE IN</div>
              <div style={{ ...hdrCountValue, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.55)', marginTop: 1 }}>{countdown}</div>
            </div>
          )}
        </div>
      </div>

      {/* Tab switcher — same place (bottom strip) on both tabs */}
      {tabBar}
    </div>
  );
}
