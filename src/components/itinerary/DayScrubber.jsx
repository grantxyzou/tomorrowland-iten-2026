import { useRef, useState } from 'react';
import { mono, well, tmrwGold, caption } from '../lineup/theme.js';

// Trip timeline as discrete DAY stops (not minutes). Tap, drag, or arrow-key to
// pick a day; the tab shows only that day's card. Snaps to whole days — mirrors
// the old time scrubber's pointer-capture gesture and styling. Controlled: the
// parent owns `activeIdx`; every selection calls onSelect(idx).
export default function DayScrubber({ days, activeIdx, todayIdx, onSelect, outdoor = false }) {
  const trackRef = useRef(null);
  const [pressing, setPressing] = useState(false);
  const n = days.length;
  // Light surfaces in outdoor mode; dark tokens otherwise (same split as the old scrubber).
  const c = outdoor
    ? { track: '#cfd8ea', text: '#5b677f', gold: '#b8860b', ink: '#060c1c', thumb: '#ffffff' }
    : { track: well, text: caption, gold: tmrwGold, ink: '#ffffff', thumb: '#ffffff' };

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

  const active = days[activeIdx];
  const left = `${pct(activeIdx)}%`;

  return (
    <div style={{ padding: '2px 0' }}>
      {/* Active-day readout so the scrub target is always labeled. */}
      <div style={{ ...mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.gold, textAlign: 'center', marginBottom: 8, height: 12 }}>
        {active ? `${active.dayOfWeek.slice(0, 3)} · ${active.month} ${active.dateNum}` : ''}
      </div>

      {/* Track — full-height touch target wrapping the rail. role=slider carries
          keyboard support (arrows/Home/End) and announces the selected day. */}
      <div
        role="slider" tabIndex={0} aria-label="Trip day"
        aria-valuemin={0} aria-valuemax={n - 1} aria-valuenow={activeIdx}
        aria-valuetext={active ? `${active.dayOfWeek} ${active.month} ${active.dateNum}` : undefined}
        onKeyDown={onKey}
        onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
        style={{ position: 'relative', height: 26, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none', outline: 'none' }}>
        <div ref={trackRef} style={{ position: 'relative', width: '100%', height: 4, borderRadius: 2, background: c.track }}>
          {/* Filled portion up to the active day. */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: left, background: c.gold, borderRadius: 2, opacity: 0.85 }} />
          {/* Day stops — a dot per day; today gets a gold dot, the active one is
              hidden under the thumb. */}
          {days.map((d, i) => {
            const isToday = i === todayIdx;
            const isActive = i === activeIdx;
            return (
              <span key={d.dateNum} aria-hidden="true"
                style={{ position: 'absolute', left: `${pct(i)}%`, top: '50%', transform: 'translate(-50%,-50%)', width: 6, height: 6, borderRadius: '50%', background: isToday ? c.gold : c.track, border: isToday ? 'none' : `1px solid ${c.text}`, opacity: isActive ? 0 : 1 }} />
            );
          })}
          {/* Thumb */}
          <div style={{ position: 'absolute', left, top: '50%', transform: `translate(-50%,-50%) scale(${pressing ? 1.12 : 1})`, width: 18, height: 18, borderRadius: '50%', background: c.thumb, border: `2.5px solid ${c.gold}`, boxShadow: '0 2px 8px rgba(0,0,0,0.4)', transition: 'transform var(--dur-press) var(--ease-out)' }} />
        </div>
      </div>

      {/* Day-number labels under each stop (all July, so the number reads clean). */}
      <div style={{ position: 'relative', height: 12, marginTop: 8, ...mono, fontSize: 9, letterSpacing: '0.04em' }}>
        {days.map((d, i) => (
          <span key={d.dateNum} aria-hidden="true"
            style={{ position: 'absolute', left: `${pct(i)}%`, transform: i === 0 ? 'none' : i === n - 1 ? 'translateX(-100%)' : 'translateX(-50%)', color: i === activeIdx ? c.gold : (i === todayIdx ? c.ink : c.text), fontWeight: i === activeIdx ? 700 : 400 }}>
            {d.dateNum}
          </span>
        ))}
      </div>
    </div>
  );
}
