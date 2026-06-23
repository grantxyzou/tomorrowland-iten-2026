import { memo, useRef, useState } from 'react';
import { Clock, DotsThree } from '@phosphor-icons/react';
import { STAGES } from '../../data/lineup.js';
import { mono, sans, ink, muted, rule, tmrwBg, tmrwGold, bodyMuted } from './theme.js';
import { normSpan, minToLabel, snap } from './time.js';

const hasTime = (v) => Boolean(v?.start && v?.end);
const HOLD_MS = 350; // press-and-hold before a block arms for dragging (touch)

// One block on the stage's vertical time axis. TAP opens the time editor sheet;
// PRESS-AND-HOLD arms dragging — the body moves the set (keeping its duration),
// the top/bottom grip changes start/end. While charging, the block visibly
// compresses + rings; once armed it lifts. Movement before the hold completes
// is treated as a page scroll, so the timetable still scrolls normally.
const CalBlock = memo(function CalBlock({ set, value, color, winLo, winHi, pxPerMin, selected, onSet, onSelect }) {
  const drag = useRef(null);
  const elRef = useRef(null);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'charging' | 'armed'
  const [st, en] = normSpan({ start: value.start, end: value.end });
  const top = (st - winLo) * pxPerMin;
  const height = Math.max((en - st) * pxPerMin, 26);

  const arm = () => {
    const d = drag.current;
    if (!d || d.scrolling) return;
    d.armed = true;
    d.startY = d.lastY; // measure the drag from where the finger actually is now
    setPhase('armed');
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch {} }
    try { elRef.current?.setPointerCapture(d.pointerId); } catch {}
  };
  const begin = (kind) => (e) => {
    e.stopPropagation();
    const mouse = e.pointerType === 'mouse';
    drag.current = { kind, downY: e.clientY, startY: e.clientY, lastY: e.clientY, st0: st, en0: en, moved: false, armed: mouse, scrolling: false, pointerId: e.pointerId, timer: null };
    if (mouse) { setPhase('armed'); try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} }
    else { setPhase('charging'); drag.current.timer = setTimeout(arm, HOLD_MS); }
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    d.lastY = e.clientY;
    if (!d.armed) {
      if (Math.abs(e.clientY - d.downY) > 8) { d.scrolling = true; clearTimeout(d.timer); if (phase !== 'idle') setPhase('idle'); }
      return;
    }
    e.preventDefault();
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 3) d.moved = true;
    const dMin = snap(dy / pxPerMin, 5);
    let ns = d.st0, ne = d.en0;
    if (d.kind === 'move') {
      ns = d.st0 + dMin; ne = d.en0 + dMin;
      if (ns < winLo) { ne += winLo - ns; ns = winLo; }
      if (ne > winHi) { ns -= ne - winHi; ne = winHi; }
    } else if (d.kind === 'start') {
      ns = Math.min(Math.max(d.st0 + dMin, winLo), d.en0 - 5);
    } else {
      ne = Math.max(Math.min(d.en0 + dMin, winHi), d.st0 + 5);
    }
    onSet(set.id, { start: minToLabel(ns % 1440), end: minToLabel(ne % 1440) });
  };
  const finish = (e, cancelled) => {
    const d = drag.current;
    drag.current = null;
    if (d) clearTimeout(d.timer);
    setPhase('idle');
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    if (cancelled || !d) return;
    // A tap, or a hold that never actually dragged, opens the editor sheet.
    if (!d.moved && !d.scrolling) onSelect(selected ? null : set.id);
  };

  const armed = phase === 'armed';
  const charging = phase === 'charging';
  const grip = { position: 'absolute', left: 0, right: 0, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'ns-resize' };
  const gripBar = (edge) => ({ width: 28, height: 3, borderRadius: 2, backgroundColor: armed && drag.current?.kind === edge ? '#fff' : `${color}cc`, boxShadow: armed && drag.current?.kind === edge ? `0 0 6px ${color}` : 'none' });

  return (
    <div
      ref={elRef}
      onPointerDown={begin('move')} onPointerMove={move} onPointerUp={(e) => finish(e, false)} onPointerCancel={(e) => finish(e, true)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(selected ? null : set.id); } }}
      role="button" tabIndex={0}
      aria-label={`${set.name}, ${value.start}–${value.end}. Tap to edit the time, or press and hold to drag.`}
      style={{
        position: 'absolute', top, height, left: 4, right: 4, boxSizing: 'border-box',
        backgroundColor: armed ? `${color}59` : `${color}33`, borderLeft: `${armed ? 4 : 3}px solid ${color}`, borderRadius: 6,
        boxShadow: armed ? `0 12px 26px rgba(0,0,0,0.55), 0 0 0 2px ${color}`
          : charging ? `0 0 0 3px ${color}`
          : selected ? `0 0 0 2px ${color}, 0 4px 14px rgba(0,0,0,0.4)` : 'none',
        transform: armed ? 'scale(1.05)' : charging ? 'scale(0.97)' : 'none',
        transition: `transform ${charging ? HOLD_MS : 140}ms ease-out, box-shadow ${charging ? HOLD_MS : 140}ms ease-out, background-color 140ms ease-out`,
        zIndex: armed ? 6 : charging ? 5 : selected ? 2 : 1,
        cursor: armed ? 'grabbing' : 'grab',
        touchAction: armed ? 'none' : 'pan-y', overflow: 'hidden', userSelect: 'none',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 10px',
      }}>
      <DotsThree aria-hidden="true" size={16} weight="bold" color={armed ? ink : `${color}cc`} style={{ position: 'absolute', top: 3, right: 5 }} />
      {/* top resize grip — change start */}
      <div onPointerDown={begin('start')} onPointerMove={move} onPointerUp={(e) => finish(e, false)} onPointerCancel={(e) => finish(e, true)} data-handle="start" style={{ ...grip, top: 0, touchAction: armed ? 'none' : 'pan-y' }} aria-hidden="true">
        <span style={gripBar('start')} />
      </div>
      <div style={{ ...sans, fontSize: 12, fontWeight: 700, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 14 }}>{set.name}</div>
      <div style={{ ...mono, fontSize: 10, color: armed ? ink : bodyMuted, marginTop: 1 }}>{value.start} – {value.end}</div>
      {/* bottom resize grip — change end */}
      <div onPointerDown={begin('end')} onPointerMove={move} onPointerUp={(e) => finish(e, false)} onPointerCancel={(e) => finish(e, true)} data-handle="end" style={{ ...grip, bottom: 0, touchAction: armed ? 'none' : 'pan-y' }} aria-hidden="true">
        <span style={gripBar('end')} />
      </div>
    </div>
  );
});

// The per-stage vertical calendar shown when a stage section is expanded in the
// Time view's edit mode: the time-axis grid with draggable blocks, plus any sets
// without a time yet (tap one to set its time via the editor sheet).
export default function StageCalendar({
  stage, sets, draft, winLo, winHi, pxPerMin, selectedId, onSelect, onSet,
}) {
  const color = STAGES[stage]?.color || tmrwGold;
  const valueOf = (s) => draft[s.id] ?? { start: s.start || null, end: s.end || null };

  const placed = sets.filter(s => hasTime(valueOf(s)));
  const tba = sets.filter(s => !hasTime(valueOf(s)));
  const height = (winHi - winLo) * pxPerMin;

  const ticks = [];
  for (let t = Math.ceil(winLo / 60) * 60; t <= winHi; t += 60) ticks.push(t);

  return (
    <div style={{ borderTop: `1px solid ${rule}`, padding: 12 }}>
      <div style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.04em', marginBottom: 10 }}>
        Tap a set to edit its time · press &amp; hold to drag
      </div>

      {placed.length > 0 && (
        <div style={{ position: 'relative', height, marginLeft: 44 }}>
          {ticks.map(t => {
            const y = (t - winLo) * pxPerMin;
            return (
              <div key={t} style={{ position: 'absolute', top: y, left: -44, right: 0, height: 1, backgroundColor: `${rule}66` }}>
                <span style={{ position: 'absolute', left: 0, top: -6, ...mono, fontSize: 9, color: muted }}>{minToLabel(t % 1440)}</span>
              </div>
            );
          })}
          {placed.map(s => (
            <CalBlock key={s.id} set={s} value={valueOf(s)} color={color}
              winLo={winLo} winHi={winHi} pxPerMin={pxPerMin}
              selected={selectedId === s.id} onSet={onSet} onSelect={onSelect} />
          ))}
        </div>
      )}

      {/* Sets without a time yet — tap to assign one; they then join the grid. */}
      {tba.length > 0 && (
        <div style={{ marginTop: placed.length > 0 ? 16 : 0 }}>
          <div style={{ ...mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: muted, marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Clock size={12} weight="regular" /> No set time yet
          </div>
          {tba.map(s => (
            <button key={s.id} type="button" onClick={() => onSelect(s.id)}
              aria-label={`${s.name}, set time TBA. Tap to set a time.`}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', minHeight: 44, borderRadius: 8, border: `1px solid ${rule}`, backgroundColor: tmrwBg, cursor: 'pointer', marginBottom: 6 }}>
              <span style={{ ...sans, fontSize: 13, fontWeight: 600, color: ink, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              <span style={{ ...mono, fontSize: 10, color: muted, flexShrink: 0 }}>Set time</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
