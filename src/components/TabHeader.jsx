import { useEffect, useRef, useState } from 'react';
import { HERO_H, hdrEyebrow, hdrName, hdrCountLabel, hdrCountValue } from './lineup/theme.js';
import { countdownLabel } from '../lib/countdown.js';

// Shared header shell used by BOTH tabs: the hero banner (tab-specific gradient
// body via {children} + an overlaid identity strip) which bleeds full-width AND up
// under the status bar (so the sky fills the safe area — no harsh dark→sky line),
// and scrolls away with the page. Once the banner scrolls past, a compact fixed
// header pins the identity (crew · status · countdown) at the top. The tab switcher
// lives in the bottom bar (TabPills), so the banner is the whole shell.
const SAT = 'env(safe-area-inset-top)'; // status-bar safe-area inset

export default function TabHeader({ kicker, crewName, departureDate, statusChip, children }) {
  const countdown = countdownLabel(departureDate);
  const sentinelRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  // Reveal the compact header once the banner's identity has scrolled off. A high
  // sentinel (not at the banner bottom) means the mini appears as the crew line
  // leaves — no dead zone where neither header shows the identity.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* Hero banner — bleeds out of <main>'s padding (full-width + up under the
          status bar); scrolls away on scroll. */}
      <div style={{ margin: `calc(-24px - ${SAT}) -16px 0`, overflow: 'hidden' }}>
        <div style={{ position: 'relative', height: `calc(${HERO_H}px + ${SAT})`, overflow: 'hidden', backgroundColor: '#0a0e22' }}>
          {/* Tab-specific body fills the banner; only it cross-fades on tab switch
              (over the steady dark base) while the overlaid strip stays put. */}
          <div className="fx-fade" style={{ position: 'absolute', inset: 0 }}>
            {children}
          </div>

          {/* Identity strip — overlaid at the top, padded below the status bar. */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: `calc(11px + ${SAT}) 18px 11px`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              {kicker && (
                <div style={{ ...hdrEyebrow, color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>{kicker}</div>
              )}
              {crewName && (
                <div style={{ ...hdrName, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.55)', marginTop: 1 }}>{crewName}</div>
              )}
              {statusChip && <div style={{ marginTop: 2 }}>{statusChip}</div>}
            </div>
            {countdown && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ ...hdrCountLabel, color: 'rgba(255,255,255,0.65)', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>DEPARTURE IN</div>
                <div style={{ ...hdrCountValue, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.55)', marginTop: 1 }}>{countdown}</div>
              </div>
            )}
          </div>

          {/* Reveal sentinel — high in the banner (rides it as it scrolls). */}
          <div ref={sentinelRef} aria-hidden="true" style={{ position: 'absolute', top: 60, left: 0, width: 1, height: 1 }} />
        </div>
      </div>

      {/* Compact sticky header — pins the identity once the banner scrolls past.
          Deliberately lightweight (solid bg + hairline, no big blur shadow) so it
          doesn't add scroll-repaint cost. */}
      <div aria-hidden={!scrolled} style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        backgroundColor: '#0b1020', borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingTop: SAT,
        transform: scrolled ? 'translateY(0)' : 'translateY(-100%)',
        opacity: scrolled ? 1 : 0,
        transition: 'transform var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out)',
        pointerEvents: scrolled ? 'auto' : 'none',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto', minHeight: 44, padding: '6px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {crewName && <span style={{ ...hdrName, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{crewName}</span>}
            {statusChip}
          </div>
          {countdown && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
              <span style={{ ...hdrCountLabel, color: 'rgba(255,255,255,0.55)' }}>DEPARTURE IN</span>
              <span style={{ ...hdrCountValue, color: '#fff' }}>{countdown}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
