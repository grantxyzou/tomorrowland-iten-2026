import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Check, MusicNotes, X, PaperPlaneTilt } from '@phosphor-icons/react';
import { usePresence } from '../hooks/usePresence.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { sets, LINEUP_STATUS } from '../data/lineup.js';
import { usePicks } from '../hooks/usePicks.js';
import { useLineupOverrides } from '../hooks/useLineupOverrides.js';
import { useCrewStatus } from '../hooks/useCrewStatus.js';
import { useGeoShare } from '../hooks/useGeoShare.js';
import { useHeading } from '../hooks/useHeading.js';
import TabHeader from './TabHeader.jsx';
import ConscienciaHeader from './lineup/ConscienciaHeader.jsx';
import {
  mono, sans, bar, chip, raised, ink, muted, tmrwGold, live, clashRed, spotifyDot,
  DAYS, STAGE_ORDER,
} from './lineup/theme.js';
import { hasTime, sortKey, timesOverlap, stageOrder, conflictClusters, applyOverrides } from './lineup/time.js';
import SpotifyExport from './lineup/SpotifyExport.jsx';
import PartyMode from './lineup/PartyMode.jsx';
import TripBar from './lineup/TripBar.jsx';
import BottomSheet from './lineup/BottomSheet.jsx';
import CrewMap from './lineup/CrewMap.jsx';
import ConflictCombo from './lineup/Overlaps.jsx';
import StageView from './lineup/views/StageView.jsx';
import TimeView from './lineup/views/TimeView.jsx';
import CrewView, { PRESETS } from './lineup/views/CrewView.jsx';
import { useGroup } from '../groups/GroupContext.jsx';

export default function LineupTab({ onOpenAccount, kicker, crewName, departureDate, updated, tabBar = null }) {
  const [activeDay, setActiveDay]       = useState('fri');
  // Identity comes from the signed-in session — you are always yourself.
  const { person: activePerson } = useAuth();
  const { members, colorFor, inkFor, activeGroupId } = useGroup();
  const crewNames = useMemo(() => members.map(m => m.displayName), [members]);
  const [view, setView]                 = useState('stage');
  const [search, setSearch]             = useState('');
  const [openStages, setOpenStages]     = useState(() => new Set());
  const [searchOpen, setSearchOpen]     = useState(false);
  const [party, setParty]               = useState(false);
  const exitParty = useCallback(() => setParty(false), []);
  // Which Trip Bar sheet is open:
  // null | 'day' | 'overlaps' | 'nudge' | 'spotify' | 'where'.
  // (The account menu lives in the shared App-level sheet via onOpenAccount.)
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
  // Opt-in, battery-conscious GPS sharing — samples only while the map sheet is
  // open. Drives the "Where's everyone" relative radar.
  const geo = useGeoShare({
    me: activePerson, active: sheet === 'where',
    setLocation: crewStatus.setLocation, clearLocation: crewStatus.clearLocation,
  });
  // Device compass heading — rotates the "Where's everyone" minimap heading-up.
  const heading = useHeading({ active: sheet === 'where' });
  // Enabling the map asks for location AND the compass in one gesture.
  const enableWhere = useCallback(() => { geo.enable(); heading.request(); }, [geo, heading]);
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

  const q = search.trim().toLowerCase();
  const myColor = colorFor(activePerson);
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
  const stageGroups = useMemo(() =>
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
        const shared = crewNames.filter(p => picks[a.id]?.[p] && picks[b.id]?.[p]);
        if (shared.length) out.push({ a, b, shared });
      }
    }
    return out;
  }, [activeDay, picks, effectiveSets, crewNames]);
  const clashSetIds = useMemo(() => new Set(clashes.flatMap(c => [c.a.id, c.b.id])), [clashes]);
  // Regroup pairwise clashes into time-window clusters for the Overlaps view.
  const clusters = useMemo(() => conflictClusters(clashes), [clashes]);

  // ── FAB "new activity" notification ──────────────────────────────────
  // Three live signals (overlaps / messages / location) diffed against a
  // per-crew baseline we re-stamp whenever the FAB is opened. Drives the
  // coloured dots on the closed FAB (TripBar). All exclude `activePerson`, so
  // your own actions never badge you.
  // Trip-wide clash pair-keys (the `clashes` memo above only covers activeDay).
  const tripClashKeys = useMemo(() => {
    const byDay = {};
    for (const s of effectiveSets) { if (hasTime(s)) (byDay[s.day] ||= []).push(s); }
    const keys = new Set();
    for (const day in byDay) {
      const ds = byDay[day];
      for (let i = 0; i < ds.length; i++) {
        for (let j = i + 1; j < ds.length; j++) {
          const a = ds[i], b = ds[j];
          if (a.stage === b.stage || !timesOverlap(a, b)) continue;
          if (crewNames.some(p => picks[a.id]?.[p] && picks[b.id]?.[p])) keys.add([a.id, b.id].sort().join('|'));
        }
      }
    }
    return keys;
  }, [effectiveSets, picks, crewNames]);
  // People currently sharing location (presence of the pin == sharing).
  const sharers = useMemo(
    () => Object.keys(crewStatus.locations || {}).filter(p => p !== activePerson),
    [crewStatus.locations, activePerson]
  );
  // Newest status/nudge post by anyone but me (server ts).
  const latestOtherStatusTs = useMemo(() => {
    const s = crewStatus.statuses || {};
    let max = 0;
    for (const p in s) { if (p !== activePerson && s[p]?.ts > max) max = s[p].ts; }
    return max;
  }, [crewStatus.statuses, activePerson]);

  // Baseline of what's already been seen, persisted per crew.
  const fabSeenKey = activeGroupId ? `tml2026_fab_seen_${activeGroupId}` : null;
  const [fabSeen, setFabSeen] = useState(null);
  // (Re)load the baseline when the crew changes.
  useEffect(() => {
    if (!fabSeenKey) return;
    try { setFabSeen(JSON.parse(localStorage.getItem(fabSeenKey) || 'null')); } catch { setFabSeen(null); }
  }, [fabSeenKey]);
  // Silently baseline a crew we've never stamped, so a fresh device never badges
  // on first load (only genuinely-new events after this do).
  useEffect(() => {
    if (!fabSeenKey || fabSeen) return;
    const snap = { seenAt: Date.now(), clashKeys: [...tripClashKeys], sharers };
    try { localStorage.setItem(fabSeenKey, JSON.stringify(snap)); } catch {}
    setFabSeen(snap);
  }, [fabSeenKey, fabSeen, tripClashKeys, sharers]);

  const newActivity = useMemo(() => {
    if (!fabSeen) return { overlap: false, message: false, location: false };
    const seenClash = new Set(fabSeen.clashKeys || []);
    const seenShare = new Set(fabSeen.sharers || []);
    return {
      overlap: [...tripClashKeys].some(k => !seenClash.has(k)),
      message: latestOtherStatusTs > (fabSeen.seenAt || 0),
      location: sharers.some(p => !seenShare.has(p)),
    };
  }, [fabSeen, tripClashKeys, latestOtherStatusTs, sharers]);

  const markFabSeen = useCallback(() => {
    if (!fabSeenKey) return;
    const snap = { seenAt: Date.now(), clashKeys: [...tripClashKeys], sharers };
    try { localStorage.setItem(fabSeenKey, JSON.stringify(snap)); } catch {}
    setFabSeen(snap);
  }, [fabSeenKey, tripClashKeys, sharers]);

  // Crew consensus for the active day.
  const crew = useMemo(() => {
    const ds = effectiveSets.filter(s => s.day === activeDay);
    const all3 = [], two = [];
    for (const s of ds) {
      const pickers = crewNames.filter(p => picks[s.id]?.[p]);
      if (pickers.length === crewNames.length && crewNames.length > 0) all3.push({ set: s, pickers });
      else if (pickers.length === 2) two.push({ set: s, pickers });
    }
    return { all3, two };
  }, [activeDay, picks, effectiveSets, crewNames]);

  const totalPicks = useMemo(() =>
    crewNames.reduce((acc, p) => { acc[p] = effectiveSets.filter(s => picks[s.id]?.[p]).length; return acc; }, {}),
    [picks, effectiveSets, crewNames]
  );

  // The active person's full selection across all three days — feeds Spotify.
  const mySets = useMemo(() => effectiveSets.filter(s => picks[s.id]?.[activePerson]), [picks, activePerson, effectiveSets]);
  // Whether there's anything playable to export (excludes TBA / deleted) — so
  // the Spotify sheet can show a friendly empty state instead of a blank panel.
  const hasPlayablePicks = useMemo(
    () => mySets.some(s => s.status !== 'deleted' && !/^to be announced$/i.test(s.name)),
    [mySets]
  );

  // Stable per-set prop factory so memoized ArtistRows don't re-render on every poll.
  const rowProps = useCallback((set) => ({
    set, myColor, myInk: inkFor(activePerson),
    myPick: picks[set.id]?.[activePerson] || false,
    others: crewNames.filter(p => p !== activePerson && picks[set.id]?.[p]),
    isClash: clashSetIds.has(set.id),
    onToggle: () => togglePick(set.id, activePerson),
  }), [picks, activePerson, myColor, clashSetIds, togglePick, crewNames, inkFor]);

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
      activePerson={activePerson}
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
      {/* Shared header shell (identical on both tabs): the Consciencia wordmark
          fills the banner, the identity strip is overlaid, and the tab switcher
          is the bottom strip. */}
      <TabHeader kicker={kicker} crewName={crewName} departureDate={departureDate} updated={updated} tabBar={tabBar}>
        <ConscienciaHeader />
      </TabHeader>

      {/* Content scrolls on the App's midnight atmosphere; the Trip Bar is pinned
          to the bottom (the thumb never travels). Bottom padding clears it. */}
      <div style={{ padding: '14px 4px 172px' }}>

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
              groups={stageGroups} browseLiveCount={browseLiveCount} dayCount={dayCount} forceOpen={forceOpen}
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
        party={party} crewCount={crewCount} clashCount={clashes.length}
        newActivity={newActivity} onOpen={markFabSeen}
        onPerson={onOpenAccount} onDay={() => setSheet('day')} onParty={() => setParty(true)}
        onResolve={() => setSheet('overlaps')} onNudge={() => setSheet('nudge')}
        onSpotify={() => setSheet('spotify')} onWhere={() => setSheet('where')}
      />

      {/* ── Trip Bar sheets ── */}
      {sheet === 'day' && (
        <BottomSheet title="Which day?" accent={tmrwGold} onClose={() => setSheet(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {DAYS.map((day, i) => {
              const active = day.id === activeDay;
              return (
                <button key={day.id} onClick={() => { setActiveDay(day.id); setSheet(null); }} aria-pressed={active}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '0 14px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left', backgroundColor: active ? raised : chip }}>
                  <span style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: muted, width: 44 }}>DAY {i + 1}</span>
                  <span style={{ flex: 1, ...mono, fontSize: 17, fontWeight: 700, color: active ? myColor : ink }}>{day.label}</span>
                  {active && <Check size={18} weight="bold" color={myColor} />}
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
              style={{ flexShrink: 0, minHeight: 48, padding: '0 16px', borderRadius: 12, border: 'none', backgroundColor: nudgeText.trim() ? myColor : chip, color: nudgeText.trim() ? inkFor(activePerson) : muted, ...sans, fontSize: 14, fontWeight: 700, cursor: nudgeText.trim() ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <PaperPlaneTilt size={15} weight="fill" /> Send
            </button>
          </form>
        </BottomSheet>
      )}

      {sheet === 'spotify' && (
        <BottomSheet title="Spotify playlist" accent={spotifyDot} onClose={() => setSheet(null)}>
          {hasPlayablePicks
            ? <SpotifyExport person={activePerson} mySets={mySets} onCopied={notify} />
            : <div style={{ ...sans, fontSize: 13, color: muted, padding: '4px 2px 8px', lineHeight: 1.4 }}>
                No picks to export yet — add some artists and they’ll turn into a playlist prompt here.
              </div>}
        </BottomSheet>
      )}

      {sheet === 'where' && (
        <BottomSheet title="Where’s everyone" accent={myColor} onClose={() => setSheet(null)}>
          <div style={{ maxHeight: '68vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <CrewMap
              me={activePerson} locations={crewStatus.locations} statuses={crewStatus.statuses}
              sharing={geo.sharing} onEnable={enableWhere} onDisable={geo.disable}
              myFix={geo.myFix} error={geo.error} supported={geo.supported}
              heading={heading.heading} compassPermission={heading.permission}
              headingSupported={heading.supported} nextStage={timeline[0]?.stage || null}
            />
          </div>
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
