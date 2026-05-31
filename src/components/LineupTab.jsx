import { useState, useEffect, useMemo } from 'react';
import { sets, STAGES, PEOPLE, LINEUP_STATUS } from '../data/lineup.js';

const mono = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };
const sans = { fontFamily: '"Space Grotesk", -apple-system, system-ui, sans-serif' };

// Palette
const tmrwBg    = '#1a0a2e';
const tmrwGold  = '#e8b84b';
const bodyMuted = '#b8a888';
const paper     = '#ede7d8';
const ink       = '#1a1614';
const muted     = '#5c544c';
const rule      = '#cabda4';
const clashRed  = '#c94040';

const PERSON_COLORS = {
  Grant:   '#e8b84b',  // gold
  Desmond: '#4a7fc1',  // blue
  Lawrence:'#4a9a4a',  // green
};

const DAYS = [
  { id: 'fri', label: 'Fri 17' },
  { id: 'sat', label: 'Sat 18' },
  { id: 'sun', label: 'Sun 19' },
];

const VIEWS = [
  { id: 'stage', label: 'Stage' },
  { id: 'time',  label: 'Time' },
  { id: 'crew',  label: 'Crew' },
];

const STAGE_ORDER = Object.keys(STAGES);
const LS_KEY = 'tml2026_picks';

function loadPicks() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
  catch { return {}; }
}
function savePicks(picks) {
  localStorage.setItem(LS_KEY, JSON.stringify(picks));
}

const hasTime  = (s) => Boolean(s.start && s.end);
const timeLabel = (s) => (hasTime(s) ? `${s.start} – ${s.end}` : 'Set time TBA');
function timeToMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
// Festival nights run past midnight — treat early-AM as "late" for ordering.
function sortKey(s) { const m = timeToMin(s.start); return m < 360 ? m + 1440 : m; }
function timesOverlap(a, b) {
  const aS = timeToMin(a.start), bS = timeToMin(b.start);
  let aE = timeToMin(a.end), bE = timeToMin(b.end);
  if (aE <= aS) aE += 1440;
  if (bE <= bS) bE += 1440;
  return aS < bE && bS < aE;
}

// ── Shared artist row ────────────────────────────────────────
function ArtistRow({ set, myColor, myPick, others, isClash, showStage, onToggle }) {
  const stageColor = STAGES[set.stage]?.color || tmrwGold;
  return (
    <button onClick={onToggle}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        padding: '10px 14px', border: 'none', borderTop: `1px solid ${rule}55`,
        borderLeft: myPick ? `5px solid ${myColor}` : '5px solid transparent',
        backgroundColor: myPick ? tmrwBg : 'transparent', transition: 'background 0.12s',
      }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: myPick ? tmrwGold : ink, letterSpacing: '-0.01em' }}>
          {set.name}
        </div>
        <div style={{ ...mono, fontSize: 10, color: myPick ? bodyMuted : muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {showStage && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: stageColor, display: 'inline-block' }} />
              <span style={{ color: myPick ? bodyMuted : muted }}>{set.stage}</span>
            </span>
          )}
          <span>{timeLabel(set)}</span>
          {isClash && <span style={{ color: clashRed, fontWeight: 700 }}>⚡ CLASH</span>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {others.map(p => (
          <span key={p} title={p} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: PERSON_COLORS[p], display: 'inline-block' }} />
        ))}
        <span style={{
          width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2,
          border: myPick ? 'none' : `1.5px solid ${rule}`,
          backgroundColor: myPick ? myColor : 'transparent',
        }}>
          {myPick && (
            <svg width="11" height="11" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
        </span>
      </div>
    </button>
  );
}

export default function LineupTab() {
  const [activeDay, setActiveDay]       = useState('fri');
  const [activePerson, setActivePerson] = useState('Grant');
  const [view, setView]                 = useState('stage');
  const [picks, setPicks]               = useState(loadPicks);
  const [search, setSearch]             = useState('');
  const [myPicksOnly, setMyPicksOnly]   = useState(false);
  const [openStages, setOpenStages]     = useState(() => new Set());

  useEffect(() => { savePicks(picks); }, [picks]);

  const q = search.trim().toLowerCase();
  const myColor = PERSON_COLORS[activePerson];
  const forceOpen = q.length > 0 || myPicksOnly;
  const dayHasTimes = useMemo(() => sets.some(s => s.day === activeDay && hasTime(s)), [activeDay]);

  function togglePick(setId, person) {
    setPicks(prev => {
      const cur = prev[setId] || {};
      return { ...prev, [setId]: { ...cur, [person]: !cur[person] } };
    });
  }
  function toggleStage(stage) {
    setOpenStages(prev => {
      const next = new Set(prev);
      next.has(stage) ? next.delete(stage) : next.add(stage);
      return next;
    });
  }

  // Filtered day sets (search + my-picks), shared by stage & time views.
  const filtered = useMemo(() => {
    return sets.filter(s => {
      if (s.day !== activeDay) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      if (myPicksOnly && !picks[s.id]?.[activePerson]) return false;
      return true;
    });
  }, [activeDay, q, myPicksOnly, picks, activePerson]);

  const groups = useMemo(() =>
    STAGE_ORDER
      .map(stage => ({ stage, sets: filtered.filter(s => s.stage === stage) }))
      .filter(g => g.sets.length > 0),
    [filtered]
  );

  const timeline = useMemo(() => {
    const arr = [...filtered];
    if (dayHasTimes) arr.sort((a, b) => sortKey(a) - sortKey(b) || a.name.localeCompare(b.name));
    else arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [filtered, dayHasTimes]);

  const dayCount = useMemo(() => sets.filter(s => s.day === activeDay).length, [activeDay]);
  const shownCount = filtered.length;

  // Clash detection — dormant until set times exist.
  const clashes = useMemo(() => {
    const out = [];
    const ds = sets.filter(s => s.day === activeDay && hasTime(s));
    for (let i = 0; i < ds.length; i++) {
      for (let j = i + 1; j < ds.length; j++) {
        const a = ds[i], b = ds[j];
        if (a.stage === b.stage || !timesOverlap(a, b)) continue;
        const shared = PEOPLE.filter(p => picks[a.id]?.[p] && picks[b.id]?.[p]);
        if (shared.length) out.push({ a, b, shared });
      }
    }
    return out;
  }, [activeDay, picks]);
  const clashSetIds = new Set(clashes.flatMap(c => [c.a.id, c.b.id]));

  // Crew consensus for the active day.
  const crew = useMemo(() => {
    const ds = sets.filter(s => s.day === activeDay);
    const all3 = [], two = [];
    for (const s of ds) {
      const pickers = PEOPLE.filter(p => picks[s.id]?.[p]);
      if (pickers.length === PEOPLE.length) all3.push({ set: s, pickers });
      else if (pickers.length === 2) two.push({ set: s, pickers });
    }
    return { all3, two };
  }, [activeDay, picks]);

  const totalPicks = useMemo(() =>
    PEOPLE.reduce((acc, p) => { acc[p] = sets.filter(s => picks[s.id]?.[p]).length; return acc; }, {}),
    [picks]
  );

  const rowProps = (set) => ({
    set, myColor,
    myPick: picks[set.id]?.[activePerson] || false,
    others: PEOPLE.filter(p => p !== activePerson && picks[set.id]?.[p]),
    isClash: clashSetIds.has(set.id),
    onToggle: () => togglePick(set.id, activePerson),
  });

  return (
    <div style={{ ...sans }}>
      {/* Status notice */}
      {LINEUP_STATUS !== 'official' && (
        <div style={{ backgroundColor: tmrwBg, border: `1px dashed ${tmrwGold}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🎵</span>
          <div>
            <div style={{ ...mono, fontSize: 11, color: tmrwGold, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Lineup · Set times TBA</div>
            <div style={{ fontSize: 12, color: bodyMuted, marginTop: 3, lineHeight: 1.4 }}>
              Tap an artist to add them to your picks. Times aren’t announced yet — the Time view and clash detection switch on automatically once they drop.
            </div>
          </div>
        </div>
      )}

      {/* Person selector */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>Who's picking</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PEOPLE.map(person => {
            const active = activePerson === person;
            const color  = PERSON_COLORS[person];
            return (
              <button key={person} onClick={() => setActivePerson(person)}
                style={{
                  padding: '6px 16px', borderRadius: 4, border: `2px solid ${color}`,
                  backgroundColor: active ? color : 'transparent', color: active ? ink : color,
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                {person}
                <span style={{ ...mono, fontSize: 10, opacity: 0.8 }}>{totalPicks[person]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {DAYS.map(day => {
          const active = activeDay === day.id;
          return (
            <button key={day.id} onClick={() => setActiveDay(day.id)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 4, cursor: 'pointer',
                border: `1px solid ${active ? tmrwGold : rule}`,
                backgroundColor: active ? tmrwBg : 'transparent', color: active ? tmrwGold : muted,
                ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}>
              {day.label}
            </button>
          );
        })}
      </div>

      {/* View switcher */}
      <div style={{ display: 'flex', marginBottom: 16, border: `1px solid ${rule}`, borderRadius: 8, overflow: 'hidden' }}>
        {VIEWS.map((v, i) => {
          const active = view === v.id;
          return (
            <button key={v.id} onClick={() => setView(v.id)}
              style={{
                flex: 1, padding: '9px 0', cursor: 'pointer', border: 'none',
                borderLeft: i === 0 ? 'none' : `1px solid ${rule}`,
                backgroundColor: active ? ink : 'transparent', color: active ? paper : muted,
                ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}>
              {v.label}{v.id === 'crew' && (crew.all3.length + crew.two.length > 0) ? ` ·${crew.all3.length + crew.two.length}` : ''}
            </button>
          );
        })}
      </div>

      {/* Filters (stage + time views) */}
      {view !== 'crew' && (
        <>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: muted, pointerEvents: 'none' }}>⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search artists…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 36px 11px 30px', borderRadius: 8, border: `1px solid ${rule}`, backgroundColor: '#fff', color: ink, fontSize: 15, ...sans, outline: 'none' }} />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Clear search"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: muted, fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: 4 }}>×</button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <button onClick={() => setMyPicksOnly(o => !o)}
              style={{
                padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                border: `1.5px solid ${myPicksOnly ? myColor : rule}`,
                backgroundColor: myPicksOnly ? myColor : 'transparent', color: myPicksOnly ? ink : muted,
                ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              }}>
              ★ {activePerson}'s picks
            </button>
            <span style={{ ...mono, fontSize: 10, color: muted }}>
              {shownCount}{shownCount !== dayCount ? ` / ${dayCount}` : ''} artists{view === 'stage' ? ` · ${groups.length} stage${groups.length === 1 ? '' : 's'}` : ''}
            </span>
            {view === 'stage' && !forceOpen && (
              <button onClick={() => setOpenStages(openStages.size >= groups.length ? new Set() : new Set(STAGE_ORDER))}
                style={{ marginLeft: 'auto', border: 'none', background: 'none', color: tmrwGold, ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                {openStages.size >= groups.length ? 'Collapse all' : 'Expand all'}
              </button>
            )}
          </div>
        </>
      )}

      {/* Empty state (stage + time) */}
      {view !== 'crew' && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: muted }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 14 }}>
            {myPicksOnly ? `${activePerson} hasn't picked anyone this day yet.` : `No artists match "${search}".`}
          </div>
        </div>
      )}

      {/* ── STAGE VIEW ── */}
      {view === 'stage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map(({ stage, sets: stageSets }) => {
            const color = STAGES[stage]?.color || tmrwGold;
            const open  = forceOpen || openStages.has(stage);
            const picked = stageSets.filter(s => picks[s.id]?.[activePerson]).length;
            return (
              <section key={stage} style={{ borderRadius: 10, border: `1px solid ${rule}`, overflow: 'hidden', backgroundColor: paper }}>
                <button onClick={() => !forceOpen && toggleStage(stage)}
                  style={{ width: '100%', textAlign: 'left', cursor: forceOpen ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: 'none', borderLeft: `5px solid ${color}`, background: 'none' }}>
                  <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: ink, letterSpacing: '0.04em', textTransform: 'uppercase', flex: 1 }}>{stage}</span>
                  {picked > 0 && (
                    <span style={{ ...mono, fontSize: 10, fontWeight: 700, color: ink, backgroundColor: myColor, borderRadius: 999, padding: '2px 7px' }}>★ {picked}</span>
                  )}
                  <span style={{ ...mono, fontSize: 11, color: muted }}>{stageSets.length}</span>
                  <span style={{ fontSize: 11, color: muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s' }}>▶</span>
                </button>
                {open && (
                  <div style={{ borderTop: `1px solid ${rule}` }}>
                    {stageSets.map(set => <ArtistRow key={set.id} {...rowProps(set)} showStage={false} />)}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* ── TIME VIEW ── */}
      {view === 'time' && filtered.length > 0 && (
        <div>
          {!dayHasTimes && (
            <div style={{ ...mono, fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: 12, padding: '10px 12px', border: `1px solid ${rule}`, borderRadius: 8 }}>
              ⏱ Set times not announced yet — showing alphabetically. This view becomes a chronological timeline (with clash highlighting) once times drop.
            </div>
          )}
          <section style={{ borderRadius: 10, border: `1px solid ${rule}`, overflow: 'hidden', backgroundColor: paper }}>
            {timeline.map(set => <ArtistRow key={set.id} {...rowProps(set)} showStage={true} />)}
          </section>
        </div>
      )}

      {/* ── CREW VIEW ── */}
      {view === 'crew' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Clash overview */}
          <div>
            <div style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>⚡ Clashes</div>
            {!dayHasTimes ? (
              <div style={{ ...mono, fontSize: 11, color: muted, padding: '10px 12px', border: `1px solid ${rule}`, borderRadius: 8 }}>
                No clashes to detect yet — set times aren’t announced. Overlaps in your shared picks will appear here automatically once times drop.
              </div>
            ) : clashes.length === 0 ? (
              <div style={{ ...mono, fontSize: 11, color: muted, padding: '10px 12px', border: `1px solid ${rule}`, borderRadius: 8 }}>
                No clashes — your shared picks don’t overlap. 🎉
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {clashes.map((c, i) => (
                  <div key={i} style={{ backgroundColor: tmrwBg, border: `1px solid ${clashRed}`, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      {c.shared.map(p => <span key={p} style={{ ...mono, fontSize: 10, fontWeight: 700, color: PERSON_COLORS[p] }}>{p}</span>)}
                      <span style={{ fontSize: 10, color: clashRed }}>clash</span>
                    </div>
                    <div style={{ fontSize: 13, color: paper }}>{c.a.name} <span style={{ color: clashRed }}>vs</span> {c.b.name}</div>
                    <div style={{ ...mono, fontSize: 10, color: bodyMuted, marginTop: 2 }}>{c.a.start}–{c.a.end} {c.a.stage} · {c.b.start}–{c.b.end} {c.b.stage}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All three */}
          <CrewSection title={`Everyone (${PEOPLE.length}/3)`} accent={tmrwGold} items={crew.all3} emptyText="No artist all three of you picked yet." picks={picks} />
          {/* Two of three */}
          <CrewSection title="Two of you" accent={muted} items={crew.two} emptyText="No two-way overlaps yet." picks={picks} showWho />

          {crew.all3.length === 0 && crew.two.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: muted }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🤝</div>
              <div style={{ fontSize: 14 }}>Once you’ve each made picks, your overlaps show up here.</div>
            </div>
          )}
        </div>
      )}

      {/* Reset picks */}
      <button onClick={() => { if (confirm('Clear all picks for everyone?')) { setPicks({}); savePicks({}); } }}
        style={{ marginTop: 24, width: '100%', padding: '10px', border: `1px solid ${rule}`, borderRadius: 6, background: 'none', color: muted, ...mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
        Reset all picks
      </button>
    </div>
  );
}

function CrewSection({ title, accent, items, emptyText, showWho }) {
  return (
    <div>
      <div style={{ ...mono, fontSize: 10, color: accent === tmrwGold ? tmrwGold : muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ ...mono, fontSize: 11, color: muted, padding: '10px 12px', border: `1px solid ${rule}`, borderRadius: 8 }}>{emptyText}</div>
      ) : (
        <section style={{ borderRadius: 10, border: `1px solid ${rule}`, overflow: 'hidden', backgroundColor: paper }}>
          {items.map(({ set, pickers }) => {
            const stageColor = STAGES[set.stage]?.color || tmrwGold;
            return (
              <div key={set.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderTop: `1px solid ${rule}55`, borderLeft: `5px solid ${accent}` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: ink }}>{set.name}</div>
                  <div style={{ ...mono, fontSize: 10, color: muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: stageColor, display: 'inline-block' }} />
                    {set.stage} · {timeLabel(set)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {(showWho ? pickers : []).map(p => (
                    <span key={p} title={p} style={{ ...mono, fontSize: 9, fontWeight: 700, color: ink, backgroundColor: PERSON_COLORS[p], borderRadius: 3, padding: '2px 5px' }}>{p[0]}</span>
                  ))}
                  {!showWho && PEOPLE.map(p => (
                    <span key={p} title={p} style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: PERSON_COLORS[p], display: 'inline-block' }} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
