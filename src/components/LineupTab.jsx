import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CaretDown, Check, MusicNotes, Moon, X } from '@phosphor-icons/react';
import { usePresence } from '../hooks/usePresence.js';
import { sets, STAGES, PEOPLE, LINEUP_STATUS } from '../data/lineup.js';
import { usePicks } from '../hooks/usePicks.js';
import { useLineupOverrides } from '../hooks/useLineupOverrides.js';
import { useCrewStatus } from '../hooks/useCrewStatus.js';
import { TomorrowlandMark } from './BrandMarks.jsx';
import {
  mono, sans, display, tmrwBg, bar, chip, paper, ink, muted, rule, clashRed, tmrwGold, goldLit, live,
  shPanel, PERSON_COLORS, DAYS, VIEWS, STAGE_ORDER, ME_KEY,
} from './lineup/theme.js';
import { hasTime, sortKey, timesOverlap, stageOrder, conflictClusters, applyOverrides } from './lineup/time.js';
import SpotifyExport from './lineup/SpotifyExport.jsx';
import PartyMode from './lineup/PartyMode.jsx';
import StageView from './lineup/views/StageView.jsx';
import TimeView from './lineup/views/TimeView.jsx';
import CrewView from './lineup/views/CrewView.jsx';

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
  const exitParty = useCallback(() => setParty(false), []);
  const [tipDismissed, setTipDismissed] = useState(() => {
    try { return localStorage.getItem('tml2026_tip') === '1'; } catch { return false; }
  });

  // Shared picks, synced to the server in near-real-time.
  const { picks, status, togglePick, clearMine, restoreMine, online, syncing, pendingCount } = usePicks();
  // Live set-time overrides, layered onto the bundled lineup at runtime so the
  // crew can fix a revised timetable without a redeploy (falls back to bundled
  // baseline times offline). All the day/timeline/clash memos derive from this.
  const { overrides, publish: publishOverrides } = useLineupOverrides();
  const effectiveSets = useMemo(() => applyOverrides(sets, overrides), [overrides]);
  // In-app set-time editor (Time view). Open to anyone — same trust model as the
  // shared picks. Toggling on swaps the Time view to the full day's timetable,
  // editable, and stages edits until published.
  const [editTimes, setEditTimes] = useState(false);
  // Lightweight crew status board (where are you / what are you doing).
  const crewStatus = useCrewStatus();
  // Unified bottom-screen toast. { msg, action?: { label, run }, duration }
  const [toast, setToast] = useState(null);
  const notify = useCallback((msg, opts) => setToast({ msg, duration: 2500, ...opts }), []);

  // When the offline outbox finishes draining (N>0 → 0), reassure the user
  // their queued picks made it to the crew.
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

  // Keep the toast mounted through its slide-out; remember its content so the
  // exit frame still has a message after `toast` clears.
  const toastRef = useRef(null);
  if (toast) toastRef.current = toast;
  const toastPresent = usePresence(!!toast, 240);
  const shownToast = toast || toastRef.current;

  // Presence for the reveal popovers so they animate in AND out.
  const whoPresent    = usePresence(whoOpen, 200);
  const searchPresent = usePresence(searchOpen, 200);

  // Identity menu — close on Escape / outside tap, and return focus to its
  // trigger so keyboard users aren't stranded (WCAG 2.4.3 / 2.1.2).
  const whoBtnRef  = useRef(null);
  const whoMenuRef = useRef(null);
  useEffect(() => {
    if (!whoOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') { setWhoOpen(false); whoBtnRef.current?.focus(); } };
    const onDown = (e) => {
      if (whoMenuRef.current?.contains(e.target) || whoBtnRef.current?.contains(e.target)) return;
      setWhoOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [whoOpen]);

  // Restore focus to the Party-mode trigger when party mode closes.
  const partyBtnRef = useRef(null);
  const prevParty = useRef(false);
  useEffect(() => {
    if (prevParty.current && !party) partyBtnRef.current?.focus();
    prevParty.current = party;
  }, [party]);

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

  // STAGE (browse) — every artist for the day, search-filtered. Your picks
  // highlight inline for whoever the "I'm ___" dropdown says you are.
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

  // TIME (my plan) — the dropdown person's picks for the day, in time order.
  // No separate "my picks" filter: the dropdown IS the lens.
  const timeline = useMemo(() => {
    const arr = effectiveSets.filter(s => s.day === activeDay && picks[s.id]?.[activePerson]);
    if (dayHasTimes) arr.sort((a, b) => sortKey(a) - sortKey(b) || a.name.localeCompare(b.name));
    else arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [activeDay, picks, activePerson, dayHasTimes, effectiveSets]);

  // Full day's timetable (all stages, time-ordered) for the Time view's edit
  // mode — so any official time can be corrected, not just picked sets.
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

  // Stable per-set prop factory so memoized ArtistRows don't re-render on every
  // 5s picks-poll. Recomputes only when the picks/person/clashes actually change.
  const rowProps = useCallback((set) => ({
    set, myColor,
    myPick: picks[set.id]?.[activePerson] || false,
    others: PEOPLE.filter(p => p !== activePerson && picks[set.id]?.[p]),
    isClash: clashSetIds.has(set.id),
    onToggle: () => togglePick(set.id, activePerson),
  }), [picks, activePerson, myColor, clashSetIds, togglePick]);

  // Party mode takes over the whole screen — render it instead of the planner.
  // Stable onExit so PartyMode's scroll-lock effect doesn't re-run on each poll.
  if (party) return (
    <PartyMode
      sets={effectiveSets}
      activePerson={activePerson} setActivePerson={setActivePerson}
      activeDay={activeDay} setActiveDay={setActiveDay}
      picks={picks} togglePick={togglePick} onExit={exitParty}
    />
  );

  const crewCount = crew.all3.length + crew.two.length;

  return (
    <div style={{ ...sans }}>
      {/* Content sits directly on the App's midnight atmosphere — borderless,
          no competing panel fill (Direction D). */}
      <div>
      <div style={{ padding: '14px 4px' }}>
      {/* Consciencia — the Cage poster's painterly night sky in a band: deep
          indigo depth with soft nebula light → a molten-gold horizon glow. */}
      <div className="fx-enter" style={{
        position: 'relative', height: 124, marginBottom: 16, borderRadius: 16, overflow: 'hidden',
        background: 'linear-gradient(180deg, #070b1c 0%, #0c1228 55%, #10162e 100%)',
      }}>
        {/* painterly indigo/violet nebula — soft blurred light */}
        <div aria-hidden="true" style={{ position: 'absolute', top: 6,  left: '8%',  width: 150, height: 38, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(120,150,230,0.5), rgba(120,150,230,0))', filter: 'blur(12px)' }} />
        <div aria-hidden="true" style={{ position: 'absolute', top: 30, left: '60%', width: 170, height: 42, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(150,120,210,0.45), rgba(150,120,210,0))', filter: 'blur(14px)' }} />
        {/* molten-gold horizon glow at the base (ties to the frame) */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(closest-side at 50% 100%, rgba(240,210,120,0.55), rgba(240,210,120,0) 62%)' }} />
        {/* legibility halo behind the wordmark */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 58% 54% at 50% 45%, rgba(6,9,24,0.45), rgba(6,9,24,0) 72%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <TomorrowlandMark color={goldLit} style={{ width: 30, height: 30, marginBottom: 6, filter: 'drop-shadow(0 1px 6px rgba(6,9,24,0.8))' }} />
          <h2 style={{ ...display, fontSize: 'clamp(34px, 11vw, 42px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1, color: goldLit, textShadow: '0 1px 12px rgba(6,9,24,0.85)', fontVariationSettings: '"SOFT" 30, "opsz" 144', margin: 0, whiteSpace: 'nowrap' }}>Consciencia</h2>
          <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', color: 'rgba(242,236,220,0.92)', marginTop: 7, textShadow: '0 1px 6px rgba(6,9,24,0.7)' }}>TOMORROWLAND · BELGIUM 2026</div>
        </div>
      </div>

      {/* One-time tip — slim and dismissible, not a dominant panel */}
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
          <button ref={whoBtnRef} onClick={() => setWhoOpen(o => !o)} aria-expanded={whoOpen} aria-haspopup="listbox"
            aria-label={`I'm ${activePerson}. Tap to change who's using this device.`}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 48, padding: '10px 14px', borderRadius: 11, border: 'none', backgroundColor: chip, color: myColor, ...sans, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: myColor, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activePerson}</span>
            </span>
            <CaretDown aria-hidden="true" size={16} weight="bold" color={muted} style={{ transform: whoOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease-in-out)', flexShrink: 0 }} />
          </button>

          {whoPresent && (
            <div ref={whoMenuRef} role="listbox" aria-label="Switch person" data-open={whoOpen} className="fx-pop" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30, borderRadius: 11, overflow: 'hidden', backgroundColor: paper, boxShadow: shPanel }}>
              {PEOPLE.map((person, i) => {
                const active = activePerson === person;
                const ink2 = PERSON_COLORS[person];
                return (
                  <button key={person} role="option" aria-selected={active}
                    onClick={() => { setActivePerson(person); setWhoOpen(false); whoBtnRef.current?.focus(); }}
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
                    {active && <Check aria-hidden="true" size={15} weight="bold" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button ref={partyBtnRef} onClick={() => setParty(true)} aria-label="Enter party mode"
          style={{ flexShrink: 0, minHeight: 48, padding: '0 16px', borderRadius: 11, border: 'none', backgroundColor: chip, color: myColor, ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'color var(--dur-base) var(--ease-out)' }}>
          <Moon aria-hidden="true" size={14} weight="fill" /> Party mode
        </button>
      </div>

      {/* View by + live sync status — one line */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <span style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>View by</span>
        {(() => {
          // Queued local writes take priority in the chip — they're the thing
          // a user on bad signal needs reassurance about. Otherwise fall back to
          // the live/offline connection state.
          const queued = pendingCount > 0;
          const offline = !online || status === 'error';
          const color = queued ? tmrwGold : offline ? clashRed : status === 'ready' ? live : muted;
          const label = queued ? (syncing ? 'Syncing…' : `${pendingCount} to sync`)
            : offline ? 'Offline' : status === 'ready' ? 'Live' : 'Syncing';
          const aria = queued ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync — they'll send when you're back online`
            : offline ? 'Offline — showing last synced picks' : status === 'ready' ? 'Live — synced with the crew' : 'Syncing';
          return (
            <span role="status" aria-label={aria}
              style={{ ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 5, color, transition: 'color var(--dur-fast) var(--ease-out)' }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: color, display: 'inline-block', transition: 'background-color var(--dur-fast) var(--ease-out)' }} />
              {label}
            </span>
          );
        })()}
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
              {v.label}{v.id === 'crew' && crewCount > 0 ? ` ·${crewCount}` : ''}
            </button>
          );
        })}
      </div>

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
        <div role="status" aria-live="assertive" aria-atomic="true" data-open={!!toast} className="fx-toast"
          style={{ position: 'fixed', left: 'max(16px, env(safe-area-inset-left))', right: 'max(16px, env(safe-area-inset-right))', bottom: 'calc(16px + env(safe-area-inset-bottom))', maxWidth: 648, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderRadius: 13, backgroundColor: bar, color: ink, zIndex: 60, boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
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
