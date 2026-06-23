import { memo, useEffect, useMemo, useState } from 'react';
import { Headphones, Clock, PencilSimple, Check, X, ArrowCounterClockwise } from '@phosphor-icons/react';
import { mono, muted, rule, paper, ink, tmrwBg, bodyMuted } from '../theme.js';
import { STAGES, sets as BASELINE } from '../../../data/lineup.js';
import ArtistRow from '../ArtistRow.jsx';

// The bundled lineup is the "official" baseline. We diff against it so "reset"
// truly restores the shipped time (independent of what's currently published),
// and so re-publishing an official time drops the override instead of pinning a
// redundant copy. Built once — the baseline never changes at runtime.
const OFFICIAL = new Map(BASELINE.map(s => [s.id, { start: s.start || null, end: s.end || null }]));
const norm = (v) => v || null;
const same = (a, b) => norm(a.start) === norm(b.start) && norm(a.end) === norm(b.end);

// One editable row: artist + stage on the left, native start/end time pickers on
// the right (the OS time wheel on mobile; they return "HH:MM", exactly what we
// store). A "reset to official" control appears only when the row differs from
// the bundled time.
const TimeEditorRow = memo(function TimeEditorRow({ set, value, official, onField, onReset }) {
  const stageColor = STAGES[set.stage]?.color || muted;
  const showReset = official && !same(value, official);
  const inputStyle = {
    ...mono, fontSize: 13, color: ink, backgroundColor: tmrwBg,
    border: `1px solid ${rule}`, borderRadius: 6, padding: '7px 8px',
    minHeight: 40, colorScheme: 'dark', width: 96,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '10px 14px', borderTop: `1px solid ${rule}55` }}>
      <div style={{ minWidth: 96, flex: '1 1 120px' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: ink, letterSpacing: '-0.01em' }}>{set.name}</div>
        <div style={{ ...mono, fontSize: 10, color: muted, marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: stageColor, display: 'inline-block' }} />
          {set.stage}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <input type="time" aria-label={`${set.name} start time`} value={value.start || ''}
          onChange={(e) => onField(set.id, 'start', e.target.value)} style={inputStyle} />
        <span aria-hidden="true" style={{ color: muted }}>–</span>
        <input type="time" aria-label={`${set.name} end time`} value={value.end || ''}
          onChange={(e) => onField(set.id, 'end', e.target.value)} style={inputStyle} />
        <button type="button" onClick={() => onReset(set.id)} aria-label={`Reset ${set.name} to the official time`}
          title="Reset to official time"
          style={{ minWidth: 40, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', cursor: showReset ? 'pointer' : 'default', color: showReset ? muted : 'transparent', padding: 0 }}
          disabled={!showReset}>
          <ArrowCounterClockwise size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
});

// TIME view. Read mode: the active person's picks for the day, in time order.
// Edit mode ("Edit times"): the full day's timetable, editable, staged until you
// publish the correction to everyone.
export default function TimeView({
  timeline, dayHasTimes, activePerson, dayLabel, rowProps,
  activeDay, myColor, editTimes, setEditTimes, daySets, overrides, publishOverrides, notify,
}) {
  // Staged edits: setId → { start, end }. Holds only rows the user has touched.
  const [draft, setDraft] = useState({});
  const [publishing, setPublishing] = useState(false);

  // Switching day (or leaving edit mode) abandons in-progress edits, so you
  // never accidentally publish edits made while looking at a different day.
  useEffect(() => { setDraft({}); }, [activeDay, editTimes]);

  const setMap = useMemo(() => new Map(daySets.map(s => [s.id, s])), [daySets]);

  const onField = (id, field, val) => {
    setDraft(d => {
      const s = setMap.get(id);
      const base = d[id] ?? { start: s?.start || null, end: s?.end || null };
      return { ...d, [id]: { ...base, [field]: val || null } };
    });
  };
  const onReset = (id) => {
    const off = OFFICIAL.get(id) || { start: null, end: null };
    setDraft(d => ({ ...d, [id]: { start: off.start, end: off.end } }));
  };

  // A row counts as a pending change when its displayed value differs from the
  // currently-published (effective) time — that's what will actually change for
  // the crew. Resetting an overridden set back to official counts too.
  const pending = useMemo(
    () => daySets.filter(s => draft[s.id] && !same(draft[s.id], { start: s.start, end: s.end })),
    [daySets, draft]
  );

  const doPublish = async () => {
    const merged = { ...overrides };
    for (const [id, val] of Object.entries(draft)) {
      const off = OFFICIAL.get(id) || { start: null, end: null };
      if (same(val, off)) {
        delete merged[id]; // back to the official time → drop the override
      } else {
        const patch = { ...(overrides[id] || {}) };
        if (val.start) patch.start = val.start; else delete patch.start;
        if (val.end) patch.end = val.end; else delete patch.end;
        merged[id] = patch;
      }
    }
    setPublishing(true);
    const ok = await publishOverrides(merged);
    setPublishing(false);
    if (ok) {
      setDraft({});
      setEditTimes(false);
      notify(`Published ${pending.length} set-time update${pending.length === 1 ? '' : 's'} to the crew`);
    } else {
      notify("Couldn't reach the server — try again when you're back online", { duration: 4000 });
    }
  };

  const toggle = (
    <button type="button" onClick={() => setEditTimes(v => !v)} aria-pressed={editTimes}
      style={{
        flexShrink: 0, minHeight: 36, padding: '0 12px', borderRadius: 8,
        border: `1px solid ${editTimes ? myColor : rule}`,
        backgroundColor: editTimes ? `${myColor}22` : 'transparent',
        color: editTimes ? myColor : muted, ...mono, fontSize: 10, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
      {editTimes ? <X size={13} weight="bold" /> : <PencilSimple size={13} weight="bold" />}
      {editTimes ? 'Done' : 'Edit times'}
    </button>
  );

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
      <span style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
        {editTimes ? `Edit set times · ${dayLabel}` : `${activePerson}'s plan · ${timeline.length} pick${timeline.length === 1 ? '' : 's'}`}
      </span>
      {toggle}
    </div>
  );

  // ── Edit mode: the full day's timetable, editable ──
  if (editTimes) {
    return (
      <div>
        {header}
        <div style={{ ...mono, fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: 12, padding: '10px 12px', border: `1px solid ${rule}`, borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
          <Clock size={15} weight="regular" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Fix a revised set time, then publish — every phone updates within a minute. Changes are shared with the whole crew.</span>
        </div>
        <section style={{ borderRadius: 10, border: `1px solid ${rule}`, overflow: 'hidden', backgroundColor: paper }}>
          {daySets.map(set => {
            const val = draft[set.id] ?? { start: set.start || null, end: set.end || null };
            return <TimeEditorRow key={set.id} set={set} value={val} official={OFFICIAL.get(set.id)} onField={onField} onReset={onReset} />;
          })}
        </section>

        {/* Sticky publish bar — appears once there's something to publish. */}
        {pending.length > 0 && (
          <div style={{ position: 'sticky', bottom: 'calc(8px + env(safe-area-inset-bottom))', marginTop: 12, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${myColor}66`, backgroundColor: '#0c1126', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
            <span style={{ ...mono, fontSize: 11, color: bodyMuted }}>
              {pending.length} change{pending.length === 1 ? '' : 's'} ready
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={() => setDraft({})} disabled={publishing}
                style={{ minHeight: 40, padding: '0 12px', border: 'none', background: 'none', color: muted, ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={doPublish} disabled={publishing}
                style={{ minHeight: 40, padding: '0 14px', borderRadius: 8, border: 'none', backgroundColor: myColor, color: tmrwBg, ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: publishing ? 'default' : 'pointer', opacity: publishing ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Check size={14} weight="bold" /> {publishing ? 'Publishing…' : 'Publish to crew'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Read mode ──
  if (timeline.length === 0) {
    return (
      <div>
        {header}
        <div style={{ textAlign: 'center', padding: '40px 16px', color: muted }}>
          <Headphones size={30} weight="regular" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14 }}>{activePerson} hasn't picked anyone for {dayLabel} yet.<br />Add some from the Stage tab.</div>
        </div>
      </div>
    );
  }
  return (
    <div>
      {header}
      {!dayHasTimes && (
        <div style={{ ...mono, fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: 12, padding: '10px 12px', border: `1px solid ${rule}`, borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
          <Clock size={15} weight="regular" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Set times not announced yet — showing alphabetically. This view becomes a chronological timeline (with overlap highlighting) once times drop.</span>
        </div>
      )}
      <section style={{ borderRadius: 10, border: `1px solid ${rule}`, overflow: 'hidden', backgroundColor: paper }}>
        {timeline.map(set => <ArtistRow key={set.id} {...rowProps(set)} showStage={true} />)}
      </section>
    </div>
  );
}
