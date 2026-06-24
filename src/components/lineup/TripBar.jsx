import { useState, useEffect, useRef } from 'react';
import { Moon, Lightning, Sparkle, CaretDown } from '@phosphor-icons/react';
import { bar, paper, ink, muted, mono, sans, PERSON_COLORS, PERSON_INK, DAYS, VIEWS } from './theme.js';

const FAB_SIDE_KEY = 'tml2026_fab_side';
const HOLD_MS = 450; // press-and-hold on the FAB to flip it to the other corner

// The Trip Bar — persistent bottom control bar (Trip Bar spec). Person · Day ·
// View live in the thumb zone and never move; only the content above swaps. The
// active person's colour drives every accent here. The morphing floating action
// button is docked to a bottom corner (press-and-hold to flip sides) and slides
// out of the way while you scroll down.
export default function TripBar({
  activePerson, activeDay, view, setView, party, crewCount, clashCount, nextClashLabel,
  onPerson, onDay, onParty, onResolve, onNudge,
}) {
  const myColor = PERSON_COLORS[activePerson];
  const onAccent = PERSON_INK[activePerson]; // legible ink on the person's fill
  const dayLabel = DAYS.find(d => d.id === activeDay)?.label || '';

  // Which bottom corner the FAB docks to (remembered), and whether it's hidden
  // because the user is scrolling down through content.
  const [side, setSide] = useState(() => {
    try { return localStorage.getItem(FAB_SIDE_KEY) === 'left' ? 'left' : 'right'; } catch { return 'right'; }
  });
  const [hidden, setHidden] = useState(false);
  const hold = useRef({ timer: null, flipped: false });

  // Auto-hide the FAB on scroll-down, reveal on scroll-up (and near the top).
  useEffect(() => {
    let last = window.scrollY, ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 60) setHidden(false);
        else if (y > last + 6) setHidden(true);
        else if (y < last - 6) setHidden(false);
        last = y; ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const flipSide = () => setSide(s => {
    const next = s === 'right' ? 'left' : 'right';
    try { localStorage.setItem(FAB_SIDE_KEY, next); } catch {}
    return next;
  });
  // Press-and-hold flips the corner; a plain tap fires the action.
  const fabDown = (e) => {
    hold.current.flipped = false;
    hold.current.timer = setTimeout(() => {
      hold.current.flipped = true;
      flipSide();
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch {} }
    }, HOLD_MS);
  };
  const fabUp = () => { clearTimeout(hold.current.timer); };

  // Floating action — bound to the active view; only one ever shows. The clash
  // FAB is a status colour (red); the nudge FAB takes the person accent.
  let fab = null;
  if ((view === 'stage' || view === 'time') && clashCount > 0) {
    fab = {
      label: view === 'stage' ? `${clashCount} clash${clashCount === 1 ? '' : 'es'} · resolve` : `next clash · ${nextClashLabel}`,
      icon: <Lightning size={15} weight="fill" />, bg: '#e8554e', fg: '#fff',
      glow: '0 10px 24px rgba(232,85,78,0.40)', onClick: onResolve,
      aria: view === 'stage' ? `${clashCount} overlaps — resolve` : `Next overlap at ${nextClashLabel} — resolve`,
    };
  } else if (view === 'crew') {
    fab = {
      label: 'nudge squad', icon: <Sparkle size={15} weight="fill" />, bg: myColor, fg: onAccent,
      glow: `0 10px 24px ${myColor}59`, onClick: onNudge, aria: 'Nudge the squad',
    };
  }

  const chipStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 13px',
    borderRadius: 30, backgroundColor: paper, border: '1px solid #243056', color: ink,
    ...sans, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  };

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, pointerEvents: 'none' }}>
      {/* Floating action — docked to a bottom corner, auto-hides on scroll-down */}
      {fab && (
        <div style={{
          maxWidth: 680, margin: '0 auto', padding: '0 16px 12px', display: 'flex',
          justifyContent: side === 'left' ? 'flex-start' : 'flex-end',
          transform: hidden ? 'translateY(180%)' : 'none', opacity: hidden ? 0 : 1,
          transition: 'transform var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out)',
        }}>
          <button
            onClick={() => { if (hold.current.flipped) { hold.current.flipped = false; return; } fab.onClick(); }}
            onPointerDown={fabDown} onPointerUp={fabUp} onPointerLeave={fabUp} onPointerCancel={fabUp}
            aria-label={fab.aria} title="Press and hold to move to the other corner"
            style={{ pointerEvents: hidden ? 'none' : 'auto', touchAction: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 18px', borderRadius: 22, border: 'none', backgroundColor: fab.bg, color: fab.fg, ...sans, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: fab.glow }}>
            {fab.icon} {fab.label}
          </button>
        </div>
      )}

      {/* The bar */}
      <div style={{ pointerEvents: 'auto', backgroundColor: bar, borderTop: '1px solid #20284a', borderTopLeftRadius: 30, borderTopRightRadius: 30, boxShadow: '0 -12px 30px rgba(0,0,0,0.45)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Row 1 — Person · Day · Party */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <button onClick={onPerson} aria-haspopup="dialog" aria-label={`Whose plan: ${activePerson}. Tap to switch.`} style={chipStyle}>
              <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: myColor, color: onAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>{activePerson[0]}</span>
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activePerson}</span>
              <CaretDown size={13} weight="bold" color={muted} />
            </button>
            <button onClick={onDay} aria-haspopup="dialog" aria-label={`Day: ${dayLabel}. Tap to switch.`} style={{ ...chipStyle, ...mono, fontSize: 13 }}>
              <span style={{ color: myColor, fontWeight: 700 }}>{dayLabel}</span>
              <CaretDown size={13} weight="bold" color={muted} />
            </button>
            <button onClick={onParty} aria-pressed={party} aria-label="Enter party mode"
              style={{ marginLeft: 'auto', flexShrink: 0, width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: party ? 'none' : '1px solid #243056', cursor: 'pointer', backgroundColor: party ? myColor : paper, color: party ? onAccent : myColor, boxShadow: party ? `0 0 0 4px ${myColor}40` : 'none' }}>
              <Moon size={18} weight="fill" />
            </button>
          </div>

          {/* Row 2 — View switch (one active) */}
          <div role="tablist" aria-label="View" style={{ display: 'flex', gap: 6, padding: 5, borderRadius: 16, backgroundColor: '#080c1e' }}>
            {VIEWS.map(v => {
              const active = view === v.id;
              const label = v.label + (v.id === 'crew' && crewCount > 0 ? ` · ${crewCount}` : '');
              return (
                <button key={v.id} role="tab" aria-selected={active} onClick={() => setView(v.id)}
                  style={{ flex: 1, minHeight: 44, borderRadius: 11, border: 'none', cursor: 'pointer', backgroundColor: active ? myColor : 'transparent', color: active ? onAccent : muted, ...sans, fontSize: 14, fontWeight: active ? 700 : 600, transition: 'background-color var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)' }}>
                  {label}
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
