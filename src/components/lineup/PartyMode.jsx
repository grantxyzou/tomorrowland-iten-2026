import { useState, useEffect, useMemo, useRef } from 'react';
import { sets, STAGES, PEOPLE } from '../../data/lineup.js';
import { sans, mono, clashRed, PERSON_COLORS, DAYS } from './theme.js';
import { hasTime, timeLabel, sortKey, normSpan, fmtClock } from './time.js';

// Apple-Calendar-style day grid for the rest of the plan ("Later"). Picked sets
// are laid out proportionally by time; overlapping picks sit side-by-side with a
// red outline so a conflict is obvious at a glance. Tap a block to select it,
// then a big "Remove from plan" button appears — two-step so a tired late-night
// tap can't accidentally drop a set.
function LaterTimeline({ sets: later, onRemove, surf, line, txt, dim, gold }) {
  const [selectedId, setSelectedId] = useState(null);
  const selectedRef = useRef(null);

  const timed = later.filter(hasTime);
  const untimed = later.filter(s => !hasTime(s));
  const selected = timed.find(s => s.id === selectedId) || null;

  // Pull the focused block into view so it isn't stranded behind the sheet.
  useEffect(() => {
    if (selectedId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [selectedId]);

  const PX_PER_MIN = 1.2; // ≈ 72px per hour — roomy enough to read while tired
  const GUTTER = 46;      // left column for the hour labels
  const MIN_H = 56;       // reserve room for a name line + the stage label

  let grid = null;
  if (timed.length > 0) {
    // Lay each set out by its normalised [start, end]; round bounds to the hour.
    const items = timed
      .map(s => { const [st, en] = normSpan(s); return { s, st, en }; })
      .sort((a, b) => a.st - b.st || a.en - b.en);
    const startHour = Math.floor(Math.min(...items.map(x => x.st)) / 60) * 60;
    const endHour = Math.ceil(Math.max(...items.map(x => x.en)) / 60) * 60;
    const totalH = (endHour - startHour) * PX_PER_MIN;

    const hours = [];
    for (let m = startHour; m <= endHour; m += 60) hours.push(m);

    // Greedy column packing: place each set in the first free column.
    const colEnds = [];
    items.forEach(it => {
      let col = colEnds.findIndex(end => end <= it.st);
      if (col === -1) { col = colEnds.length; colEnds.push(it.en); }
      else colEnds[col] = it.en;
      it.col = col;
    });
    // Within each overlap cluster, share the width across its columns.
    for (let i = 0; i < items.length;) {
      let j = i, clusterEnd = items[i].en;
      while (j + 1 < items.length && items[j + 1].st < clusterEnd) {
        j++; clusterEnd = Math.max(clusterEnd, items[j].en);
      }
      const cols = Math.max(...items.slice(i, j + 1).map(x => x.col)) + 1;
      for (let k = i; k <= j; k++) items[k].cols = cols;
      i = j + 1;
    }

    const hourLabel = (m) => String(Math.floor((m % 1440) / 60)).padStart(2, '0') + ':00';

    grid = (
      <div style={{ position: 'relative', height: totalH, marginTop: 6 }}>
        {hours.map(m => {
          const top = (m - startHour) * PX_PER_MIN;
          return (
            <div key={m} aria-hidden="true">
              <div style={{ position: 'absolute', left: GUTTER, right: 0, top, borderTop: `1px solid ${line}` }} />
              <span style={{ position: 'absolute', left: 0, top: top - 7, ...mono, fontSize: 11, color: dim }}>{hourLabel(m)}</span>
            </div>
          );
        })}
        {items.map(({ s, st, en, col, cols }) => {
          const top = (st - startHour) * PX_PER_MIN;
          const h = Math.max((en - st) * PX_PER_MIN, MIN_H);
          const stageColor = STAGES[s.stage]?.color || gold;
          const clash = cols > 1;
          const sel = s.id === selectedId;
          return (
            <button key={s.id} aria-pressed={sel} ref={sel ? selectedRef : null}
              aria-label={`${s.name}, ${timeLabel(s)}, ${s.stage}${clash ? ', overlaps another pick' : ''}. Tap to remove.`}
              onClick={() => setSelectedId(sel ? null : s.id)}
              style={{
                position: 'absolute', top,
                left: `calc(${GUTTER}px + ${col} * (100% - ${GUTTER}px) / ${cols} + 2px)`,
                width: `calc((100% - ${GUTTER}px) / ${cols} - 4px)`,
                height: h - 2, overflow: 'hidden', textAlign: 'left', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 3,
                backgroundColor: sel ? '#1d2a55' : surf, color: txt, borderRadius: 10, padding: '7px 9px',
                border: sel ? `2px solid ${gold}` : clash ? `1px solid ${clashRed}` : `1px solid ${line}`,
                borderLeft: `4px solid ${stageColor}`,
                boxShadow: sel ? `0 0 0 3px ${gold}55, 0 6px 20px rgba(6,9,24,0.5)` : 'none',
                zIndex: sel ? 59 : 'auto', ...sans,
              }}>
              {/* affordance: this block has actions */}
              <span aria-hidden="true" style={{ position: 'absolute', top: 5, right: 7, ...mono, fontSize: 14, fontWeight: 700, lineHeight: 1, color: dim }}>⋯</span>
              <div style={{ flex: '1 1 auto', minHeight: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.12, paddingRight: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.name}</div>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, ...mono, fontSize: 10, color: dim, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: stageColor, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.stage}</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {timed.length > 0 && !selected && (
        <div style={{ ...mono, fontSize: 11, color: dim, marginTop: 4, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span aria-hidden="true">⋯</span> Tap a set to remove it
        </div>
      )}
      {grid}
      {untimed.map(s => (
        <div key={s.id} style={{ marginTop: 8, backgroundColor: surf, border: `1px solid ${line}`, borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: txt, ...sans }}>{s.name}</div>
          <div style={{ ...mono, fontSize: 11, color: dim, marginTop: 3 }}>{s.stage} · Set time TBA</div>
        </div>
      ))}
      {selected && (
        <>
          {/* Scrim — dims everything, taps to dismiss; the focused block pokes
              through above it (zIndex 59) so it stays spotlit. */}
          <div onClick={() => setSelectedId(null)} aria-hidden="true" className="fx-fade"
            style={{ position: 'fixed', inset: 0, zIndex: 58, backgroundColor: 'rgba(6,9,24,0.62)' }} />
          {/* Bottom action sheet — anchored to the viewport so it's always fully
              on-screen, clear of the home indicator. */}
          <div role="region" aria-label="Remove set from plan" className="fx-fade"
            style={{
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60,
              backgroundColor: surf, borderTop: `3px solid ${clashRed}`,
              borderTopLeftRadius: 18, borderTopRightRadius: 18,
              boxShadow: '0 -10px 40px rgba(6,9,24,0.6)',
              padding: '16px max(16px, env(safe-area-inset-right)) calc(16px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
            }}>
            <div style={{ maxWidth: 520, margin: '0 auto' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: txt, lineHeight: 1.15, ...sans }}>{selected.name}</div>
              <div style={{ ...mono, fontSize: 12, color: dim, marginTop: 6, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: STAGES[selected.stage]?.color || gold }} />
                  {selected.stage}
                </span>
                <span style={{ color: gold, fontWeight: 700 }}>{selected.start}–{selected.end}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={() => { onRemove(selected); setSelectedId(null); }}
                  style={{ flex: 2, minHeight: 52, borderRadius: 12, border: 'none', backgroundColor: clashRed, color: '#1a0c0c', ...sans, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                  ✕ Remove from plan
                </button>
                <button onClick={() => setSelectedId(null)}
                  style={{ flex: 1, minHeight: 52, borderRadius: 12, border: `1px solid ${line}`, backgroundColor: 'transparent', color: txt, ...sans, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Party mode ───────────────────────────────────────────────
// Full-screen, high-contrast, large-type "where do I go next" view for use at
// the festival at night. Dormant set times mean it shows the ordered plan;
// once real times drop, NOW / NEXT light up against the live clock.
export default function PartyMode({ activePerson, setActivePerson, activeDay, setActiveDay, picks, togglePick, onExit }) {
  // The clock only shows HH:MM, so tick once per minute (aligned to the
  // boundary) instead of every second — far less re-rendering / battery use.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer;
    const schedule = () => {
      setNow(new Date());
      timer = setTimeout(schedule, 60000 - (Date.now() % 60000));
    };
    timer = setTimeout(schedule, 60000 - (Date.now() % 60000));
    return () => clearTimeout(timer);
  }, []);

  // Full-screen overlay: Escape exits, and the page behind is scroll-locked for
  // party mode's whole lifetime (mirrors the ItineraryTab ticket-modal pattern).
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onExit(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onExit]);

  // Cage night — cool deep navy + molten gold (matches the Lineup theme).
  const bg = '#0a0f24', surf = '#141d3e', line = '#2a386b';
  const txt = '#ffffff', gold = '#ecc766', dim = '#9aa6c8';

  const dayHasTimes = useMemo(() => sets.some(s => s.day === activeDay && hasTime(s)), [activeDay]);
  const plan = useMemo(() => {
    const arr = sets.filter(s => s.day === activeDay && picks[s.id]?.[activePerson]);
    if (dayHasTimes) arr.sort((a, b) => sortKey(a) - sortKey(b) || a.name.localeCompare(b.name));
    else arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [activeDay, activePerson, picks, dayHasTimes]);

  // Live current / next, only meaningful once set times exist. A person can
  // have overlapping picks (a clash), so "on now" is a list, not a single set.
  let nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin < 360) nowMin += 1440;
  const currents = [];
  let nextUp = null;
  if (dayHasTimes) {
    for (const s of plan) {
      const [st, en] = normSpan(s);
      if (nowMin >= st && nowMin < en) currents.push(s);
      else if (st > nowMin && (!nextUp || st < normSpan(nextUp)[0])) nextUp = s;
    }
  }
  const later = plan.filter(s => !currents.includes(s) && s !== nextUp);
  const dayLabel = DAYS.find(d => d.id === activeDay)?.label || '';
  const onRemove = (s) => togglePick(s.id, activePerson);

  const card = (s, badge, badgeColor, big) => {
    const stageColor = STAGES[s.stage]?.color || gold;
    return (
      <div key={s.id} style={{ backgroundColor: surf, border: `1px solid ${line}`, borderRadius: 14, padding: big ? '18px 18px' : '14px 16px' }}>
        {badge && (
          <div style={{ ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: badgeColor, marginBottom: 6 }}>{badge}</div>
        )}
        <div style={{ fontSize: big ? 30 : 21, fontWeight: 700, color: txt, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{s.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: stageColor, display: 'inline-block' }} />
            <span style={{ ...mono, fontSize: big ? 15 : 13, color: dim }}>{s.stage}</span>
          </span>
          <span style={{ ...mono, fontSize: big ? 15 : 13, fontWeight: 700, color: hasTime(s) ? gold : dim }}>{timeLabel(s)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fx-fade" style={{
      position: 'fixed', inset: 0, zIndex: 55, overflowY: 'auto', backgroundColor: bg, color: txt,
      padding: '0 max(16px, env(safe-area-inset-right)) calc(28px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
      ...sans,
    }}>
      {/* Sticky header — the clock + exit stay reachable while the plan scrolls */}
      <div style={{ position: 'sticky', top: 0, zIndex: 2, backgroundColor: bg, borderBottom: `1px solid ${line}`, paddingTop: 'calc(14px + env(safe-area-inset-top))', paddingBottom: 14, marginBottom: 18 }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: gold }}>🌙 Party mode</span>
            <button onClick={onExit} aria-label="Exit party mode"
              style={{ minHeight: 44, padding: '0 16px', borderRadius: 999, border: `1px solid ${line}`, backgroundColor: surf, color: txt, ...mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
              ✕ Exit
            </button>
          </div>
          {/* Live clock */}
          <div style={{ textAlign: 'center' }}>
            <div role="status" aria-label={`Current time, ${fmtClock(now)}`} style={{ ...mono, fontSize: 'clamp(44px, 15vw, 72px)', fontWeight: 700, color: gold, lineHeight: 1, letterSpacing: '0.02em' }}>
              {fmtClock(now)}
            </div>
            <div style={{ ...mono, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: dim, marginTop: 6 }}>
              {dayLabel} · {activePerson}'s night
            </div>
          </div>
        </div>
      </div>

      {/* Scrolling body */}
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {/* Person + day switchers — big, thumb-friendly */}
        <div role="tablist" aria-label="Who" style={{ display: 'flex', gap: 8 }}>
          {PEOPLE.map(p => {
            const a = p === activePerson;
            return (
              <button key={p} role="tab" aria-selected={a} onClick={() => setActivePerson(p)}
                style={{ flex: 1, minHeight: 54, borderRadius: 12, border: `1.5px solid ${a ? PERSON_COLORS[p] : line}`, backgroundColor: a ? PERSON_COLORS[p] : 'transparent', color: a ? '#1a1614' : dim, ...sans, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                {p}
              </button>
            );
          })}
        </div>
        <div role="tablist" aria-label="Day" style={{ display: 'flex', gap: 8, marginTop: 10, marginBottom: 22 }}>
          {DAYS.map((d, i) => {
            const a = d.id === activeDay;
            return (
              <button key={d.id} role="tab" aria-selected={a} onClick={() => setActiveDay(d.id)}
                style={{ flex: 1, minHeight: 54, borderRadius: 12, border: `1.5px solid ${a ? gold : line}`, backgroundColor: a ? gold : 'transparent', color: a ? '#1a1614' : dim, ...mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <span>DAY {i + 1}</span>
                <span style={{ fontSize: 13 }}>{d.label}</span>
              </button>
            );
          })}
        </div>

        {/* Plan */}
        {plan.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: dim }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🎧</div>
            <div style={{ fontSize: 16, lineHeight: 1.5 }}>{activePerson} hasn't picked anyone for {dayLabel}.<br />Switch the day or who you are above.</div>
          </div>
        ) : !dayHasTimes ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ ...mono, fontSize: 12, color: dim, lineHeight: 1.5, textAlign: 'center', marginBottom: 4 }}>
              Set times not announced yet — here's your full plan. NOW / NEXT light up once times drop.
            </div>
            {plan.map(s => card(s, null, gold, false))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {currents.map((s, i) => card(s, i === 0 ? (currents.length > 1 ? '▶ On now (overlap)' : '▶ On now') : '▶ Also now', clashRed, true))}
            {nextUp && card(nextUp, '↑ Up next', gold, true)}
            {!currents.length && !nextUp && (
              <div style={{ ...mono, fontSize: 13, color: dim, textAlign: 'center', padding: '8px 0' }}>
                Nothing live right now — your full plan for {dayLabel}:
              </div>
            )}
            {later.length > 0 && (
              <>
                <div style={{ ...mono, fontSize: 11, color: dim, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 6 }}>Later</div>
                <LaterTimeline sets={later} onRemove={onRemove} surf={surf} line={line} txt={txt} dim={dim} gold={gold} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
