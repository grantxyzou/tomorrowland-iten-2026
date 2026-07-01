import { useRef, useState } from 'react';
import { celestial } from './sky.js';
import { snap } from '../lineup/time.js';
import { mono, well, tmrwGold, caption } from '../lineup/theme.js';

const DAY_MIN = 1440;
const pct = (min) => (min / DAY_MIN) * 100;

// Draggable day timeline. Controlled: the parent owns the effective `minute`
// (live clock or scrubbed) and `isLive`. Dragging calls onScrub(min); the Sync
// control calls onSync() to snap back to the live clock. X-axis pointer drag
// with pointer capture mirrors the lineup's StageCalendar gesture.
export default function TimelineScrubber({ minute, onScrub, outdoor = false }) {
  const trackRef = useRef(null);
  const [pressing, setPressing] = useState(false);
  const body = celestial(outdoor ? 720 : minute);
  // Light surfaces in outdoor mode; dark tokens otherwise.
  const c = outdoor
    ? { track: '#cfd8ea', text: '#5b677f', gold: '#b8860b' }
    : { track: well, text: caption, gold: tmrwGold };

  const minuteFromClientX = (clientX) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r || !r.width) return minute;
    const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return Math.max(0, Math.min(DAY_MIN - 1, snap(f * DAY_MIN, 5)));
  };

  const begin = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setPressing(true);
    onScrub(minuteFromClientX(e.clientX));
  };
  const move = (e) => { if (pressing) onScrub(minuteFromClientX(e.clientX)); };
  const end = (e) => { e.currentTarget.releasePointerCapture?.(e.pointerId); setPressing(false); };

  const left = `${pct(minute)}%`;

  return (
    <div style={{ padding: '8px 0 2px' }}>
      {/* Mini celestial above the thumb (label + LIVE/SYNC now live in the banner) */}
      <div style={{ position: 'relative', height: 14, marginBottom: 5 }}>
        <div aria-hidden="true" style={{ position: 'absolute', left, top: '50%', transform: 'translate(-50%,-50%)', width: 12, height: 12, borderRadius: '50%', background: body.color, boxShadow: `0 0 8px ${body.glow}` }} />
      </div>

      {/* Track — full-height touch target wraps the 6px rail */}
      <div
        onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
        style={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none' }}>
        <div ref={trackRef} style={{ position: 'relative', width: '100%', height: 6, borderRadius: 3, background: c.track, overflow: 'visible' }}>
          {/* Gold active windows: 00:00–02:00 and 14:00–24:00 (festival hours) */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${pct(120)}%`, background: c.gold, borderRadius: 3, opacity: 0.85 }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pct(840)}%`, right: 0, background: `linear-gradient(to right, ${c.track}, ${c.gold} 12%)`, borderRadius: 3, opacity: 0.85 }} />
          {/* Thumb */}
          <div style={{ position: 'absolute', left, top: '50%', transform: `translate(-50%,-50%) scale(${pressing ? 1.12 : 1})`, width: 20, height: 20, borderRadius: '50%', background: '#fff', border: `2.5px solid ${c.gold}`, boxShadow: '0 2px 8px rgba(0,0,0,0.4)', transition: 'transform var(--dur-press) var(--ease-out)' }} />
        </div>
      </div>

      {/* Hour labels — absolutely placed at their exact track percentages so each
          sits under the thumb at that time (space-between insets the ends). */}
      <div style={{ position: 'relative', height: 12, marginTop: 8, ...mono, fontSize: 9, color: c.text, letterSpacing: '0.06em' }}>
        {[['00:00', 0], ['06:00', 25], ['12:00', 50], ['18:00', 75], ['24:00', 100]].map(([t, x]) => (
          <span key={t} style={{ position: 'absolute', left: `${x}%`, transform: x === 0 ? 'none' : x === 100 ? 'translateX(-100%)' : 'translateX(-50%)' }}>{t}</span>
        ))}
      </div>
    </div>
  );
}
