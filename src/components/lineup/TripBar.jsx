import { useState, useEffect, useRef } from 'react';
import { Moon, Lightning, Sparkle, CaretDown, Plus, X, MusicNotes, NavigationArrow } from '@phosphor-icons/react';
import { bar, paper, chip, well, ink, muted, mono, sans, clashFab, spotifyDot, PERSON_COLORS, PERSON_INK, DAYS, VIEWS, shRow, shBar, rSeg, rTrack, rSheet, rPill, rBadge } from './theme.js';

const FAB_SIDE_KEY = 'tml2026_fab_side';
const HOLD_MS = 450; // press-and-hold on the FAB to flip it to the other corner

// The Trip Bar — persistent bottom control bar (Trip Bar spec). Person · Day ·
// View live in the thumb zone and never move; only the content above swaps. The
// active person's colour drives every accent here. The corner-docked FAB
// (press-and-hold to flip sides) now fans OUT into a speed-dial — Nudge ·
// Spotify · Where's everyone, plus Overlaps when there are clashes — and slides
// out of the way while you scroll down. Party keeps its own button on the bar.
export default function TripBar({
  activePerson, activeDay, view, setView, party, crewCount, clashCount,
  onPerson, onDay, onParty, onResolve, onNudge, onSpotify, onWhere,
}) {
  const myColor = PERSON_COLORS[activePerson];
  const onAccent = PERSON_INK[activePerson]; // legible ink on the person's fill
  const dayLabel = DAYS.find(d => d.id === activeDay)?.label || '';

  // Which bottom corner the FAB docks to (remembered), whether it's hidden
  // because the user is scrolling down, and whether the fan-out is open.
  const [side, setSide] = useState(() => {
    try { return localStorage.getItem(FAB_SIDE_KEY) === 'left' ? 'left' : 'right'; } catch { return 'right'; }
  });
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  // A hidden FAB shouldn't keep a fan open behind the scenes.
  useEffect(() => { if (hidden) setMenuOpen(false); }, [hidden]);

  // Escape closes the fan-out.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const flipSide = () => setSide(s => {
    const next = s === 'right' ? 'left' : 'right';
    try { localStorage.setItem(FAB_SIDE_KEY, next); } catch {}
    return next;
  });
  // Press-and-hold flips the corner; a plain tap toggles the fan-out.
  const fabDown = () => {
    hold.current.flipped = false;
    hold.current.timer = setTimeout(() => {
      hold.current.flipped = true;
      flipSide();
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch {} }
    }, HOLD_MS);
  };
  const fabUp = () => { clearTimeout(hold.current.timer); };

  // Fan-out actions — always available (Nudge / Spotify / Where), with Overlaps
  // surfacing only when there are clashes to resolve. Each runs then closes.
  const run = (fn) => () => { setMenuOpen(false); fn?.(); };
  const actions = [
    clashCount > 0 && {
      key: 'overlaps', label: `${clashCount} overlap${clashCount === 1 ? '' : 's'}`,
      icon: <Lightning size={17} weight="fill" />, accent: clashFab, fg: '#fff', onClick: run(onResolve),
    },
    { key: 'where', label: 'Where’s everyone', icon: <NavigationArrow size={17} weight="fill" />, accent: myColor, fg: onAccent, onClick: run(onWhere) },
    { key: 'spotify', label: 'Spotify playlist', icon: <MusicNotes size={17} weight="fill" />, accent: spotifyDot, fg: '#06210f', onClick: run(onSpotify) },
    { key: 'nudge', label: 'Nudge squad', icon: <Sparkle size={17} weight="fill" />, accent: myColor, fg: onAccent, onClick: run(onNudge) },
  ].filter(Boolean);

  const chipStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 13px',
    borderRadius: rPill, backgroundColor: paper, border: '1px solid #243056', color: ink,
    ...sans, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  };

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, pointerEvents: 'none' }}>
      {/* Tap-catcher — closes the fan on an outside tap (sits below the sheets) */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} aria-hidden="true"
          style={{ position: 'fixed', inset: 0, pointerEvents: 'auto', backgroundColor: 'rgba(4,7,18,0.35)' }} />
      )}

      {/* Floating action — docked to a bottom corner, auto-hides on scroll-down */}
      <div style={{
        position: 'relative', maxWidth: 680, margin: '0 auto', padding: '0 16px 12px', display: 'flex',
        flexDirection: 'column', alignItems: side === 'left' ? 'flex-start' : 'flex-end', gap: 10,
        transform: hidden ? 'translateY(180%)' : 'none', opacity: hidden ? 0 : 1,
        transition: 'transform var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out)',
      }}>
        {/* Fan-out items */}
        {menuOpen && (
          <div role="group" aria-label="Quick actions"
            style={{ display: 'flex', flexDirection: 'column', alignItems: side === 'left' ? 'flex-start' : 'flex-end', gap: 10 }}>
            {actions.map((a, i) => (
              <button key={a.key} onClick={a.onClick} className="fx-enter"
                style={{ animationDelay: `${i * 35}ms`, pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', flexDirection: side === 'left' ? 'row' : 'row-reverse', gap: 10, minHeight: 44, padding: side === 'left' ? '0 16px 0 6px' : '0 6px 0 16px', borderRadius: rSheet, border: 'none', backgroundColor: chip, color: ink, ...sans, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: shRow }}>
                <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: a.accent, color: a.fg }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* Main FAB — tap fans out, press-and-hold flips corner */}
        <button
          onClick={() => { if (hold.current.flipped) { hold.current.flipped = false; return; } setMenuOpen(o => !o); }}
          onPointerDown={fabDown} onPointerUp={fabUp} onPointerLeave={fabUp} onPointerCancel={fabUp}
          aria-haspopup="true" aria-expanded={menuOpen} aria-label={menuOpen ? 'Close actions' : 'Open actions'}
          title="Press and hold to move to the other corner"
          style={{ position: 'relative', pointerEvents: hidden ? 'none' : 'auto', touchAction: 'none', width: 56, height: 56, borderRadius: '50%', border: 'none', backgroundColor: myColor, color: onAccent, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 10px 24px ${myColor}59` }}>
          <span style={{ display: 'inline-flex', transform: menuOpen ? 'rotate(135deg)' : 'none', transition: 'transform var(--dur-base) var(--ease-out)' }}>
            {menuOpen ? <X size={22} weight="bold" /> : <Plus size={24} weight="bold" />}
          </span>
          {/* Overlaps badge — surfaces clashes even while collapsed */}
          {!menuOpen && clashCount > 0 && (
            <span aria-hidden="true" style={{ position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, padding: '0 5px', borderRadius: rBadge, backgroundColor: clashFab, color: '#fff', ...mono, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 2px ${bar}` }}>{clashCount}</span>
          )}
        </button>
      </div>

      {/* The bar */}
      <div style={{ pointerEvents: 'auto', backgroundColor: bar, borderTop: '1px solid #20284a', borderTopLeftRadius: rPill, borderTopRightRadius: rPill, boxShadow: shBar, paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
          <div role="tablist" aria-label="View" style={{ display: 'flex', gap: 6, padding: 5, borderRadius: rTrack, backgroundColor: well }}>
            {VIEWS.map(v => {
              const active = view === v.id;
              const label = v.label + (v.id === 'crew' && crewCount > 0 ? ` · ${crewCount}` : '');
              return (
                <button key={v.id} role="tab" aria-selected={active} onClick={() => setView(v.id)}
                  style={{ flex: 1, minHeight: 44, borderRadius: rSeg, border: 'none', cursor: 'pointer', backgroundColor: active ? myColor : 'transparent', color: active ? onAccent : muted, ...sans, fontSize: 14, fontWeight: active ? 700 : 600, transition: 'background-color var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)' }}>
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
