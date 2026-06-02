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

// Spotify accents: bright brand green for the decorative dot, a darkened
// variant for buttons so white text clears WCAG AA (~6:1).
const spotifyDot = '#1DB954';
const spotifyInk = '#0d5c2f';

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
        backgroundColor: myPick ? tmrwBg : 'transparent', transition: 'background-color var(--dur-press) var(--ease-out)',
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
  const [party, setParty]               = useState(false);
  const [tipDismissed, setTipDismissed] = useState(() => {
    try { return localStorage.getItem('tml2026_tip') === '1'; } catch { return false; }
  });

  // Shared picks, synced to the server in near-real-time.
  const { picks, status, togglePick, clearMine, restoreMine } = usePicks();
  // Unified bottom-screen toast. { msg, action?: { label, run }, duration }
  const [toast, setToast] = useState(null);
  const notify = (msg, opts) => setToast({ msg, duration: 2500, ...opts });

  // Auto-dismiss the toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.duration || 3000);
    return () => clearTimeout(t);
  }, [toast]);

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

  // The active person's full selection across all three days — feeds both the
  // Spotify prompt and Party mode.
  const mySets = useMemo(() => sets.filter(s => picks[s.id]?.[activePerson]), [picks, activePerson]);

  const rowProps = (set) => ({
    set, myColor,
    myPick: picks[set.id]?.[activePerson] || false,
    others: PEOPLE.filter(p => p !== activePerson && picks[set.id]?.[p]),
    isClash: clashSetIds.has(set.id),
    onToggle: () => togglePick(set.id, activePerson),
  });

  // Party mode takes over the whole screen — render it instead of the planner.
  if (party) return (
    <PartyMode
      activePerson={activePerson} setActivePerson={setActivePerson}
      activeDay={activeDay} setActiveDay={setActiveDay}
      picks={picks} onExit={() => setParty(false)}
    />
  );

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
                ...mono, fontWeight: 700, textTransform: 'uppercase', transition: 'transform var(--dur-press) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              }}>
              <span aria-hidden="true" style={{ fontSize: 8, letterSpacing: '0.16em', color: active ? goldInk : muted }}>Day {i + 1}</span>
              <span aria-hidden="true" style={{ fontSize: 13, letterSpacing: '0.1em' }}>{day.label}</span>
            </button>
          );
        })}
      </div>

      {/* Identity dropdown + Party mode — one line. Each person uses their
          own phone, so "who am I" is set once. */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <button onClick={() => setWhoOpen(o => !o)} aria-expanded={whoOpen} aria-haspopup="listbox"
            aria-label={`I'm ${activePerson}. Tap to change who's using this device.`}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 48, padding: '10px 14px', borderRadius: 8, border: `1px solid ${rule}`, backgroundColor: '#fff', color: myInk, ...sans, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: myInk, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activePerson}</span>
            </span>
            <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1, color: muted, transform: whoOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease-in-out)', flexShrink: 0 }}>▾</span>
          </button>

          {whoOpen && (
            <div role="listbox" aria-label="Switch person" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30, border: `1px solid ${rule}`, borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.14)' }}>
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

        <button onClick={() => setParty(true)} aria-label="Enter party mode"
          style={{ flexShrink: 0, minHeight: 48, padding: '0 16px', borderRadius: 8, border: `1px solid ${tmrwBg}`, backgroundColor: tmrwBg, color: tmrwGold, ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
          <span aria-hidden="true">🌙</span> Party mode
        </button>
      </div>

      {/* View by + live sync status — one line */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <span style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>View by</span>
        <span title={status === 'error' ? 'Offline — showing last synced picks' : 'Synced with the crew'}
          style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, color: status === 'error' ? '#a82a13' : status === 'ready' ? '#276627' : muted }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: status === 'error' ? '#a82a13' : status === 'ready' ? '#276627' : muted, display: 'inline-block' }} />
          {status === 'error' ? 'Offline' : status === 'ready' ? 'Live' : 'Syncing'}
        </span>
      </div>
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
                transition: 'transform var(--dur-press) var(--ease-out), background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
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
            const pickedSets = stageSets.filter(s => picks[s.id]?.[activePerson]);
            const picked = pickedSets.length;
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
                  <span aria-hidden="true" style={{ fontSize: 11, color: muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease-in-out)' }}>▶</span>
                </button>
                {open && (
                  <div style={{ borderTop: `1px solid ${rule}` }}>
                    {stageSets.map(set => <ArtistRow key={set.id} {...rowProps(set)} showStage={false} />)}
                    {picked > 0 && <StageSpotify stage={stage} pickedSets={pickedSets} onCopied={notify} />}
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

      {/* Spotify — build a playlist prompt from this person's picks */}
      <SpotifyExport person={activePerson} mySets={mySets} onCopied={notify} />

      {/* Reset — clears only the active person's picks; quiet line button */}
      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <button onClick={() => {
            if (confirm(`Clear all of ${activePerson}'s picks for the trip? You can undo right after.`)) {
              const person = activePerson;
              const ids = clearMine(person);
              if (ids.length) notify(`Cleared ${person}'s picks`, { duration: 6000, action: { label: 'Undo', run: () => restoreMine(person, ids) } });
            }
          }}
          style={{ minHeight: 44, padding: '0 8px', border: 'none', background: 'none', color: muted, ...mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          Reset {activePerson}'s selections
        </button>
      </div>

      {/* Bottom-screen toast — copy confirmations, undo, etc. */}
      {toast && (
        <div role="status" style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom))', maxWidth: 648, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderRadius: 10, backgroundColor: ink, color: paper, zIndex: 60, boxShadow: '0 6px 20px rgba(0,0,0,0.28)' }}>
          <span style={{ ...sans, fontSize: 13 }}>{toast.msg}</span>
          {toast.action && (
            <button onClick={() => { toast.action.run(); setToast(null); }}
              style={{ minHeight: 44, padding: '0 6px', border: 'none', background: 'none', color: tmrwGold, ...mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }}>
              {toast.action.label}
            </button>
          )}
        </div>
      )}
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

// ── Spotify prompt ───────────────────────────────────────────
// Builds a STATIC text prompt (no AI, no API) from a person's picks. The user
// copies it and pastes it into Spotify's AI Playlist box in the mobile app.

// Real, playable artist names: deduped, TBA placeholders dropped, sorted.
function artistNames(mySets) {
  return [...new Set(mySets.map(s => s.name))]
    .filter(n => !/^to be announced$/i.test(n.trim()))
    .sort((a, b) => a.localeCompare(b));
}

function buildSpotifyPrompt(mySets, stage) {
  const scope = stage ? `from the ${stage} stage ` : '';
  return (
    `Make me a Tomorrowland 2026 playlist ${scope}featuring these artists, with 1–2 of each artist's most popular tracks. ` +
    `Order it to build energy from a warm-up to peak time. Genre: electronic / dance / festival. ` +
    `If an artist is a B2B or F2F pairing, include tracks from each name; skip anyone you can't find.\n\n` +
    `Artists: ${artistNames(mySets).join(', ')}.`
  );
}

// Returns true only if the text actually made it to the clipboard.
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

// Shared copy state + handler for both Spotify prompt UIs. Only confirms on a
// real copy; on failure it nudges the user to the Preview text instead.
function usePromptCopy(prompt, onCopied, successMsg) {
  const [copied, setCopied]     = useState(false);
  const [showText, setShowText] = useState(false);
  async function copy() {
    const ok = await copyToClipboard(prompt);
    if (!ok) {
      setShowText(true);
      onCopied?.('Couldn’t copy — select the text below');
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopied?.(successMsg);
  }
  return { copied, showText, setShowText, copy };
}

function SpotifyExport({ person, mySets, onCopied }) {
  const count  = useMemo(() => artistNames(mySets).length, [mySets]);
  const prompt = useMemo(() => buildSpotifyPrompt(mySets), [mySets]);
  const { copied, showText, setShowText, copy } = usePromptCopy(prompt, onCopied, `Copied ${person}'s Spotify prompt`);

  if (!count) return null; // nothing playable (e.g. only TBA slots picked)

  return (
    <section style={{ marginTop: 28, border: `1px solid ${rule}`, borderRadius: 10, padding: 14, backgroundColor: paper }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: spotifyDot, display: 'inline-block' }} />
        <span style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Spotify playlist</span>
      </div>
      <p style={{ fontSize: 14, color: ink, lineHeight: 1.45, margin: '0 0 12px' }}>
        Build a playlist from <strong>{person}'s {count}</strong> artist{count === 1 ? '' : 's'}. Copy the prompt, then paste it into Spotify's AI Playlist (Premium, in the mobile app).
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={copy}
          style={{ minHeight: 44, padding: '0 18px', border: 'none', borderRadius: 8, backgroundColor: spotifyInk, color: '#fff', ...sans, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          {copied ? 'Copied ✓' : 'Copy prompt'}
        </button>
        <button onClick={() => setShowText(s => !s)} aria-expanded={showText}
          style={{ minHeight: 44, padding: '0 14px', border: `1px solid ${rule}`, borderRadius: 8, background: 'none', color: ink, ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
          {showText ? 'Hide' : 'Preview'}
        </button>
      </div>
      {showText && (
        <textarea readOnly value={prompt} aria-label="Spotify playlist prompt"
          style={{ marginTop: 12, width: '100%', boxSizing: 'border-box', minHeight: 130, padding: 12, borderRadius: 8, border: `1px solid ${rule}`, backgroundColor: '#fff', color: ink, fontSize: 16, ...sans, lineHeight: 1.45, resize: 'vertical' }} />
      )}
    </section>
  );
}

// Compact, per-stage variant — lives in the foot of each open stage accordion.
function StageSpotify({ stage, pickedSets, onCopied }) {
  const n = useMemo(() => artistNames(pickedSets).length, [pickedSets]);
  const prompt = useMemo(() => buildSpotifyPrompt(pickedSets, stage), [pickedSets, stage]);
  const { copied, showText, setShowText, copy } = usePromptCopy(prompt, onCopied, `Copied ${stage} Spotify prompt`);

  if (!n) return null; // only TBA slots picked here — nothing to build

  return (
    <div style={{ borderTop: `1px solid ${rule}`, padding: '10px 14px', backgroundColor: 'rgba(26,10,46,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: spotifyDot, display: 'inline-block' }} />
        <span style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.12em', textTransform: 'uppercase', flex: 1, minWidth: 110 }}>
          {stage} playlist · {n} artist{n === 1 ? '' : 's'}
        </span>
        <button onClick={copy}
          style={{ minHeight: 40, padding: '0 14px', border: 'none', borderRadius: 8, backgroundColor: spotifyInk, color: '#fff', ...sans, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          {copied ? 'Copied ✓' : 'Copy prompt'}
        </button>
        <button onClick={() => setShowText(s => !s)} aria-expanded={showText}
          style={{ minHeight: 40, padding: '0 10px', border: `1px solid ${rule}`, borderRadius: 8, background: 'none', color: ink, ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
          {showText ? 'Hide' : 'Preview'}
        </button>
      </div>
      {showText && (
        <textarea readOnly value={prompt} aria-label={`Spotify playlist prompt for ${stage}`}
          style={{ marginTop: 10, width: '100%', boxSizing: 'border-box', minHeight: 110, padding: 10, borderRadius: 8, border: `1px solid ${rule}`, backgroundColor: '#fff', color: ink, fontSize: 16, ...sans, lineHeight: 1.45, resize: 'vertical' }} />
      )}
    </div>
  );
}

// ── Party mode ───────────────────────────────────────────────
// Full-screen, high-contrast, large-type "where do I go next" view for use at
// the festival at night. Dormant set times mean it shows the ordered plan;
// once real times drop, NOW / NEXT light up against the live clock.
function fmtClock(d) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
// Normalise a timed set's [start, end] to minutes, treating early-AM as "late".
function normSpan(s) {
  let st = timeToMin(s.start);
  let en = timeToMin(s.end);
  if (en <= st) en += 1440;
  if (st < 360) { st += 1440; en += 1440; }
  return [st, en];
}

function PartyMode({ activePerson, setActivePerson, activeDay, setActiveDay, picks, onExit }) {
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

  const bg = '#0a0610', surf = '#171022', line = '#2c2040';
  const txt = '#ffffff', gold = '#e8b84b', dim = '#a99cc4';

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
    <div style={{
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
            <div role="timer" aria-label={`Current time ${fmtClock(now)}`} style={{ ...mono, fontSize: 'clamp(44px, 15vw, 72px)', fontWeight: 700, color: gold, lineHeight: 1, letterSpacing: '0.02em' }}>
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
            {currents.map((s, i) => card(s, i === 0 ? (currents.length > 1 ? '▶ On now (clash)' : '▶ On now') : '▶ Also now', clashRed, true))}
            {nextUp && card(nextUp, '↑ Up next', gold, true)}
            {!currents.length && !nextUp && (
              <div style={{ ...mono, fontSize: 13, color: dim, textAlign: 'center', padding: '8px 0' }}>
                Nothing live right now — your full plan for {dayLabel}:
              </div>
            )}
            {later.length > 0 && (
              <>
                <div style={{ ...mono, fontSize: 11, color: dim, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 6 }}>Later</div>
                {later.map(s => card(s, null, gold, false))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
