import { useEffect, useMemo, useState } from 'react';
import { Headphones, Clock, PencilSimple, Check, X, CaretRight } from '@phosphor-icons/react';
import { mono, display, muted, rule, paper, ink, tmrwBg, tmrwGold, bodyMuted, STAGE_ORDER } from '../theme.js';
import { STAGES, sets as BASELINE } from '../../../data/lineup.js';
import { normSpan } from '../time.js';
import ArtistRow from '../ArtistRow.jsx';
import StageCalendar from '../StageCalendar.jsx';

// The bundled lineup is the "official" baseline. We diff against it so "reset"
// truly restores the shipped time (independent of what's currently published),
// and so re-publishing an official time drops the override instead of pinning a
// redundant copy. Built once — the baseline never changes at runtime.
const OFFICIAL = new Map(BASELINE.map(s => [s.id, { start: s.start || null, end: s.end || null }]));
const norm = (v) => v || null;
const same = (a, b) => norm(a.start) === norm(b.start) && norm(a.end) === norm(b.end);

const PX_PER_MIN = 1.6; // a 60-min set ≈ 96px — a comfortable drag target

// TIME view. Read mode: the active person's picks for the day, in time order.
// Edit mode ("Edit times"): the day's timetable as collapsible per-stage
// calendars — drag set blocks to reschedule (or type exact times) — staged
// until you publish the correction to everyone.
export default function TimeView({
  timeline, dayHasTimes, activePerson, dayLabel, rowProps,
  activeDay, myColor, editTimes, setEditTimes, daySets, overrides, publishOverrides, notify,
}) {
  // Staged edits: setId → { start, end }. Holds only rows the user has touched.
  const [draft, setDraft] = useState({});
  const [publishing, setPublishing] = useState(false);
  const [openStages, setOpenStages] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState(null);

  // Switching day (or leaving edit mode) abandons in-progress edits, so you
  // never accidentally publish edits made while looking at a different day.
  useEffect(() => { setDraft({}); setSelectedId(null); }, [activeDay, editTimes]);

  const setMap = useMemo(() => new Map(daySets.map(s => [s.id, s])), [daySets]);

  // Set both ends at once (drag) or one field at a time (typed inputs).
  const onSet = (id, next) => setDraft(d => ({ ...d, [id]: { start: next.start || null, end: next.end || null } }));
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
  const toggleStage = (stage) => setOpenStages(prev => {
    const next = new Set(prev);
    next.has(stage) ? next.delete(stage) : next.add(stage);
    return next;
  });

  // Stages present today, in the canonical order, each with its sets.
  const stageGroups = useMemo(() => {
    const m = new Map();
    for (const s of daySets) { if (!m.has(s.stage)) m.set(s.stage, []); m.get(s.stage).push(s); }
    return STAGE_ORDER.filter(st => m.has(st)).map(st => ({ stage: st, sets: m.get(st) }));
  }, [daySets]);

  // Shared day window (normalized minutes, early-AM treated as late) so every
  // stage calendar uses the same vertical scale. Padded 30 min each side.
  const [winLo, winHi] = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const s of daySets) {
      if (s.start && s.end) { const [a, b] = normSpan(s); if (a < lo) lo = a; if (b > hi) hi = b; }
    }
    if (!isFinite(lo)) { lo = 14 * 60; hi = 26 * 60; } // sensible festival evening when no times yet
    return [lo - 30, hi + 30];
  }, [daySets]);

  // A row counts as a pending change when its displayed value differs from the
  // currently-published (effective) time — that's what will actually change for
  // the crew. Resetting an overridden set back to official counts too.
  const pendingIds = useMemo(() => {
    const ids = new Set();
    for (const s of daySets) {
      const d = draft[s.id];
      if (d && !same(d, { start: s.start, end: s.end })) ids.add(s.id);
    }
    return ids;
  }, [daySets, draft]);

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
      const n = pendingIds.size;
      setDraft({}); setSelectedId(null); setEditTimes(false);
      notify(`Published ${n} set-time update${n === 1 ? '' : 's'} to the crew`);
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

  // ── Edit mode: collapsible per-stage drag calendars ──
  if (editTimes) {
    return (
      <div>
        {header}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, ...mono, fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: 12, padding: '10px 12px', border: `1px solid ${rule}`, borderRadius: 8 }}>
          <span style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
            <Clock size={15} weight="regular" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Expand a stage and drag a set to fix its time, then publish — shared with the whole crew.</span>
          </span>
          {stageGroups.length > 1 && (
            <button type="button" onClick={() => setOpenStages(openStages.size >= stageGroups.length ? new Set() : new Set(stageGroups.map(g => g.stage)))}
              style={{ flexShrink: 0, minHeight: 36, padding: '0 4px', border: 'none', background: 'none', color: myColor, ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
              {openStages.size >= stageGroups.length ? 'Collapse all' : 'Expand all'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stageGroups.map(({ stage, sets: stageSets }) => {
            const color = STAGES[stage]?.color || tmrwGold;
            const open = openStages.has(stage);
            const edited = stageSets.some(s => pendingIds.has(s.id));
            return (
              <section key={stage} style={{ borderRadius: 10, border: `1px solid ${rule}`, overflow: 'hidden', backgroundColor: paper }}>
                <button onClick={() => toggleStage(stage)} aria-expanded={open}
                  aria-label={`${stage}, ${stageSets.length} sets${edited ? ', edited' : ''}`}
                  style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', minHeight: 44, border: 'none', background: 'none' }}>
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
                  <span aria-hidden="true" style={{ ...display, fontSize: 16, fontWeight: 700, color: ink, letterSpacing: '0.01em', flex: 1 }}>{stage}</span>
                  {edited && <span aria-hidden="true" title="Edited" style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: myColor }} />}
                  <span aria-hidden="true" style={{ ...mono, fontSize: 11, color: muted }}>{stageSets.length}</span>
                  <CaretRight aria-hidden="true" size={14} weight="bold" color={muted} style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease-in-out)' }} />
                </button>
                {open && (
                  <StageCalendar
                    stage={stage} sets={stageSets} draft={draft} official={OFFICIAL}
                    winLo={winLo} winHi={winHi} pxPerMin={PX_PER_MIN}
                    selectedId={selectedId} onSelect={setSelectedId}
                    onSet={onSet} onField={onField} onReset={onReset}
                  />
                )}
              </section>
            );
          })}
        </div>

        {/* Sticky publish bar — appears once there's something to publish. */}
        {pendingIds.size > 0 && (
          <div style={{ position: 'sticky', bottom: 'calc(8px + env(safe-area-inset-bottom))', marginTop: 12, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${myColor}66`, backgroundColor: '#0c1126', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
            <span style={{ ...mono, fontSize: 11, color: bodyMuted }}>
              {pendingIds.size} change{pendingIds.size === 1 ? '' : 's'} ready
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={() => { setDraft({}); setSelectedId(null); }} disabled={publishing}
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
