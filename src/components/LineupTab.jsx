import { useState, useEffect, useMemo, useRef } from 'react';
import { usePresence } from '../hooks/usePresence.js';
import { sets, STAGES, PEOPLE, LINEUP_STATUS } from '../data/lineup.js';
import { usePicks } from '../hooks/usePicks.js';
import { TomorrowlandMark } from './BrandMarks.jsx';

const mono = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };
const sans = { fontFamily: '"Space Grotesk", -apple-system, system-ui, sans-serif' };
// Distinctive display serif — wordmark + stage headers (echoes the poster's
// ornate lettering); labels stay mono, artist names stay sans for legibility.
const display = { fontFamily: '"Fraunces", Georgia, serif' };

// Palette — "Cage" 2026 edition: deep-blue oil painting + molten gold. The tab
// is a DARK theme: navy surfaces, cream text, bright gold accents. (The
// Itinerary tab keeps the light desert theme.) Names are kept so every usage
// site flips automatically; the few spots where the old `ink` was a *dark*
// fill/stroke are pinned with `checkInk` / explicit colors below.
const tmrwBg    = '#0c1126';  // deepest surface — picked rows, party btn, clash cards
const tmrwGold  = '#e8c25e';  // molten gold — accent on dark
const bodyMuted = '#a9b2cf';  // cool muted text on dark
const paper     = '#19224a';  // card surface (sections, dropdown, search) + light text on dark
const ink       = '#f2ecdc';  // primary text → cream
const muted     = '#a9b2cf';  // secondary text / labels (cool light gray)
const rule      = '#34406e';  // borders / dividers
const clashRed  = '#ef6e6e';  // clash warnings (brightened for dark)
const checkInk  = '#0c1126';  // checkmark stroke — stays dark (sits on a bright person dot)

// Bright identity colours — used on DARK backgrounds (picked rows on the
// purple card), where they have ample contrast.
// Bright identity colours — text/dots/chips on the dark theme. Used with dark
// text (tmrwBg) when filled, or as-is for text/dots on navy surfaces.
const PERSON_COLORS = {
  Grant:   '#e8b84b',  // gold
  Desmond: '#7aa6dd',  // blue
  Lawrence:'#5cb85c',  // green
};
// Per-person "molten metal" frame gradient — the Lineup border + accents
// re-tint to whoever the "I'm ___" dropdown says you are. Same stop
// structure as the gold original (dark → light → mid → bright → dark),
// hue-shifted to each person's colour. Grant keeps the original gold.
const FRAME = {
  Grant:    'linear-gradient(135deg, #7a5810 0%, #f3d77a 22%, #b5832a 48%, #ffe8a8 70%, #8a6312 100%)',
  Desmond:  'linear-gradient(135deg, #1f3a6b 0%, #aacaf0 22%, #3f6dae 48%, #d6e8ff 70%, #25406f 100%)',
  Lawrence: 'linear-gradient(135deg, #1f5a2c 0%, #aee0a6 22%, #3f8f46 48%, #d6f5cf 70%, #235e2b 100%)',
};

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
// Stage view lists each stage chronologically; sets with no time (hosts,
// unannounced) fall to the end, ties broken alphabetically.
function stageOrder(a, b) {
  const at = hasTime(a), bt = hasTime(b);
  if (at && bt) return sortKey(a) - sortKey(b) || a.name.localeCompare(b.name);
  if (at !== bt) return at ? -1 : 1;
  return a.name.localeCompare(b.name);
}

// Regroup the pairwise `clashes` ({ a, b, shared }) into connected components —
// any sets joined by an overlap edge become one "overlap window". A popular set
// that overlaps several others appears ONCE in its cluster instead of repeating
// across N pairs. Returns each cluster sorted by start time:
//   { sets:[…sorted], window:[startMin,endMin], shared:[…people] }
function conflictClusters(clashes) {
  if (!clashes.length) return [];
  const setById = new Map();   // id → set object
  const adj = new Map();       // id → Set(neighbour ids)
  const edgeShared = new Map(); // id → Set(people sharing any of its edges)
  const link = (id) => { if (!adj.has(id)) adj.set(id, new Set()); if (!edgeShared.has(id)) edgeShared.set(id, new Set()); };
  for (const { a, b, shared } of clashes) {
    setById.set(a.id, a); setById.set(b.id, b);
    link(a.id); link(b.id);
    adj.get(a.id).add(b.id); adj.get(b.id).add(a.id);
    for (const p of shared) { edgeShared.get(a.id).add(p); edgeShared.get(b.id).add(p); }
  }

  const seen = new Set();
  const clusters = [];
  for (const id of adj.keys()) {
    if (seen.has(id)) continue;
    // BFS the component.
    const queue = [id], comp = [];
    seen.add(id);
    while (queue.length) {
      const cur = queue.shift();
      comp.push(cur);
      for (const nb of adj.get(cur)) if (!seen.has(nb)) { seen.add(nb); queue.push(nb); }
    }
    const compSets = comp.map(cid => setById.get(cid)).sort((x, y) => sortKey(x) - sortKey(y) || x.name.localeCompare(y.name));
    let lo = Infinity, hi = -Infinity;
    const shared = new Set();
    for (const cid of comp) {
      const [st, en] = normSpan(setById.get(cid));
      if (st < lo) lo = st;
      if (en > hi) hi = en;
      for (const p of edgeShared.get(cid)) shared.add(p);
    }
    clusters.push({ sets: compSets, window: [lo, hi], shared: PEOPLE.filter(p => shared.has(p)) });
  }
  // Earliest window first.
  return clusters.sort((c1, c2) => c1.window[0] - c2.window[0]);
}

// minutes-since-midnight → "HH:MM" (clusters can run past 24:00 → wrap).
function minToLabel(m) {
  const mm = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
}

// ── Change tag ───────────────────────────────────────────────
// Tiny pill that flags how an entry differs from the previous roster
// after the official sync: NEW (added), EDITED (renamed), REMOVED (dropped).
function StatusPill({ status, accent = tmrwGold }) {
  const map = {
    new:     { label: 'NEW',     bg: accent,       fg: tmrwBg,    border: 'none' },
    edited:  { label: 'EDITED',  bg: 'transparent', fg: bodyMuted, border: `1px solid ${rule}` },
    deleted: { label: 'REMOVED', bg: 'transparent', fg: bodyMuted, border: `1px solid ${rule}` },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span style={{
      ...mono, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.08em',
      lineHeight: 1, padding: '2.5px 5px', borderRadius: 4, flexShrink: 0,
      backgroundColor: s.bg, color: s.fg, border: s.border,
    }}>{s.label}</span>
  );
}

// ── Shared artist row ────────────────────────────────────────
function ArtistRow({ set, myColor, myPick, others, isClash, showStage, onToggle }) {
  const stageColor = STAGES[set.stage]?.color || tmrwGold;
  const deleted = set.status === 'deleted';

  // Dropped from the lineup — kept visible, struck through, not pickable.
  if (deleted) {
    return (
      <div aria-label={`${set.name}, removed from the lineup`}
        style={{
          minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '10px 16px', borderTop: `1px solid ${rule}55`, opacity: 0.6,
        }}>
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: muted, letterSpacing: '-0.01em', textDecoration: 'line-through' }}>
            {set.name}
          </span>
          <StatusPill status="deleted" />
        </div>
      </div>
    );
  }

  return (
    <button onClick={onToggle} aria-pressed={myPick} aria-label={`${set.name}, ${set.stage}${set.status === 'new' ? ', newly added' : ''}`}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer', minHeight: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        padding: '10px 16px', border: 'none', borderTop: `1px solid ${rule}55`,
        backgroundColor: myPick ? tmrwBg : 'transparent',
        boxShadow: myPick ? `inset 3px 0 12px -6px ${myColor}99` : 'none',
        transition: 'background-color var(--dur-press) var(--ease-out)',
      }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: myPick ? myColor : ink, letterSpacing: '-0.01em', transition: 'color var(--dur-base) var(--ease-out)' }}>
            {set.name}
          </span>
          {(set.status === 'new' || set.status === 'edited') && <StatusPill status={set.status} accent={myColor} />}
        </div>
        <div style={{ ...mono, fontSize: 10, color: myPick ? bodyMuted : muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {showStage && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: stageColor, display: 'inline-block' }} />
              <span style={{ color: myPick ? bodyMuted : muted }}>{set.stage}</span>
            </span>
          )}
          <span>{timeLabel(set)}</span>
          {isClash && <span style={{ color: clashRed, fontWeight: 700 }}>⚡ OVERLAP</span>}
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
            <svg width="11" height="11" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke={checkInk} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
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

  // Keep the toast mounted through its slide-out; remember its content so the
  // exit frame still has a message after `toast` clears.
  const toastRef = useRef(null);
  if (toast) toastRef.current = toast;
  const toastPresent = usePresence(!!toast, 240);
  const shownToast = toast || toastRef.current;

  // Presence for the reveal popovers so they animate in AND out.
  const whoPresent    = usePresence(whoOpen, 200);
  const searchPresent = usePresence(searchOpen, 200);

  // Remember which person this device is, so you don't re-pick each visit.
  useEffect(() => { try { localStorage.setItem(ME_KEY, activePerson); } catch {} }, [activePerson]);

  const q = search.trim().toLowerCase();
  const myColor = PERSON_COLORS[activePerson];
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
      .map(stage => ({ stage, sets: browseSets.filter(s => s.stage === stage).sort(stageOrder) }))
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

  const dayCount = useMemo(() => sets.filter(s => s.day === activeDay && s.status !== 'deleted').length, [activeDay]);
  const browseLiveCount = useMemo(() => browseSets.filter(s => s.status !== 'deleted').length, [browseSets]);

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
  // Regroup pairwise clashes into time-window clusters for the Overlaps view.
  const clusters = useMemo(() => conflictClusters(clashes), [clashes]);

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
      picks={picks} togglePick={togglePick} onExit={() => setParty(false)}
    />
  );

  return (
    <div style={{ ...sans }}>
      {/* Molten-gold liquid frame around the whole Lineup (Cage edition) */}
      <div style={{ borderRadius: 16, padding: 2, background: FRAME[activePerson] || FRAME.Grant, boxShadow: `0 0 0 1px ${myColor}40, 0 8px 40px rgba(6,9,24,0.6)` }}>
      <div style={{ borderRadius: 14, background: 'linear-gradient(180deg, #141d3e 0%, #0f1636 100%)', padding: '18px 14px', boxShadow: `inset 0 0 24px rgba(8,12,32,0.6), inset 0 1px 0 ${myColor}26` }}>
      {/* Consciencia — the Cage poster's painterly night sky in a band: deep
          indigo depth with soft nebula light → a molten-gold horizon glow. */}
      <div className="fx-enter" style={{
        position: 'relative', height: 124, marginBottom: 16, borderRadius: 12, overflow: 'hidden',
        background: 'linear-gradient(180deg, #0c1226 0%, #16204a 50%, #20183a 100%)',
      }}>
        {/* painterly indigo/violet nebula — soft blurred light */}
        <div aria-hidden="true" style={{ position: 'absolute', top: 6,  left: '8%',  width: 150, height: 38, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(120,150,230,0.5), rgba(120,150,230,0))', filter: 'blur(12px)' }} />
        <div aria-hidden="true" style={{ position: 'absolute', top: 30, left: '60%', width: 170, height: 42, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(150,120,210,0.45), rgba(150,120,210,0))', filter: 'blur(14px)' }} />
        {/* molten-gold horizon glow at the base (ties to the frame) */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(closest-side at 50% 100%, rgba(240,210,120,0.55), rgba(240,210,120,0) 62%)' }} />
        {/* legibility halo behind the wordmark */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 58% 54% at 50% 45%, rgba(6,9,24,0.45), rgba(6,9,24,0) 72%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <TomorrowlandMark color="#f0d27a" style={{ width: 30, height: 30, marginBottom: 6, filter: 'drop-shadow(0 1px 6px rgba(6,9,24,0.8))' }} />
          <div style={{ ...display, fontSize: 31, fontWeight: 700, letterSpacing: '0.03em', lineHeight: 1, color: '#f7e6b0', textShadow: '0 1px 12px rgba(6,9,24,0.85)', fontVariationSettings: '"SOFT" 30, "opsz" 144' }}>Consciencia</div>
          <div style={{ ...mono, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.3em', color: 'rgba(242,236,220,0.92)', marginTop: 7, textShadow: '0 1px 6px rgba(6,9,24,0.7)' }}>TOMORROWLAND · BELGIUM 2026</div>
        </div>
      </div>

      {/* One-time tip — slim and dismissible, not a dominant panel */}
      {LINEUP_STATUS !== 'official' && !tipDismissed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 6px 6px 12px' }}>
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
                borderBottom: `2px solid ${active ? myColor : 'transparent'}`,
                color: active ? ink : muted,
                ...mono, fontWeight: 700, textTransform: 'uppercase', transition: 'transform var(--dur-press) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-base) var(--ease-out)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              }}>
              <span aria-hidden="true" style={{ fontSize: 8, letterSpacing: '0.16em', color: active ? myColor : muted, transition: 'color var(--dur-base) var(--ease-out)' }}>Day {i + 1}</span>
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
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 48, padding: '10px 14px', borderRadius: 8, border: `1px solid ${rule}`, backgroundColor: tmrwBg, color: myColor, ...sans, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: myColor, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activePerson}</span>
            </span>
            <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1, color: muted, transform: whoOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease-in-out)', flexShrink: 0 }}>▾</span>
          </button>

          {whoPresent && (
            <div role="listbox" aria-label="Switch person" data-open={whoOpen} className="fx-pop" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30, border: `1px solid ${rule}`, borderRadius: 8, overflow: 'hidden', backgroundColor: tmrwBg, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              {PEOPLE.map((person, i) => {
                const active = activePerson === person;
                const ink2 = PERSON_COLORS[person];
                return (
                  <button key={person} role="option" aria-selected={active}
                    onClick={() => { setActivePerson(person); setWhoOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      minHeight: 48, padding: '10px 14px', border: 'none',
                      borderTop: i === 0 ? 'none' : `1px solid ${rule}55`,
                      backgroundColor: active ? `${ink2}22` : 'transparent', color: ink2,
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
          style={{ flexShrink: 0, minHeight: 48, padding: '0 16px', borderRadius: 8, border: `1px solid ${tmrwBg}`, backgroundColor: tmrwBg, color: myColor, ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'color var(--dur-base) var(--ease-out)' }}>
          <span aria-hidden="true">🌙</span> Party mode
        </button>
      </div>

      {/* View by + live sync status — one line */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <span style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>View by</span>
        <span title={status === 'error' ? 'Offline — showing last synced picks' : 'Synced with the crew'}
          style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 4, color: status === 'error' ? clashRed : status === 'ready' ? '#5cb85c' : muted, transition: 'color var(--dur-fast) var(--ease-out)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: status === 'error' ? clashRed : status === 'ready' ? '#5cb85c' : muted, display: 'inline-block', transition: 'background-color var(--dur-fast) var(--ease-out)' }} />
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
                backgroundColor: active ? myColor : 'transparent', color: active ? tmrwBg : muted,
                ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                transition: 'transform var(--dur-press) var(--ease-out), background-color var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)',
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
              {browseLiveCount}{browseLiveCount !== dayCount ? ` / ${dayCount}` : ''} artists · {groups.length} stage{groups.length === 1 ? '' : 's'}
            </span>
            <button onClick={() => setSearchOpen(o => !o)} aria-expanded={searchOpen} aria-label="Search artists"
              style={{ marginLeft: 'auto', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', color: searchOpen ? ink : muted, fontSize: 17, cursor: 'pointer' }}>⌕</button>
            {!forceOpen && (
              <button onClick={() => setOpenStages(openStages.size >= groups.length ? new Set() : new Set(STAGE_ORDER))}
                style={{ minHeight: 40, padding: '0 4px', border: 'none', background: 'none', color: myColor, ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'color var(--dur-base) var(--ease-out)' }}>
                {openStages.size >= groups.length ? 'Collapse all' : 'Expand all'}
              </button>
            )}
          </div>
          {searchPresent && (
            <div data-open={searchOpen} className="fx-pop" style={{ position: 'relative', marginBottom: 12 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: muted, pointerEvents: 'none' }}>⌕</span>
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search artists…"
                type="search" inputMode="search" aria-label="Search artists"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 38px 10px 30px', minHeight: 44, borderRadius: 8, border: `1px solid ${rule}`, backgroundColor: tmrwBg, color: ink, fontSize: 16, ...sans }} />
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
          {groups.map(({ stage, sets: stageSets }, idx) => {
            const color = STAGES[stage]?.color || tmrwGold;
            const open  = forceOpen || openStages.has(stage);
            const pickedSets = stageSets.filter(s => picks[s.id]?.[activePerson]);
            const picked = pickedSets.length;
            const newCount  = stageSets.filter(s => s.status === 'new').length;
            const liveCount = stageSets.filter(s => s.status !== 'deleted').length;
            return (
              <section key={stage} className="fx-enter" style={{ animationDelay: `${Math.min(idx, 8) * 40}ms`, borderRadius: 10, border: `1px solid ${rule}`, overflow: 'hidden', backgroundColor: paper }}>
                <button onClick={() => !forceOpen && toggleStage(stage)} aria-expanded={open}
                  aria-label={`${stage}, ${liveCount} artists${newCount > 0 ? `, ${newCount} newly added` : ''}${picked > 0 ? `, ${picked} of your picks` : ''}`}
                  style={{ width: '100%', textAlign: 'left', cursor: forceOpen ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', minHeight: 44, border: 'none', background: 'none' }}>
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
                  <span aria-hidden="true" style={{ ...display, fontSize: 16, fontWeight: 700, color: ink, letterSpacing: '0.01em', flex: 1 }}>{stage}</span>
                  {newCount > 0 && (
                    <span aria-hidden="true" style={{ ...mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: tmrwBg, backgroundColor: myColor, borderRadius: 999, padding: '2.5px 7px', transition: 'background-color var(--dur-base) var(--ease-out)' }}>+{newCount} NEW</span>
                  )}
                  {picked > 0 && (
                    <span aria-hidden="true" style={{ ...mono, fontSize: 10, fontWeight: 700, color: tmrwBg, backgroundColor: myColor, borderRadius: 999, padding: '2px 7px' }}>★ {picked}</span>
                  )}
                  <span aria-hidden="true" style={{ ...mono, fontSize: 11, color: muted }}>{liveCount}</span>
                  <span aria-hidden="true" style={{ fontSize: 11, color: muted, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease-in-out)' }}>▶</span>
                </button>
                {open && (
                  <div className="fx-collapse" data-open="true">
                    <div style={{ borderTop: `1px solid ${rule}` }}>
                      {stageSets.map(set => <ArtistRow key={set.id} {...rowProps(set)} showStage={false} />)}
                      {picked > 0 && <StageSpotify stage={stage} pickedSets={pickedSets} onCopied={notify} />}
                    </div>
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
              ⏱ Set times not announced yet — showing alphabetically. This view becomes a chronological timeline (with overlap highlighting) once times drop.
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
              <div key={person} style={{ flex: 1, minWidth: 90, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', borderRadius: 8, backgroundColor: PERSON_COLORS[person] }}>
                <span style={{ ...sans, fontSize: 12, fontWeight: 700, color: tmrwBg }}>{person}</span>
                <span style={{ ...mono, fontSize: 14, fontWeight: 700, color: tmrwBg }}>{totalPicks[person]}</span>
              </div>
            ))}
          </div>
          {/* Overlaps — shared picks that land at the same time */}
          <div>
            <div style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>⚡ Overlaps</div>
            {!dayHasTimes ? (
              <div style={{ ...mono, fontSize: 11, color: muted, padding: '10px 12px', border: `1px solid ${rule}`, borderRadius: 8 }}>
                No overlaps to flag yet — set times aren’t announced. Shared picks that land at the same time show up here once times drop.
              </div>
            ) : clashes.length === 0 ? (
              <div style={{ ...mono, fontSize: 11, color: muted, padding: '10px 12px', border: `1px solid ${rule}`, borderRadius: 8 }}>
                No overlaps — none of your shared picks land at the same time. 🎉
              </div>
            ) : (
              <ConflictCombo clusters={clusters} picks={picks} me={activePerson} />
            )}
          </div>

          {/* All three */}
          <CrewSection title={`Everyone (${PEOPLE.length}/3)`} accent={myColor} items={crew.all3} emptyText="No artist all three of you picked yet." picks={picks} />
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
      </div>
      </div>

      {/* Bottom-screen toast — copy confirmations, undo, etc. Slides up on
          enter and back down on exit (same direction) via .fx-toast. */}
      {toastPresent && shownToast && (
        <div role="status" data-open={!!toast} className="fx-toast"
          style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom))', maxWidth: 648, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderRadius: 10, backgroundColor: '#0c1126', color: '#f2ecdc', zIndex: 60, boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
          <span style={{ ...sans, fontSize: 13 }}>{shownToast.msg}</span>
          {shownToast.action && (
            <button onClick={() => { shownToast.action.run(); setToast(null); }}
              style={{ minHeight: 44, padding: '0 6px', border: 'none', background: 'none', color: myColor, ...mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', flexShrink: 0 }}>
              {shownToast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Overlaps view ────────────────────────────────────────────
// The Crew "Overlaps" section: shared picks that land at the same time, grouped
// into time-window clusters. Collapsed rows list the clashing artists; expanding
// a window reveals a mini Gantt so the overlap is obvious at a glance.

// Small reusable cluster of colour-coded person dots.
function PersonDots({ people, size = 8 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      {people.map(p => (
        <span key={p} title={p} aria-label={p} style={{ width: size, height: size, borderRadius: '50%', backgroundColor: PERSON_COLORS[p], display: 'inline-block' }} />
      ))}
    </span>
  );
}

// Mini Gantt body for one cluster — hour ticks + a positioned bar per set,
// shown when an overlap window is expanded.
function ClusterGantt({ cl, picks }) {
  const [lo, hi] = cl.window;
  const span = Math.max(hi - lo, 1);
  const ticks = [];
  for (let t = Math.ceil(lo / 60) * 60; t <= hi; t += 60) ticks.push(t);
  return (
    <>
      {/* hour grid labels */}
      <div style={{ position: 'relative', height: 12, marginBottom: 2 }}>
        {ticks.map(t => (
          <span key={t} style={{ position: 'absolute', left: `${((t - lo) / span) * 100}%`, transform: 'translateX(-50%)', ...mono, fontSize: 8, color: muted }}>{minToLabel(t)}</span>
        ))}
      </div>
      {cl.sets.map(s => {
        const [st, en] = normSpan(s);
        const left = ((st - lo) / span) * 100;
        const width = Math.max(((en - st) / span) * 100, 6);
        const stageColor = STAGES[s.stage]?.color || tmrwGold;
        const pickers = PEOPLE.filter(p => picks[s.id]?.[p]);
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <PersonDots people={pickers} size={6} />
            <div style={{ position: 'relative', flex: 1, height: 22, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: `${width}%`, backgroundColor: `${stageColor}33`, borderLeft: `3px solid ${stageColor}`, borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 6px' }}>
                <span style={{ ...sans, fontSize: 11, fontWeight: 600, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

// The Overlaps view — collapsible per-window rows (time + clashing artist names +
// who's affected); expand a window to reveal its mini Gantt. `me` is the active
// person, highlighted so you spot your own overlaps first.
function ConflictCombo({ clusters, picks, me }) {
  const [open, setOpen] = useState(() => new Set());
  const perPerson = PEOPLE.map(p => ({ p, n: clusters.filter(cl => cl.shared.includes(p)).length })).filter(x => x.n > 0);
  const toggle = (i) => setOpen(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; });
  // First two artist names, then "+N" — readable in one collapsed row.
  const names = (cl) => {
    const ns = cl.sets.map(s => s.name);
    return ns.length <= 2 ? ns.join(', ') : `${ns.slice(0, 2).join(', ')} +${ns.length - 2}`;
  };
  return (
    <div style={{ border: `1px solid ${clashRed}55`, borderRadius: 10, overflow: 'hidden', backgroundColor: tmrwBg }}>
      {/* Header: how many to sort out + who's affected (you, ringed) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 12px', backgroundColor: `${clashRed}14`, borderBottom: `1px solid ${rule}` }}>
        <span style={{ ...sans, fontSize: 13, fontWeight: 700, color: ink }}>⚡ {clusters.length} to resolve</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {perPerson.map(({ p, n }) => {
            const isMe = p === me;
            return (
              <span key={p} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, ...mono, fontSize: 10, fontWeight: 700,
                color: isMe ? tmrwBg : PERSON_COLORS[p], backgroundColor: isMe ? PERSON_COLORS[p] : 'transparent',
                borderRadius: 999, padding: isMe ? '2px 7px' : '2px 0',
              }}>
                {!isMe && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: PERSON_COLORS[p] }} />}
                {isMe ? 'You' : p} {n}
              </span>
            );
          })}
        </span>
      </div>
      {clusters.map((cl, i) => {
        const isOpen = open.has(i);
        return (
          <div key={i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${rule}55` }}>
            <button onClick={() => toggle(i)} aria-expanded={isOpen}
              aria-label={`${minToLabel(cl.window[0])} to ${minToLabel(cl.window[1])}: ${cl.sets.map(s => s.name).join(', ')}. Tap to ${isOpen ? 'collapse' : 'expand'}.`}
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', minHeight: 44, border: 'none', background: 'none' }}>
              <span aria-hidden="true" style={{ fontSize: 10, color: muted, flexShrink: 0, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease-in-out)' }}>▶</span>
              <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: ink, flexShrink: 0, whiteSpace: 'nowrap' }}>{minToLabel(cl.window[0])}–{minToLabel(cl.window[1])}</span>
              <span style={{ ...sans, fontSize: 13, fontWeight: 600, color: ink, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{names(cl)}</span>
              <PersonDots people={cl.shared} size={7} />
            </button>
            {isOpen && (
              <div style={{ padding: '6px 12px 12px', borderTop: `1px solid ${rule}33` }}>
                <div style={{ ...mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: clashRed, marginBottom: 6 }}>Same time — pick one</div>
                <ClusterGantt cl={cl} picks={picks} />
              </div>
            )}
          </div>
        );
      })}
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
              <div key={set.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderTop: `1px solid ${rule}55` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: ink }}>{set.name}</div>
                  <div style={{ ...mono, fontSize: 10, color: muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: stageColor, display: 'inline-block' }} />
                    {set.stage} · {timeLabel(set)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {(showWho ? pickers : []).map(p => (
                    <span key={p} title={p} style={{ ...mono, fontSize: 9, fontWeight: 700, color: tmrwBg, backgroundColor: PERSON_COLORS[p], borderRadius: 3, padding: '2px 5px' }}>{p[0]}</span>
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

// ── Spotify prompt ───────────────────────────────────────────
// Builds a STATIC text prompt (no AI, no API) from a person's picks. The user
// copies it and pastes it into Spotify's AI Playlist box in the mobile app.

// Real, playable artist names: deduped, TBA placeholders dropped, sorted.
function artistNames(mySets) {
  return [...new Set(mySets.filter(s => s.status !== 'deleted').map(s => s.name))]
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
          style={{ marginTop: 12, width: '100%', boxSizing: 'border-box', minHeight: 130, padding: 12, borderRadius: 8, border: `1px solid ${rule}`, backgroundColor: tmrwBg, color: ink, fontSize: 16, ...sans, lineHeight: 1.45, resize: 'vertical' }} />
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
    <div style={{ borderTop: `1px solid ${rule}`, padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.04)' }}>
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
          style={{ marginTop: 10, width: '100%', boxSizing: 'border-box', minHeight: 110, padding: 10, borderRadius: 8, border: `1px solid ${rule}`, backgroundColor: tmrwBg, color: ink, fontSize: 16, ...sans, lineHeight: 1.45, resize: 'vertical' }} />
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

function PartyMode({ activePerson, setActivePerson, activeDay, setActiveDay, picks, togglePick, onExit }) {
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
