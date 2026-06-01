import { useState, useEffect, useMemo } from 'react';
import { sets, STAGES, PEOPLE, LINEUP_STATUS } from '../data/lineup.js';
import { usePicks } from '../hooks/usePicks.js';

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

// Bright identity colours — used on DARK backgrounds (picked rows on the
// purple card), where they have ample contrast.
const PERSON_COLORS = {
  Grant:   '#e8b84b',  // gold
  Desmond: '#4a7fc1',  // blue
  Lawrence:'#4a9a4a',  // green
};

// Darkened variants for use as text/border/fill on the LIGHT paper background.
// Each passes WCAG AA: >=4.5:1 as text and white text >=4.5:1 when used as a fill.
const PERSON_INK = {
  Grant:   '#7a5d10',  // dark gold  (5.0:1 on paper)
  Desmond: '#2f5c9e',  // dark blue  (5.4:1)
  Lawrence:'#276627',  // dark green (5.6:1)
};
const goldInk = '#7a5d10'; // accessible gold for labels on light paper

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
const ME_KEY = 'tml2026_me'; // remembers which person this device is

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
    <button onClick={onToggle} aria-pressed={myPick} aria-label={`${set.name}, ${set.stage}`}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer', minHeight: 44,
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
          <span key={p} title={p} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: myPick ? PERSON_COLORS[p] : PERSON_INK[p], display: 'inline-block' }} />
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
  const [activePerson, setActivePerson] = useState(() => {
    try { const me = localStorage.getItem(ME_KEY); return PEOPLE.includes(me) ? me : 'Grant'; }
    catch { return 'Grant'; }
  });
  const [view, setView]                 = useState('stage');
  const [search, setSearch]             = useState('');
  const [openStages, setOpenStages]     = useState(() => new Set());
  const [whoOpen, setWhoOpen]           = useState(false);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [tipDismissed, setTipDismissed] = useState(() => {
    try { return localStorage.getItem('tml2026_tip') === '1'; } catch { return false; }
  });

  // Shared picks, synced to the server in near-real-time.
  const { picks, status, togglePick, resetPicks } = usePicks();

  // Remember which person this device is, so you don't re-pick each visit.
  useEffect(() => { try { localStorage.setItem(ME_KEY, activePerson); } catch {} }, [activePerson]);

  const q = search.trim().toLowerCase();
  const myColor = PERSON_COLORS[activePerson];
  const myInk = PERSON_INK[activePerson];
  const forceOpen = q.length > 0;
  const dayHasTimes = useMemo(() => sets.some(s => s.day === activeDay && hasTime(s)), [activeDay]);
  const dayLabel = DAYS.find(d => d.id === activeDay)?.label || '';

  function toggleStage(stage) {
    setOpenStages(prev => {
      const next = new Set(prev);
      next.has(stage) ? next.delete(stage) : next.add(stage);
      return next;
    });
  }

  // STAGE (browse) — every artist for the day, search-filtered. Your picks
  // highlight inline for whoever the "I'm ___" dropdown says you are.
  const browseSets = useMemo(() =>
    sets.filter(s => s.day === activeDay && (!q || s.name.toLowerCase().includes(q))),
    [activeDay, q]
  );
  const groups = useMemo(() =>
    STAGE_ORDER
      .map(stage => ({ stage, sets: browseSets.filter(s => s.stage === stage) }))
      .filter(g => g.sets.length > 0),
    [browseSets]
  );

  // TIME (my plan) — the dropdown person's picks for the day, in time order.
  // No separate "my picks" filter: the dropdown IS the lens.
  const timeline = useMemo(() => {
    const arr = sets.filter(s => s.day === activeDay && picks[s.id]?.[activePerson]);
    if (dayHasTimes) arr.sort((a, b) => sortKey(a) - sortKey(b) || a.name.localeCompare(b.name));
    else arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [activeDay, picks, activePerson, dayHasTimes]);

  const dayCount = useMemo(() => sets.filter(s => s.day === activeDay).length, [activeDay]);

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
      {/* One-time tip — slim and dismissible, not a dominant panel */}
      {LINEUP_STATUS !== 'official' && !tipDismissed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, backgroundColor: 'rgba(26,10,46,0.05)', borderRadius: 8, padding: '6px 6px 6px 12px' }}>
          <span aria-hidden="true" style={{ fontSize: 13 }}>🎵</span>
          <span style={{ fontSize: 12, color: muted, lineHeight: 1.35, flex: 1 }}>
            Tap an artist to add it to your picks. Set times TBA.
          </span>
          <button onClick={() => { setTipDismissed(true); try { localStorage.setItem('tml2026_tip', '1'); } catch {} }}
            aria-label="Dismiss tip"
            style={{ flexShrink: 0, width: 36, height: 36, border: 'none', background: 'none', color: muted, fontSize: 18, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
      )}

      {/* Identity (this device) — a full-width dropdown. Each person uses
          their own phone, so "who am I" is set once. */}
      <div style={{ marginBottom: 16 }}>
        {/* Sync status, right-aligned above the dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 6 }}>
          <span title={status === 'error' ? 'Offline — showing last synced picks' : 'Synced with the crew'}
            style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, color: status === 'error' ? '#a82a13' : status === 'ready' ? '#276627' : muted }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: status === 'error' ? '#a82a13' : status === 'ready' ? '#276627' : muted, display: 'inline-block' }} />
            {status === 'error' ? 'Offline' : status === 'ready' ? 'Live' : 'Syncing'}
          </span>
        </div>

        <button onClick={() => setWhoOpen(o => !o)} aria-expanded={whoOpen} aria-haspopup="listbox"
          aria-label={`I'm ${activePerson}. Tap to change who's using this device.`}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 48, padding: '10px 14px', borderRadius: 8, border: `1px solid ${rule}`, backgroundColor: '#fff', color: myInk, ...sans, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: myInk }} />
            {activePerson}
          </span>
          <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1, color: muted, transform: whoOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
        </button>

        {whoOpen && (
          <div role="listbox" aria-label="Switch person" style={{ marginTop: 6, border: `1px solid ${rule}`, borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' }}>
            {PEOPLE.map((person, i) => {
              const active = activePerson === person;
              const ink2 = PERSON_INK[person];
              return (
                <button key={person} role="option" aria-selected={active}
                  onClick={() => { setActivePerson(person); setWhoOpen(false); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    minHeight: 48, padding: '10px 14px', border: 'none',
                    borderTop: i === 0 ? 'none' : `1px solid ${rule}55`,
                    backgroundColor: active ? `${ink2}14` : 'transparent', color: ink2,
                    ...sans, fontSize: 14, fontWeight: 700, cursor: 'pointer', textAlign: 'left',
                  }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: ink2 }} />
                    {person}
                  </span>
                  {active && <span aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Day selector — borderless underline tabs (no box), date + festival day */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${rule}` }}>
        {DAYS.map((day, i) => {
          const active = activeDay === day.id;
          return (
            <button key={day.id} onClick={() => { setActiveDay(day.id); setWhoOpen(false); }}
              aria-label={`Day ${i + 1}, ${day.label}`} aria-current={active ? 'true' : undefined}
              style={{
                flex: 1, padding: '6px 0 9px', minHeight: 48, cursor: 'pointer',
                border: 'none', background: 'none', marginBottom: -1,
                borderBottom: `2px solid ${active ? goldInk : 'transparent'}`,
                color: active ? ink : muted,
                ...mono, fontWeight: 700, textTransform: 'uppercase', transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              }}>
              <span aria-hidden="true" style={{ fontSize: 8, letterSpacing: '0.16em', color: active ? goldInk : muted }}>Day {i + 1}</span>
              <span aria-hidden="true" style={{ fontSize: 13, letterSpacing: '0.1em' }}>{day.label}</span>
            </button>
          );
        })}
      </div>

      {/* View switcher — a "view by", not a filter: same day, different lens */}
      <div style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>View by</div>
      <div role="tablist" aria-label="View" style={{ display: 'flex', marginBottom: 16, border: `1px solid ${rule}`, borderRadius: 8, overflow: 'hidden' }}>
        {VIEWS.map((v, i) => {
          const active = view === v.id;
          return (
            <button key={v.id} role="tab" aria-selected={active} onClick={() => { setView(v.id); setWhoOpen(false); }}
              style={{
                flex: 1, padding: '7px 0', minHeight: 40, cursor: 'pointer', border: 'none',
                borderLeft: i === 0 ? 'none' : `1px solid ${rule}`,
                backgroundColor: active ? ink : 'transparent', color: active ? paper : muted,
                ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}>
              {v.label}{v.id === 'crew' && (crew.all3.length + crew.two.length > 0) ? ` ·${crew.all3.length + crew.two.length}` : ''}
            </button>
          );
        })}
      </div>

      {/* Stage: count · search toggle · expand-all (search is two-state) */}
      {view === 'stage' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: searchOpen ? 10 : 8, flexWrap: 'wrap' }}>
            <span style={{ ...mono, fontSize: 10, color: muted }}>
              {browseSets.length}{browseSets.length !== dayCount ? ` / ${dayCount}` : ''} artists · {groups.length} stage{groups.length === 1 ? '' : 's'}
            </span>
            <button onClick={() => setSearchOpen(o => !o)} aria-expanded={searchOpen} aria-label="Search artists"
              style={{ marginLeft: 'auto', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', color: searchOpen ? ink : muted, fontSize: 17, cursor: 'pointer' }}>⌕</button>
            {!forceOpen && (
              <button onClick={() => setOpenStages(openStages.size >= groups.length ? new Set() : new Set(STAGE_ORDER))}
                style={{ minHeight: 40, padding: '0 4px', border: 'none', background: 'none', color: goldInk, ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                {openStages.size >= groups.length ? 'Collapse all' : 'Expand all'}
              </button>
            )}
          </div>
          {searchOpen && (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: muted, pointerEvents: 'none' }}>⌕</span>
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search artists…"
                type="search" inputMode="search" aria-label="Search artists"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 38px 10px 30px', minHeight: 44, borderRadius: 8, border: `1px solid ${rule}`, backgroundColor: '#fff', color: ink, fontSize: 16, ...sans }} />
              <button onClick={() => { setSearch(''); setSearchOpen(false); }} aria-label="Close search"
                style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: muted, fontSize: 18, lineHeight: 1, cursor: 'pointer', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          )}
        </>
      )}

      {/* Time: "[name]'s plan" header */}
      {view === 'time' && timeline.length > 0 && (
        <div style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
          {activePerson}'s plan · {timeline.length} pick{timeline.length === 1 ? '' : 's'}
        </div>
      )}

      {/* Empty: Stage (no search match) */}
      {view === 'stage' && groups.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: muted }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 14 }}>No artists match "{search}".</div>
        </div>
      )}

      {/* Empty: Time (no picks yet) */}
      {view === 'time' && timeline.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: muted }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎧</div>
          <div style={{ fontSize: 14 }}>{activePerson} hasn't picked anyone for {dayLabel} yet.<br />Add some from the Stage tab.</div>
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
                <button onClick={() => !forceOpen && toggleStage(stage)} aria-expanded={open}
                  aria-label={`${stage}, ${stageSets.length} artists${picked > 0 ? `, ${picked} of your picks` : ''}`}
                  style={{ width: '100%', textAlign: 'left', cursor: forceOpen ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', minHeight: 44, border: 'none', borderLeft: `5px solid ${color}`, background: 'none' }}>
                  <span aria-hidden="true" style={{ ...mono, fontSize: 12, fontWeight: 700, color: ink, letterSpacing: '0.04em', textTransform: 'uppercase', flex: 1 }}>{stage}</span>
                  {picked > 0 && (
                    <span aria-hidden="true" style={{ ...mono, fontSize: 10, fontWeight: 700, color: '#fff', backgroundColor: myInk, borderRadius: 999, padding: '2px 7px' }}>★ {picked}</span>
                  )}
                  <span aria-hidden="true" style={{ ...mono, fontSize: 11, color: muted }}>{stageSets.length}</span>
                  <span aria-hidden="true" style={{ fontSize: 11, color: muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s' }}>▶</span>
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
      {view === 'time' && timeline.length > 0 && (
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
          {/* Per-person totals — colour-filled tags, one per crew member */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PEOPLE.map(person => (
              <div key={person} style={{ flex: 1, minWidth: 90, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', borderRadius: 8, backgroundColor: PERSON_INK[person] }}>
                <span style={{ ...sans, fontSize: 12, fontWeight: 700, color: '#fff' }}>{person}</span>
                <span style={{ ...mono, fontSize: 14, fontWeight: 700, color: '#fff' }}>{totalPicks[person]}</span>
              </div>
            ))}
          </div>
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
          <CrewSection title={`Everyone (${PEOPLE.length}/3)`} accent={goldInk} items={crew.all3} emptyText="No artist all three of you picked yet." picks={picks} />
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
      <button onClick={() => { if (prompt("This clears EVERYONE's picks. Type RESET to confirm.") === 'RESET') resetPicks(); }}
        style={{ marginTop: 24, width: '100%', padding: '10px', minHeight: 44, border: `1px solid ${rule}`, borderRadius: 6, background: 'none', color: muted, ...mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>
        Reset all picks
      </button>
    </div>
  );
}

function CrewSection({ title, accent, items, emptyText, showWho }) {
  return (
    <div>
      <div style={{ ...mono, fontSize: 10, color: accent, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
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
                    <span key={p} title={p} style={{ ...mono, fontSize: 9, fontWeight: 700, color: '#fff', backgroundColor: PERSON_INK[p], borderRadius: 3, padding: '2px 5px' }}>{p[0]}</span>
                  ))}
                  {!showWho && PEOPLE.map(p => (
                    <span key={p} title={p} style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: PERSON_INK[p], display: 'inline-block' }} />
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
