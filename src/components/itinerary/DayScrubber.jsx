import { useRef, useState } from 'react';
import { mono, well, tmrwGold, caption } from '../lineup/theme.js';

// Horizontal inset so the thumb has travel room and never sits against the bar
// edge. The rail, ticks, and labels all live inside this padding, so their
// percentage positions line up.
const INSET = 18;

// Trip timeline as discrete DAY stops (not minutes). Tap, drag, or arrow-key to
// pick a day; the tab shows only that day's card. Snaps to whole days — mirrors
// the old time scrubber's pointer-capture gesture. Controlled: the parent owns
// `activeIdx`; every selection calls onSelect(idx). We deliberately DON'T show the
// selected date here — the day's card already carries its date chip.
export default function DayScrubber({ days, activeIdx, todayIdx, onSelect, outdoor = false }) {
  const trackRef = useRef(null);
  const [pressing, setPressing] = useState(false);
  const n = days.length;
  // Light surfaces in outdoor mode; dark tokens otherwise.
  const c = outdoor
    ? { rail: '#cfd8ea', tick: '#8496b4', text: '#5b677f', gold: '#b8860b', thumb: '#ffffff' }
    : { rail: well, tick: caption, text: caption, gold: tmrwGold, thumb: '#ffffff' };

  const pct = (i) => (n <= 1 ? 0 : (i / (n - 1)) * 100);

  const idxFromClientX = (clientX) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r || !r.width) return activeIdx;
    const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return Math.round(f * (n - 1));
  };

  const begin = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setPressing(true);
    onSelect(idxFromClientX(e.clientX));
  };
  const move = (e) => { if (pressing) onSelect(idxFromClientX(e.clientX)); };
  const end = (e) => { e.currentTarget.releasePointerCapture?.(e.pointerId); setPressing(false); };

  const onKey = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onSelect(Math.max(0, activeIdx - 1)); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onSelect(Math.min(n - 1, activeIdx + 1)); }
    else if (e.key === 'Home') { e.preventDefault(); onSelect(0); }
    else if (e.key === 'End') { e.preventDefault(); onSelect(n - 1); }
  };

  // Only some days get a NUMBER label — endpoints plus an even step so ~5 show,
  // never all of them (cramped on mobile). Every day still has a tick + is a stop.
  const step = Math.max(1, Math.ceil((n - 1) / 5));
  const labelled = (i) => i === 0 || i === n - 1 || i % step === 0;

  const active = days[activeIdx];

  return (
    <div style={{ padding: '4px 0 2px' }}>
      {/* Track — a tall touch target so it's easy to grab and so the row height
          matches the Lineup view-switch row. role=slider carries keyboard support
          (arrows/Home/End) and announces the selected day. */}
      <div
        role="slider" tabIndex={0} aria-label="Trip day"
        aria-valuemin={0} aria-valuemax={n - 1} aria-valuenow={activeIdx}
        aria-valuetext={active ? `${active.dayOfWeek} ${active.month} ${active.dateNum}` : undefined}
        onKeyDown={onKey}
        onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
        style={{ position: 'relative', height: 44, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none', outline: 'none' }}>
        {/* Rail — inset from both ends by INSET so the thumb travels inside. The
            ticks, fill, and thumb all live inside it, so they share its % space. */}
        <div ref={trackRef} style={{ position: 'absolute', left: INSET, right: INSET, top: '50%', transform: 'translateY(-50%)', height: 5, borderRadius: 3, background: c.rail }}>
          {/* Filled portion up to the active day. */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${pct(activeIdx)}%`, background: c.gold, borderRadius: 3, opacity: 0.85 }} />
          {/* One tick per day — thin marks, so day granularity reads without
              numbers. Today is a gold dot; the active day hides under the thumb. */}
          {days.map((d, i) => {
            const isToday = i === todayIdx;
            const isActive = i === activeIdx;
            return (
              <span key={d.dateNum} aria-hidden="true"
                style={{ position: 'absolute', left: `${pct(i)}%`, top: '50%', transform: 'translate(-50%,-50%)', width: isToday ? 7 : 2, height: isToday ? 7 : 9, borderRadius: isToday ? '50%' : 1, background: isToday ? c.gold : c.tick, opacity: isActive ? 0 : (isToday ? 1 : 0.55) }} />
            );
          })}
          {/* Thumb — same inset % space as the rail; overflows the 5px rail freely. */}
          <div style={{ position: 'absolute', left: `${pct(activeIdx)}%`, top: '50%', transform: `translate(-50%,-50%) scale(${pressing ? 1.1 : 1})`, width: 22, height: 22, borderRadius: '50%', background: c.thumb, border: `2.5px solid ${c.gold}`, boxShadow: '0 2px 8px rgba(0,0,0,0.45)', transition: 'transform var(--dur-press) var(--ease-out)' }} />
        </div>
      </div>

      {/* Increment labels — a sparse scale (endpoints + every few days), inset to
          match the rail. The card shows the exact date, so this is just a ruler. */}
      <div style={{ position: 'relative', height: 13, margin: `4px ${INSET}px 0`, ...mono, fontSize: 10, letterSpacing: '0.04em' }}>
        {days.map((d, i) => labelled(i) ? (
          <span key={d.dateNum} aria-hidden="true"
            style={{ position: 'absolute', left: `${pct(i)}%`, transform: i === 0 ? 'none' : i === n - 1 ? 'translateX(-100%)' : 'translateX(-50%)', color: i === activeIdx ? c.gold : c.text, fontWeight: i === activeIdx ? 700 : 400 }}>
            {d.dateNum}
          </span>
        ) : null)}
      </div>
    </div>
  );
}
