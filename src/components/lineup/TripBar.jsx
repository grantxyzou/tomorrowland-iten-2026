import { useState, useEffect, useRef } from 'react';
import { Moon, Lightning, Sparkle, CaretDown, Plus, MusicNotes, NavigationArrow } from '@phosphor-icons/react';
import { bar, paper, chip, well, ink, muted, mono, sans, clashFab, spotifyDot, DAYS, VIEWS, shRow, shBar, rSeg, rTrack, rSheet, rPill } from './theme.js';
import { useGroup } from '../../groups/GroupContext.jsx';
import TabPills from './TabPills.jsx';

const FAB_SIDE_KEY = 'tml2026_fab_side';
const HOLD_MS = 450; // press-and-hold on the FAB to flip it to the other corner
// Closed-FAB notification dot palette. Overlap matches the overlaps fan item;
// message is a fixed blue. (Location is tinted by the sharer's own crew colour.)
const NOTIF = { overlap: clashFab, message: '#5b8cff' };

// The Trip Bar — persistent bottom control bar (Trip Bar spec). Person · Day ·
// View live in the thumb zone and never move; only the content above swaps. The
// active person's colour drives every accent here. The corner-docked FAB
// (press-and-hold to flip sides) now fans OUT into a speed-dial — Nudge ·
// Spotify · Where's everyone, plus Overlaps when there are clashes — and slides
// out of the way while you scroll down. Party keeps its own button on the bar.
export default function TripBar({
  activePerson, activeDay, view, setView, crewCount, clashCount, newActivity = {},
  tabs, activeTab, onSelectTab,
  onPerson, onDay, onParty, onResolve, onNudge, onSpotify, onWhere, onOpen,
}) {
  const { colorFor, inkFor } = useGroup();
  const myColor = colorFor(activePerson);
  const onAccent = inkFor(activePerson); // legible ink on the person's fill
  const dayLabel = DAYS.find(d => d.id === activeDay)?.label || '';
  // Closed-FAB notification dots — one colour per activity kind. The location
  // dot is tinted by whoever turned location on (its crew colour); several
  // people blend into a soft gradient (capped at 3 so it stays legible).
  const locColors = newActivity.location || [];
  const locBg = locColors.length <= 1
    ? locColors[0]
    : `linear-gradient(135deg, ${locColors.slice(0, 3).join(', ')})`;
  const anyNew = !!(newActivity.overlap || newActivity.message || locColors.length);

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

  // Fan-out actions. Overlaps surfaces only when there are clashes to resolve;
  // Party mode now lives here too (moved off the bar). Each runs then closes.
  const run = (fn) => () => { setMenuOpen(false); fn?.(); };
  const actions = [
    clashCount > 0 && {
      key: 'overlaps', label: `Crew’s overlap${clashCount === 1 ? '' : 's'}`,
      icon: <Lightning size={17} weight="fill" />, accent: clashFab, fg: '#fff', onClick: run(onResolve),
    },
    { key: 'where', label: 'Find everyone', icon: <NavigationArrow size={17} weight="fill" />, accent: myColor, fg: onAccent, onClick: run(onWhere) },
    { key: 'nudge', label: 'Send a message', icon: <Sparkle size={17} weight="fill" />, accent: myColor, fg: onAccent, onClick: run(onNudge) },
    { key: 'spotify', label: 'Discover artists', icon: <MusicNotes size={17} weight="fill" />, accent: spotifyDot, fg: '#06210f', onClick: run(onSpotify) },
    { key: 'party', label: 'Party mode', icon: <Moon size={17} weight="fill" />, accent: myColor, fg: onAccent, onClick: run(onParty) },
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
          onClick={() => { if (hold.current.flipped) { hold.current.flipped = false; return; } setMenuOpen(o => { const next = !o; if (next) onOpen?.(); return next; }); }}
          onPointerDown={fabDown} onPointerUp={fabUp} onPointerLeave={fabUp} onPointerCancel={fabUp}
          aria-haspopup="true" aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close actions' : (anyNew ? 'Open actions — new activity' : 'Open actions')}
          title="Press and hold to move to the other corner"
          style={{ position: 'relative', pointerEvents: hidden ? 'none' : 'auto', touchAction: 'none', width: 56, height: 56, borderRadius: '50%', border: 'none', backgroundColor: myColor, color: onAccent, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 10px 24px ${myColor}59` }}>
          {/* One Plus that rotates 45° into an X when open (rendering an X *and*
              rotating would land back on a +). */}
          <span style={{ display: 'inline-flex', transform: menuOpen ? 'rotate(45deg)' : 'none', transition: 'transform var(--dur-base) var(--ease-out)' }}>
            <Plus size={24} weight="bold" />
          </span>
          {/* New-activity dots — one per alerting category, coloured to match it
              (overlap / message / location). Only while collapsed. */}
          {!menuOpen && anyNew && (
            <span aria-hidden="true" style={{ position: 'absolute', top: -3, right: -3, display: 'inline-flex', gap: 3, padding: 3, borderRadius: 999, backgroundColor: bar, boxShadow: `0 0 0 2px ${bar}` }}>
              {newActivity.overlap && <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: NOTIF.overlap }} />}
              {newActivity.message && <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: NOTIF.message }} />}
              {locColors.length > 0 && <span style={{ width: 8, height: 8, borderRadius: '50%', background: locBg }} />}
            </span>
          )}
        </button>
      </div>

      {/* The bar */}
      <div style={{ pointerEvents: 'auto', backgroundColor: bar, borderTop: '1px solid #20284a', borderTopLeftRadius: rPill, borderTopRightRadius: rPill, boxShadow: shBar, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* minHeight 157 matches the Itinerary bar (its taller scrubber row) so
            both bottom bars are the same height; space-between anchors the view
            switch to the bottom while Row 1 stays aligned with the Itinerary bar. */}
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '12px 16px 14px', minHeight: 157, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>

          {/* Row 1 — Person · Day · Tabs, all on one line (scrolls if too narrow
              so the bar height never grows). */}
          <div className="no-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'nowrap', overflowX: 'auto' }}>
            <button onClick={onPerson} aria-haspopup="dialog" aria-label={`Signed in as ${activePerson}. Tap for account.`} style={{ ...chipStyle, flexShrink: 0 }}>
              <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: myColor, color: onAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>{activePerson[0]}</span>
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activePerson}</span>
              <CaretDown size={13} weight="bold" color={muted} />
            </button>
            <button onClick={onDay} aria-haspopup="dialog" aria-label={`Day: ${dayLabel}. Tap to switch.`} style={{ ...chipStyle, ...mono, fontSize: 13, flexShrink: 0 }}>
              <span style={{ color: myColor, fontWeight: 700 }}>{dayLabel}</span>
              <CaretDown size={13} weight="bold" color={muted} />
            </button>
            <TabPills tabs={tabs} activeTab={activeTab} onSelectTab={onSelectTab}
              activeBg={myColor} activeInk={onAccent} chipBg={paper} chipBorder="#243056" chipInk={ink} />
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
