import { memo, useRef } from 'react';
import { ArrowCounterClockwise, X, Clock } from '@phosphor-icons/react';
import { STAGES } from '../../data/lineup.js';
import { mono, sans, ink, muted, rule, tmrwBg, tmrwGold, bodyMuted } from './theme.js';
import { normSpan, minToLabel, snap } from './time.js';

const norm = (v) => v || null;
const same = (a, b) => norm(a?.start) === norm(b?.start) && norm(a?.end) === norm(b?.end);
const hasTime = (v) => Boolean(v?.start && v?.end);

// One draggable block on the stage's vertical time axis. Drag the body to move
// the set (keeping its duration); drag the top/bottom grip to change start/end.
// All movement snaps to 5 min and is clamped to the day window. Tapping (no
// drag) selects the block to reveal its typed editor.
const CalBlock = memo(function CalBlock({ set, value, color, winLo, winHi, pxPerMin, selected, onSet, onSelect }) {
  const drag = useRef(null);
  const [st, en] = normSpan({ start: value.start, end: value.end });
  const top = (st - winLo) * pxPerMin;
  const height = Math.max((en - st) * pxPerMin, 22);

  const begin = (kind) => (e) => {
    e.stopPropagation();
    drag.current = { kind, startY: e.clientY, st0: st, en0: en, moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 4) d.moved = true;
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
  const end = (e) => {
    const d = drag.current;
    drag.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    if (d && !d.moved) onSelect(selected ? null : set.id);
  };

  const grip = { position: 'absolute', left: 0, right: 0, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'ns-resize', touchAction: 'none' };
  const gripBar = { width: 26, height: 3, borderRadius: 2, backgroundColor: `${color}cc` };

  return (
    <div
      onPointerDown={begin('move')} onPointerMove={move} onPointerUp={end}
      role="button" aria-label={`${set.name}, ${value.start}–${value.end}. Drag to reschedule, or tap to type the time.`}
      style={{
        position: 'absolute', top, height, left: 4, right: 4, boxSizing: 'border-box',
        backgroundColor: `${color}33`, borderLeft: `3px solid ${color}`, borderRadius: 6,
        boxShadow: selected ? `0 0 0 2px ${color}, 0 4px 14px rgba(0,0,0,0.4)` : 'none',
        cursor: 'grab', touchAction: 'none', overflow: 'hidden', userSelect: 'none',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 10px',
      }}>
      {/* top resize grip — change start */}
      <div onPointerDown={begin('start')} onPointerMove={move} onPointerUp={end} data-handle="start" style={{ ...grip, top: 0 }} aria-hidden="true">
        <span style={gripBar} />
      </div>
      <div style={{ ...sans, fontSize: 12, fontWeight: 700, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{set.name}</div>
      <div style={{ ...mono, fontSize: 10, color: bodyMuted, marginTop: 1 }}>{value.start} – {value.end}</div>
      {/* bottom resize grip — change end */}
      <div onPointerDown={begin('end')} onPointerMove={move} onPointerUp={end} data-handle="end" style={{ ...grip, bottom: 0 }} aria-hidden="true">
        <span style={gripBar} />
      </div>
    </div>
  );
});

// The per-stage vertical calendar shown when a stage section is expanded in the
// Time view's edit mode. Renders the typed editor for the selected set, the
// time-axis grid with draggable blocks, and a list of any sets without a time
// yet (assign one via the typed inputs and they join the calendar).
export default function StageCalendar({
  stage, sets, draft, official, winLo, winHi, pxPerMin,
  selectedId, onSelect, onSet, onField, onReset,
}) {
  const color = STAGES[stage]?.color || tmrwGold;
  const valueOf = (s) => draft[s.id] ?? { start: s.start || null, end: s.end || null };

  const placed = sets.filter(s => hasTime(valueOf(s)));
  const tba = sets.filter(s => !hasTime(valueOf(s)));
  const height = (winHi - winLo) * pxPerMin;

  // Hour gridlines across the day window.
  const ticks = [];
  for (let t = Math.ceil(winLo / 60) * 60; t <= winHi; t += 60) ticks.push(t);

  const selected = selectedId && sets.some(s => s.id === selectedId) ? sets.find(s => s.id === selectedId) : null;
  const selVal = selected ? valueOf(selected) : null;
  const selChanged = selected && official.get(selected.id) && !same(selVal, official.get(selected.id));

  const timeInput = {
    ...mono, fontSize: 13, color: ink, backgroundColor: tmrwBg,
    border: `1px solid ${rule}`, borderRadius: 6, padding: '7px 8px', minHeight: 40, colorScheme: 'dark', width: 96,
  };

  return (
    <div style={{ borderTop: `1px solid ${rule}`, padding: 12 }}>
      {/* Typed editor for the selected set — the precise / accessible path. */}
      {selected ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12, padding: '10px 12px', borderRadius: 8, border: `1px solid ${color}66`, backgroundColor: tmrwBg }}>
          <span style={{ ...sans, fontSize: 13, fontWeight: 700, color: ink, flex: '1 1 100px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.name}</span>
          <input type="time" aria-label={`${selected.name} start time`} value={selVal.start || ''} onChange={(e) => onField(selected.id, 'start', e.target.value)} style={timeInput} />
          <span aria-hidden="true" style={{ color: muted }}>–</span>
          <input type="time" aria-label={`${selected.name} end time`} value={selVal.end || ''} onChange={(e) => onField(selected.id, 'end', e.target.value)} style={timeInput} />
          {selChanged && (
            <button type="button" onClick={() => onReset(selected.id)} aria-label={`Reset ${selected.name} to the official time`} title="Reset to official time"
              style={{ minWidth: 40, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: muted }}>
              <ArrowCounterClockwise size={16} weight="bold" />
            </button>
          )}
          <button type="button" onClick={() => onSelect(null)} aria-label="Done editing this set"
            style={{ minWidth: 40, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: 'pointer', color: muted }}>
            <X size={16} weight="bold" />
          </button>
        </div>
      ) : (
        <div style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.04em', marginBottom: 10 }}>
          Drag a set to reschedule · drag its ends to trim · tap to type
        </div>
      )}

      {/* Time-axis grid */}
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

      {/* Sets without a time yet — assign one and they appear on the calendar. */}
      {tba.length > 0 && (
        <div style={{ marginTop: placed.length > 0 ? 16 : 0 }}>
          <div style={{ ...mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: muted, marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Clock size={12} weight="regular" /> No set time yet
          </div>
          {tba.map(s => {
            const v = valueOf(s);
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', padding: '8px 0' }}>
                <span style={{ ...sans, fontSize: 13, fontWeight: 600, color: ink, flex: '1 1 100px', minWidth: 0 }}>{s.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="time" aria-label={`${s.name} start time`} value={v.start || ''} onChange={(e) => onField(s.id, 'start', e.target.value)} style={timeInput} />
                  <span aria-hidden="true" style={{ color: muted }}>–</span>
                  <input type="time" aria-label={`${s.name} end time`} value={v.end || ''} onChange={(e) => onField(s.id, 'end', e.target.value)} style={timeInput} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
