import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Check, MusicNotes, X, PaperPlaneTilt } from '@phosphor-icons/react';
import { usePresence } from '../hooks/usePresence.js';
import { sets, PEOPLE, LINEUP_STATUS } from '../data/lineup.js';
import { usePicks } from '../hooks/usePicks.js';
import { useLineupOverrides } from '../hooks/useLineupOverrides.js';
import { useCrewStatus } from '../hooks/useCrewStatus.js';
import { TomorrowlandMark } from './BrandMarks.jsx';
import {
  mono, sans, display, bar, chip, raised, ink, muted, tmrwGold, goldLit, live, clashRed,
  PERSON_COLORS, DAYS, STAGE_ORDER, ME_KEY,
} from './lineup/theme.js';
import { hasTime, sortKey, timesOverlap, stageOrder, conflictClusters, applyOverrides, minToLabel } from './lineup/time.js';
import SpotifyExport from './lineup/SpotifyExport.jsx';
import PartyMode from './lineup/PartyMode.jsx';
import TripBar from './lineup/TripBar.jsx';
import BottomSheet from './lineup/BottomSheet.jsx';
import ConflictCombo from './lineup/Overlaps.jsx';
import StageView from './lineup/views/StageView.jsx';
import TimeView from './lineup/views/TimeView.jsx';
import CrewView, { PRESETS } from './lineup/views/CrewView.jsx';

export default function LineupTab() {
  const [activeDay, setActiveDay]       = useState('fri');
  const [activePerson, setActivePerson] = useState(() => {
    try { const me = localStorage.getItem(ME_KEY); return PEOPLE.includes(me) ? me : 'Grant'; }
    catch { return 'Grant'; }
  });
  const [view, setView]                 = useState('stage');
  const [search, setSearch]             = useState('');
  const [openStages, setOpenStages]     = useState(() => new Set());
  const [searchOpen, setSearchOpen]     = useState(false);
  const [party, setParty]               = useState(false);
  const exitParty = useCallback(() => setParty(false), []);
  // Which Trip Bar sheet is open: null | 'person' | 'day' | 'overlaps' | 'nudge'.
  const [sheet, setSheet] = useState(null);
  const [nudgeText, setNudgeText] = useState('');
  const [tipDismissed, setTipDismissed] = useState(() => {
    try { return localStorage.getItem('tml2026_tip') === '1'; } catch { return false; }
  });

  // Shared picks, synced to the server in near-real-time.
  const { picks, status, togglePick, clearMine, restoreMine, online, syncing, pendingCount } = usePicks();
  // Live set-time overrides, layered onto the bundled lineup at runtime.
  const { overrides, publish: publishOverrides } = useLineupOverrides();
  const effectiveSets = useMemo(() => applyOverrides(sets, overrides), [overrides]);
  // In-app set-time editor (Time view).
  const [editTimes, setEditTimes] = useState(false);
  // Lightweight crew status board (where are you / what are you doing).
  const crewStatus = useCrewStatus();
  // Unified bottom-screen toast. { msg, action?: { label, run }, duration }
  const [toast, setToast] = useState(null);
  const notify = useCallback((msg, opts) => setToast({ msg, duration: 2500, ...opts }), []);

  // When the offline outbox finishes draining (N>0 → 0), reassure the user.
  const prevPending = useRef(pendingCount);
  useEffect(() => {
    if (prevPending.current > 0 && pendingCount === 0) notify('All changes synced');
    prevPending.current = pendingCount;
  }, [pendingCount, notify]);

  // Auto-dismiss the toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.duration || 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Keep the toast mounted through its slide-out.
  const toastRef = useRef(null);
  if (toast) toastRef.current = toast;
  const toastPresent = usePresence(!!toast, 240);
  const shownToast = toast || toastRef.current;

  // Presence for the search reveal so it animates in AND out.
  const searchPresent = usePresence(searchOpen, 200);

  // Remember which person this device is, so you don't re-pick each visit.
  useEffect(() => { try { localStorage.setItem(ME_KEY, activePerson); } catch {} }, [activePerson]);

  const q = search.trim().toLowerCase();
  const myColor = PERSON_COLORS[activePerson];
  const forceOpen = q.length > 0;
  const dayHasTimes = useMemo(() => effectiveSets.some(s => s.day === activeDay && hasTime(s)), [activeDay, effectiveSets]);
  const dayLabel = DAYS.find(d => d.id === activeDay)?.label || '';

  const toggleStage = useCallback((stage) => {
    setOpenStages(prev => {
      const next = new Set(prev);
      next.has(stage) ? next.delete(stage) : next.add(stage);
      return next;
    });
  }, []);

  // STAGE (browse) — every artist for the day, search-filtered.
  const browseSets = useMemo(() =>
    effectiveSets.filter(s => s.day === activeDay && (!q || s.name.toLowerCase().includes(q))),
    [activeDay, q, effectiveSets]
  );
  const groups = useMemo(() =>
    STAGE_ORDER
      .map(stage => ({ stage, sets: browseSets.filter(s => s.stage === stage).sort(stageOrder) }))
      .filter(g => g.sets.length > 0),
    [browseSets]
  );

  // TIME (my plan) — the active person's picks for the day, in time order.
  const timeline = useMemo(() => {
    const arr = effectiveSets.filter(s => s.day === activeDay && picks[s.id]?.[activePerson]);
    if (dayHasTimes) arr.sort((a, b) => sortKey(a) - sortKey(b) || a.name.localeCompare(b.name));
    else arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [activeDay, picks, activePerson, dayHasTimes, effectiveSets]);

  // Full day's timetable (all stages, time-ordered) for the Time view's edit mode.
  const daySets = useMemo(
    () => effectiveSets.filter(s => s.day === activeDay && s.status !== 'deleted').sort(stageOrder),
    [activeDay, effectiveSets]
  );

  const dayCount = useMemo(() => effectiveSets.filter(s => s.day === activeDay && s.status !== 'deleted').length, [activeDay, effectiveSets]);
  const browseLiveCount = useMemo(() => browseSets.filter(s => s.status !== 'deleted').length, [browseSets]);

  // Clash detection — dormant until set times exist.
  const clashes = useMemo(() => {
    const out = [];
    const ds = effectiveSets.filter(s => s.day === activeDay && hasTime(s));
    for (let i = 0; i < ds.length; i++) {
      for (let j = i + 1; j < ds.length; j++) {
        const a = ds[i], b = ds[j];
        if (a.stage === b.stage || !timesOverlap(a, b)) continue;
        const shared = PEOPLE.filter(p => picks[a.id]?.[p] && picks[b.id]?.[p]);
        if (shared.length) out.push({ a, b, shared });
      }
    }
    return out;
  }, [activeDay, picks, effectiveSets]);
  const clashSetIds = useMemo(() => new Set(clashes.flatMap(c => [c.a.id, c.b.id])), [clashes]);
  // Regroup pairwise clashes into time-window clusters for the Overlaps view.
  const clusters = useMemo(() => conflictClusters(clashes), [clashes]);
  const nextClashLabel = clusters.length ? minToLabel(clusters[0].window[0]) : null;

  // Crew consensus for the active day.
  const crew = useMemo(() => {
    const ds = effectiveSets.filter(s => s.day === activeDay);
    const all3 = [], two = [];
    for (const s of ds) {
      const pickers = PEOPLE.filter(p => picks[s.id]?.[p]);
      if (pickers.length === PEOPLE.length) all3.push({ set: s, pickers });
      else if (pickers.length === 2) two.push({ set: s, pickers });
    }
    return { all3, two };
  }, [activeDay, picks, effectiveSets]);

  const totalPicks = useMemo(() =>
    PEOPLE.reduce((acc, p) => { acc[p] = effectiveSets.filter(s => picks[s.id]?.[p]).length; return acc; }, {}),
    [picks, effectiveSets]
  );

  // The active person's full selection across all three days — feeds Spotify.
  const mySets = useMemo(() => effectiveSets.filter(s => picks[s.id]?.[activePerson]), [picks, activePerson, effectiveSets]);

  // Stable per-set prop factory so memoized ArtistRows don't re-render on every poll.
  const rowProps = useCallback((set) => ({
    set, myColor,
    myPick: picks[set.id]?.[activePerson] || false,
    others: PEOPLE.filter(p => p !== activePerson && picks[set.id]?.[p]),
    isClash: clashSetIds.has(set.id),
    onToggle: () => togglePick(set.id, activePerson),
  }), [picks, activePerson, myColor, clashSetIds, togglePick]);

  const sendNudge = (msg) => {
    const clean = (msg ?? nudgeText).trim();
    if (!clean) return;
    crewStatus.setStatus?.(activePerson, clean);
    setNudgeText('');
    setSheet(null);
    notify('Status shared with the crew');
  };

  // Party mode takes over the whole screen — render it instead of the planner.
  if (party) return (
    <PartyMode
      sets={effectiveSets}
      activePerson={activePerson} setActivePerson={setActivePerson}
      activeDay={activeDay} setActiveDay={setActiveDay}
      picks={picks} togglePick={togglePick} onExit={exitParty}
    />
  );

  const crewCount = crew.all3.length + crew.two.length;

  // Compact live-sync chip (relocated under the masthead).
  const queued = pendingCount > 0;
  const offline = !online || status === 'error';
  const syncColor = queued ? tmrwGold : offline ? clashRed : status === 'ready' ? live : muted;
  const syncLabel = queued ? (syncing ? 'Syncing…' : `${pendingCount} to sync`)
    : offline ? 'Offline' : status === 'ready' ? 'Live' : 'Syncing';
  const syncAria = queued ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync — they'll send when you're back online`
    : offline ? 'Offline — showing last synced picks' : status === 'ready' ? 'Live — synced with the crew' : 'Syncing';

  return (
    <div style={{ ...sans }}>
      {/* Content scrolls on the App's midnight atmosphere; the Trip Bar is pinned
          to the bottom (the thumb never travels). Bottom padding clears it. */}
      <div style={{ padding: '14px 4px 172px' }}>

        {/* Consciencia masthead */}
        <div className="fx-enter" style={{
          position: 'relative', height: 124, marginBottom: 12, borderRadius: 16, overflow: 'hidden',
          background: 'linear-gradient(180deg, #070b1c 0%, #0c1228 55%, #10162e 100%)',
        }}>
          <div aria-hidden="true" style={{ position: 'absolute', top: 6,  left: '8%',  width: 150, height: 38, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(120,150,230,0.5), rgba(120,150,230,0))', filter: 'blur(12px)' }} />
          <div aria-hidden="true" style={{ position: 'absolute', top: 30, left: '60%', width: 170, height: 42, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(150,120,210,0.45), rgba(150,120,210,0))', filter: 'blur(14px)' }} />
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(closest-side at 50% 100%, rgba(240,210,120,0.55), rgba(240,210,120,0) 62%)' }} />
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 58% 54% at 50% 45%, rgba(6,9,24,0.45), rgba(6,9,24,0) 72%)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <TomorrowlandMark color={goldLit} style={{ width: 30, height: 30, marginBottom: 6, filter: 'drop-shadow(0 1px 6px rgba(6,9,24,0.8))' }} />
            <h2 style={{ ...display, fontSize: 'clamp(34px, 11vw, 42px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1, color: goldLit, textShadow: '0 1px 12px rgba(6,9,24,0.85)', fontVariationSettings: '"SOFT" 30, "opsz" 144', margin: 0, whiteSpace: 'nowrap' }}>Consciencia</h2>
            <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', color: 'rgba(242,236,220,0.92)', marginTop: 7, textShadow: '0 1px 6px rgba(6,9,24,0.7)' }}>TOMORROWLAND · BELGIUM 2026</div>
          </div>
        </div>

        {/* Live-sync status — small, right-aligned under the masthead */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <span role="status" aria-label={syncAria}
            style={{ ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 5, color: syncColor, transition: 'color var(--dur-fast) var(--ease-out)' }}>
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: syncColor, display: 'inline-block', transition: 'background-color var(--dur-fast) var(--ease-out)' }} />
            {syncLabel}
          </span>
        </div>

        {/* One-time tip — slim and dismissible */}
        {LINEUP_STATUS !== 'official' && !tipDismissed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 6px 6px 12px' }}>
            <MusicNotes aria-hidden="true" size={15} color={muted} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: muted, lineHeight: 1.35, flex: 1 }}>
              Tap an artist to add it to your picks. Set times TBA.
            </span>
            <button onClick={() => { setTipDismissed(true); try { localStorage.setItem('tml2026_tip', '1'); } catch {} }}
              aria-label="Dismiss tip"
              style={{ flexShrink: 0, minWidth: 44, minHeight: 44, border: 'none', background: 'none', color: muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} weight="bold" /></button>
          </div>
        )}

        {/* The current view — content above the pinned bar */}
        <div key={view} className="fx-enter">
          {view === 'stage' && (
            <StageView
              groups={groups} browseLiveCount={browseLiveCount} dayCount={dayCount} forceOpen={forceOpen}
              search={search} setSearch={setSearch} searchOpen={searchOpen} setSearchOpen={setSearchOpen}
              searchPresent={searchPresent} openStages={openStages} setOpenStages={setOpenStages}
              toggleStage={toggleStage} myColor={myColor} picks={picks} activePerson={activePerson}
              rowProps={rowProps} notify={notify}
            />
          )}

          {view === 'time' && (
            <TimeView
              timeline={timeline} dayHasTimes={dayHasTimes} activePerson={activePerson}
              dayLabel={dayLabel} rowProps={rowProps} activeDay={activeDay} myColor={myColor}
              editTimes={editTimes} setEditTimes={setEditTimes} daySets={daySets}
              overrides={overrides} publishOverrides={publishOverrides} notify={notify}
            />
          )}

          {view === 'crew' && (
            <CrewView crew={crew} totalPicks={totalPicks} clashes={clashes} clusters={clusters}
              picks={picks} dayHasTimes={dayHasTimes} activePerson={activePerson} myColor={myColor}
              crewStatus={crewStatus} notify={notify} />
          )}
        </div>

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

      {/* ── Trip Bar — persistent bottom controls + morphing FAB ── */}
      <TripBar
        activePerson={activePerson} activeDay={activeDay} view={view} setView={setView}
        party={party} crewCount={crewCount} clashCount={clashes.length} nextClashLabel={nextClashLabel}
        onPerson={() => setSheet('person')} onDay={() => setSheet('day')} onParty={() => setParty(true)}
        onResolve={() => setSheet('overlaps')} onNudge={() => setSheet('nudge')}
      />

      {/* ── Trip Bar sheets ── */}
      {sheet === 'person' && (
        <BottomSheet title="Whose plan?" accent={myColor} onClose={() => setSheet(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PEOPLE.map(person => {
              const active = person === activePerson;
              const c = PERSON_COLORS[person];
              return (
                <button key={person} onClick={() => { setActivePerson(person); setSheet(null); }} aria-pressed={active}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '0 14px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left', backgroundColor: active ? raised : chip, ...sans }}>
                  <span aria-hidden="true" style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: c, color: '#0a0e22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>{person[0]}</span>
                  <span style={{ flex: 1, fontSize: 17, fontWeight: 700, color: active ? c : ink }}>{person}</span>
                  {active && <Check size={18} weight="bold" color={c} />}
                </button>
              );
            })}
          </div>
        </BottomSheet>
      )}

      {sheet === 'day' && (
        <BottomSheet title="Which day?" accent={tmrwGold} onClose={() => setSheet(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DAYS.map((day, i) => {
              const active = day.id === activeDay;
              return (
                <button key={day.id} onClick={() => { setActiveDay(day.id); setSheet(null); }} aria-pressed={active}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '0 14px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left', backgroundColor: active ? raised : chip }}>
                  <span style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: muted, width: 44 }}>DAY {i + 1}</span>
                  <span style={{ flex: 1, ...mono, fontSize: 17, fontWeight: 700, color: active ? goldLit : ink }}>{day.label}</span>
                  {active && <Check size={18} weight="bold" color={tmrwGold} />}
                </button>
              );
            })}
          </div>
        </BottomSheet>
      )}

      {sheet === 'overlaps' && (
        <BottomSheet title="Overlaps — same time, pick one" accent={clashRed} onClose={() => setSheet(null)}>
          {clusters.length === 0
            ? <div style={{ ...mono, fontSize: 12, color: muted, padding: '4px 2px 8px' }}>No overlaps right now.</div>
            : <ConflictCombo clusters={clusters} picks={picks} me={activePerson} />}
        </BottomSheet>
      )}

      {sheet === 'nudge' && (
        <BottomSheet title="Nudge the squad" accent={tmrwGold} onClose={() => setSheet(null)}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {PRESETS.map(preset => (
              <button key={preset} onClick={() => sendNudge(preset)}
                style={{ minHeight: 44, padding: '0 14px', borderRadius: 30, border: 'none', backgroundColor: chip, color: ink, ...sans, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {preset}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); sendNudge(); }} style={{ display: 'flex', gap: 8 }}>
            <input value={nudgeText} onChange={(e) => setNudgeText(e.target.value)} maxLength={80} autoFocus
              placeholder={`Share where you are, ${activePerson}…`} aria-label="Your status"
              style={{ flex: 1, minWidth: 0, minHeight: 48, padding: '0 14px', borderRadius: 12, border: 'none', backgroundColor: '#080c1e', color: ink, ...sans, fontSize: 16 }} />
            <button type="submit" disabled={!nudgeText.trim()} aria-label="Share status"
              style={{ flexShrink: 0, minHeight: 48, padding: '0 16px', borderRadius: 12, border: 'none', backgroundColor: nudgeText.trim() ? myColor : chip, color: '#0a0e22', ...sans, fontSize: 14, fontWeight: 700, cursor: nudgeText.trim() ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <PaperPlaneTilt size={15} weight="fill" /> Send
            </button>
          </form>
        </BottomSheet>
      )}

      {/* Bottom-screen toast */}
      {toastPresent && shownToast && (
        <div role="status" aria-live="assertive" aria-atomic="true" data-open={!!toast} className="fx-toast"
          style={{ position: 'fixed', left: 'max(16px, env(safe-area-inset-left))', right: 'max(16px, env(safe-area-inset-right))', bottom: 'calc(150px + env(safe-area-inset-bottom))', maxWidth: 648, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderRadius: 13, backgroundColor: bar, color: ink, zIndex: 60, boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
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
