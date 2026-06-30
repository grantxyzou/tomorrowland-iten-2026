import { useState, useEffect, useCallback } from 'react';
import { Pencil, LogOut } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { usePresence } from './hooks/usePresence.js';
import { LAST_UPDATED, DEFAULT_KICKER, DEFAULT_DEPARTURE, days } from './data/trip.js';
import ItineraryPrintDoc from './components/itinerary/ItineraryPrintDoc.jsx';
import ItineraryTab from './components/ItineraryTab.jsx';
import LineupTab from './components/LineupTab.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useGroup } from './groups/GroupContext.jsx';
import { useAuth } from './auth/AuthContext.jsx';
import { apiFetch } from './lib/api.js';
import { HERO_H } from './components/lineup/theme.js';

const TABS = [
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'lineup',    label: 'Lineup'    },
];

const mono = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };

// Format the last-updated timestamp for display
function formatUpdated(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-CA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

const G0_ID = 'ldg';

export default function App() {
  const [activeTab, setActiveTab] = useState('itinerary');
  const [settingsOpen, setSettingsOpen] = useState(false);
  // §6 Outdoor mode: persisted high-contrast LIGHT override for daylight legibility.
  const [outdoor, setOutdoor] = useState(() => {
    try { return localStorage.getItem('tml_outdoor') === '1'; } catch { return false; }
  });
  const toggleOutdoor = () => setOutdoor(v => {
    const nv = !v;
    try { localStorage.setItem('tml_outdoor', nv ? '1' : '0'); } catch {}
    return nv;
  });
  // Collapsing header: once the hero banner has scrolled past, the sticky tab
  // bar reveals a condensed crew name. rAF-throttled window-scroll read (same
  // pattern as the TripBar FAB). Owned here so it persists across tab switches.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const threshold = HERO_H - 56; // banner mostly gone, tab bar about to pin
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > threshold);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Keep the sheet mounted through its slide-down exit (matches --dur-exit).
  const settingsPresent = usePresence(settingsOpen, 240);
  const { activeGroupId, groups, members, refetchGroups, setActiveGroupId, requestJoinFlow, requestCreateFlow } = useGroup();
  const { logout, person, email, refresh } = useAuth();
  const activeGroup = groups.find(g => g.id === activeGroupId);
  // Only the original LDG crew gets the Itinerary tab (hardcoded trip data).
  const visibleTabs = activeGroupId === G0_ID ? TABS : TABS.filter(t => t.id !== 'itinerary');
  // If the active tab is no longer visible (e.g. group switched away from ldg), fall back to lineup.
  const resolvedTab = visibleTabs.find(t => t.id === activeTab) ? activeTab : 'lineup';

  const paper    = '#ede7d8';
  const ink      = '#1a1614';
  const muted    = '#5c544c';
  const rule     = '#cabda4';
  const accent   = '#a82a13';

  // Returns { ok } on success, { denied, deniedBy } if Nunu blocks it, else { ok:false }.
  const handleLeave = useCallback(async () => {
    if (!activeGroupId) return { ok: false };
    try {
      const res = await apiFetch('/api/groups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', g: activeGroupId }),
      });
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'denied') return { denied: true, deniedBy: data.deniedBy || 'Nunu' };
      }
      if (!res.ok) return { ok: false };
      await refetchGroups();
      // If no groups remain GroupGate shows onboarding; otherwise switch to first group.
      setActiveGroupId(groups.filter(g => g.id !== activeGroupId)[0]?.id || null);
      setSettingsOpen(false);
      return { ok: true };
    } catch { return { ok: false }; }
  }, [activeGroupId, groups, refetchGroups, setActiveGroupId]);

  // Fetch a shareable invite code for the active crew (members only). Returns the
  // code string, or null on failure. Used by the "Invite to this crew" menu row.
  const handleInvite = useCallback(async () => {
    if (!activeGroupId) return null;
    try {
      const res = await apiFetch('/api/groups', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invite', g: activeGroupId }),
      });
      const data = await res.json();
      return res.ok ? data.code : null;
    } catch { return null; }
  }, [activeGroupId]);

  // Rename the signed-in user across all their crews. Returns {ok} or {ok:false,error}.
  const handleRename = useCallback(async (name) => {
    try {
      const res = await apiFetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || 'Could not rename' };
      await refresh();        // pick up the re-minted session.person
      await refetchGroups();  // refresh roster (+ colorFor/inkFor) with the new name
      setSettingsOpen(false);
      return { ok: true };
    } catch { return { ok: false, error: 'Network error — try again' }; }
  }, [refresh, refetchGroups]);

  const handleDelete = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      });
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'denied') return { denied: true, deniedBy: data.deniedBy || 'Nunu' };
      }
      if (!res.ok) return { ok: false };
      logout();
      return { ok: true };
    } catch { return { ok: false }; }
  }, [logout]);

  // "Direction D — Midnight" background for the Lineup tab: cool nebula glows
  // over a near-black midnight wash that bottoms at the canvas/well tone, so the
  // (lighter) card surfaces read as raised. (The Itinerary tab keeps the light
  // desert theme.) The Lineup runs as a full dark theme.
  const lineupAtmosphere =
    'radial-gradient(120% 80% at 30% -10%, rgba(46,64,132,0.34), rgba(46,64,132,0) 55%),' +
    'radial-gradient(95% 75% at 85% 30%, rgba(78,58,128,0.24), rgba(78,58,128,0) 60%),' +
    'radial-gradient(110% 95% at 12% 92%, rgba(20,40,84,0.34), rgba(20,40,84,0) 60%),' +
    'radial-gradient(150% 120% at 50% 45%, rgba(8,12,32,0) 42%, rgba(4,6,16,0.92) 100%),' +
    'linear-gradient(178deg, #0d1430 0%, #0a0e22 55%, #070b1c 100%)';

  // Dark-theme chrome only on the Lineup tab.
  // Both tabs are dark-themed; §6 outdoor mode flips the Itinerary tab (only) to a
  // high-contrast light palette, so the App chrome follows suit on that tab. The
  // Lineup tab is always dark.
  const dark = !(outdoor && resolvedTab === 'itinerary');

  // Tab switcher — sticky at the top so it stays reachable while the hero banner
  // scrolls away. Full-bleed (negative side margins escape <main>'s padding); it
  // is rendered as a direct child of <main> (not inside the banner's overflow:hidden
  // wrapper) so position:sticky actually works. Once scrolled past the banner, the
  // safe-area top padding kicks in (fills the notch) and a condensed crew name reveals.
  const renderTabBar = () => (
    <nav role="tablist" aria-label="Sections" style={{
      position: 'sticky', top: 0, zIndex: 40, margin: '0 -16px 16px',
      backgroundColor: dark ? '#0c1228' : paper,
      borderBottom: `1px solid ${dark ? '#1c2342' : rule}`,
      paddingTop: scrolled ? 'env(safe-area-inset-top)' : '0px',
      transition: 'background-color var(--dur-theme) var(--ease-out), border-color var(--dur-theme) var(--ease-out), padding-top var(--dur-base) var(--ease-out)',
    }}>
      <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'stretch' }}>
        {/* Condensed crew name — collapses to 0 width until the hero scrolls away. */}
        <span aria-hidden="true" style={{
          ...mono, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden',
          fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', color: dark ? '#eef1fb' : ink,
          maxWidth: scrolled ? 200 : 0, opacity: scrolled ? 1 : 0, paddingLeft: scrolled ? 16 : 0,
          transition: 'max-width var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out), padding-left var(--dur-base) var(--ease-out)',
        }}>{activeGroup?.name || ''}</span>

        {/* Tabs in their own relative box so the sliding indicator tracks the tabs,
            not the row (which also holds the condensed title when scrolled). */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', overflowX: 'auto' }} className="no-scrollbar">
          {visibleTabs.map(tab => {
            const active = resolvedTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={active}
                aria-controls="tabpanel"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  ...mono, flex: 1, padding: '12px 16px', minHeight: 44, fontSize: 11,
                  fontWeight: active ? 700 : 500, letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: active ? (dark ? lineupAccent : accent) : (dark ? '#9aa3c4' : muted),
                  background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'transform var(--dur-press) var(--ease-out), color var(--dur-base) var(--ease-out)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
          {/* Sliding active-tab indicator (relative to the tabs box). */}
          <span aria-hidden="true" style={{
            position: 'absolute', bottom: 0, left: 0, height: 2, borderRadius: 2,
            width: `${100 / visibleTabs.length}%`, transform: `translateX(${activeIndex * 100}%)`,
            backgroundColor: dark ? lineupAccent : accent,
            transition: 'transform var(--dur-base) var(--ease-drawer), background-color var(--dur-theme) var(--ease-out)',
          }} />
        </div>
      </div>
    </nav>
  );
  const lineupAccent = '#e9b949'; // gold active-tab indicator (Direction D spotlight)
  const activeIndex = visibleTabs.findIndex(t => t.id === resolvedTab);

  return (
    <>
    <div className="app-shell" style={{ minHeight: '100dvh', color: ink, position: 'relative' }}>

      {/* Single page-level heading for screen readers / document outline. */}
      <h1 className="sr-only">Tomorrowland 2026 trip planner</h1>

      {/* ── Crossfading theme backgrounds ───────────────────────
          Two viewport-fixed layers (light desert + dark Cage) whose
          opacity swaps on tab change. Lets the whole surface dissolve
          between themes — a `background` transition can't tween gradients. */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: paper, opacity: dark ? 0 : 1, transition: 'opacity var(--dur-theme) var(--ease-out)' }} />
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: '#0a0e22', backgroundImage: lineupAtmosphere, opacity: dark ? 1 : 0, transition: 'opacity var(--dur-theme) var(--ease-out)' }} />

      {/* Header is now per-tab and IDENTICAL via the shared TabHeader: each tab
          renders the gradient banner + overlaid identity strip (kicker · crew ·
          DEPARTURE IN · countdown) + the tab switcher as its bottom strip, all
          inside <main>. App no longer renders a separate top bar / updated banner
          / sticky tab bar — that asymmetry was the headers' core misalignment. */}

      {/* ── Tab content ─────────────────────────────────────── */}
      <main
        id="tabpanel"
        role="tabpanel"
        aria-labelledby={`tab-${resolvedTab}`}
        style={{ maxWidth: 680, margin: '0 auto', padding: `calc(24px + env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) calc(64px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))` }}
      >
        {/* No panel-level fade: the shared header (identity strip + tab bar) must
            stay motionless across tab switches. Only the banner body (in
            TabHeader) and views that opt into fx-enter animate. */}
        <div key={resolvedTab}>
          {/* Keyed by tab so switching tabs resets a crashed boundary. */}
          <ErrorBoundary key={resolvedTab}>
            {resolvedTab === 'itinerary' && <ItineraryTab onOpenAccount={() => setSettingsOpen(true)} outdoor={outdoor} kicker={activeGroup?.kicker || DEFAULT_KICKER} crewName={activeGroup?.name} departureDate={activeGroup?.departureDate || DEFAULT_DEPARTURE} updated={formatUpdated(LAST_UPDATED)} tabBar={renderTabBar()} />}
            {resolvedTab === 'lineup'    && <LineupTab    onOpenAccount={() => setSettingsOpen(true)} kicker={activeGroup?.kicker || DEFAULT_KICKER} crewName={activeGroup?.name} departureDate={activeGroup?.departureDate || DEFAULT_DEPARTURE} updated={formatUpdated(LAST_UPDATED)} tabBar={renderTabBar()} />}
          </ErrorBoundary>
        </div>
      </main>

      {/* ── iOS install coaching ─────────────────────────── */}
      <InstallBanner />

      {/* ── Settings overlay ─────────────────────────────── */}
      {settingsPresent && (
        <SettingsSheet
          open={settingsOpen}
          dark={dark}
          groups={groups}
          activeGroupId={activeGroupId}
          person={person}
          email={email}
          onSwitchGroup={gid => { setActiveGroupId(gid); setSettingsOpen(false); }}
          onJoinAnother={() => { setSettingsOpen(false); requestJoinFlow(); }}
          onCreateAnother={() => { setSettingsOpen(false); requestCreateFlow(); }}
          onInvite={handleInvite}
          onRename={handleRename}
          onClose={() => setSettingsOpen(false)}
          onLeave={handleLeave}
          onDelete={handleDelete}
          onSignOut={() => { logout(); setSettingsOpen(false); }}
          onExportPdf={() => { setSettingsOpen(false); setTimeout(() => window.print(), 150); }}
          outdoor={outdoor}
          onToggleOutdoor={toggleOutdoor}
        />
      )}

      {/* Vercel Web Analytics — sends page views to /_vercel/insights (served
          automatically once Web Analytics is enabled for the project). */}
      <Analytics />
    </div>

    {/* Printable itinerary — a SIBLING of the app shell (not nested) so the print
        stylesheet can hide .app-shell entirely (display:none) without hiding this,
        leaving no blank trailing pages. Only the original LDG crew has itinerary data. */}
    {activeGroupId === G0_ID && (
      <ItineraryPrintDoc
        title={activeGroup?.kicker || DEFAULT_KICKER}
        crewName={activeGroup?.name}
        people={(members || []).map(m => m.displayName)}
        days={days}
      />
    )}
    </>
  );
}

// ── iOS install coaching banner ────────────────────────────────────────────
function InstallBanner() {
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true;
    try { if (localStorage.getItem('tml_install_dismissed') === '1') return false; } catch {}
    return isIos && !isStandalone;
  });
  if (!show) return null;
  const dismiss = () => {
    try { localStorage.setItem('tml_install_dismissed', '1'); } catch {}
    setShow(false);
  };
  const mono2 = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };
  return (
    <div style={{
      backgroundColor: '#1a1614', color: '#ede7d8', padding: '10px 16px 10px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <span style={{ ...mono2, fontSize: 11, letterSpacing: '0.04em', lineHeight: 1.5, flex: 1 }}>
        Add to Home Screen: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
      </span>
      <button
        type="button"
        aria-label="Dismiss install prompt"
        onClick={dismiss}
        style={{ background: 'none', border: 'none', color: '#938b81', fontSize: 18, cursor: 'pointer', padding: '4px 2px', lineHeight: 1, flexShrink: 0 }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Settings sheet ────────────────────────────────────────────────────────
function SettingsSheet({ open, dark, groups, activeGroupId, person, email, onSwitchGroup, onJoinAnother, onCreateAnother, onInvite, onRename, onClose, onLeave, onDelete, onSignOut, onExportPdf, outdoor, onToggleOutdoor }) {
  const [confirming, setConfirming] = useState(null); // null | 'leave' | 'delete' | 'invite' | 'rename'
  const [renameVal, setRenameVal] = useState('');
  const [renameErr, setRenameErr] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);

  // Escape closes; lock background scroll while open (mirrors BottomSheet).
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);
  const [inviteCode, setInviteCode] = useState(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [copied, setCopied] = useState(''); // '' | 'code' | 'link'
  const [deniedBy, setDeniedBy] = useState('Nunu'); // who blocked a leave/delete

  // Run a leave/delete; if Nunu blocks it (403 denied), show the denial instead.
  async function attempt(fn) {
    const r = await fn();
    if (r?.denied) { setDeniedBy(r.deniedBy || 'Nunu'); setConfirming('denied'); }
  }

  async function openInvite() {
    setConfirming('invite'); setInviteBusy(true); setInviteCode(null); setCopied('');
    const code = await onInvite();
    setInviteCode(code); setInviteBusy(false);
  }
  async function copy(text, which) {
    try { await navigator.clipboard.writeText(text); setCopied(which); setTimeout(() => setCopied(''), 1500); } catch {}
  }
  // Readable ink on a coloured avatar (luminance threshold, like GroupContext).
  const avatarInk = (hex) => {
    try {
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#1a1614' : '#fff';
    } catch { return '#fff'; }
  };
  const sans2  = { fontFamily: '"Inter", system-ui, sans-serif' };
  const mono2  = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };
  // Theme-aware palette: dark navy on the Lineup tab (matches the lineup sheets),
  // light cream on the Itinerary tab. Aliases keep the JSX below unchanged.
  const t = dark
    ? { bg: '#10162e', ink: '#eef1fb', muted: '#9aa3c4', rule: '#243056', field: '#161d3a', activeRow: '#1a2347', accent: '#ff7a6b', dangerBg: '#c0392b' }
    : { bg: '#ede7d8', ink: '#1a1614', muted: '#5c544c', rule: '#cabda4', field: '#f5efde', activeRow: '#e8dfc8', accent: '#a82a13', dangerBg: '#a82a13' };
  const ink2 = t.ink, muted2 = t.muted, rule2 = t.rule, accent2 = t.accent;
  const activeGroup = groups.find(g => g.id === activeGroupId);

  const rowBtn = (label, color, onClick) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block', width: '100%', padding: '14px 0', textAlign: 'left',
        background: 'none', border: 'none', cursor: 'pointer',
        ...sans2, fontSize: 15, fontWeight: 500, color,
      }}
    >{label}</button>
  );

  // Quiet uppercase section label (reuses the long-standing "Your crews" idiom).
  const sectionLabel = (text) => (
    <div style={{ ...mono2, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: muted2, marginBottom: 10 }}>{text}</div>
  );
  // A row hairline between siblings within a section.
  const rule = <div style={{ borderTop: `1px solid ${rule2}` }} />;
  // Fine-print footer link — same weight as the Privacy policy link, so the rarely
  // wanted destructive actions sit quietly at the bottom instead of as red rows.
  const footerLink = (label, onClick) => (
    <button type="button" onClick={onClick}
      style={{ display: 'block', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', ...sans2, fontSize: 13, color: muted2, textDecoration: 'underline' }}>
      {label}
    </button>
  );
  // Compact round control for the identity row (rename / sign out live here now).
  const iconBtn = {
    flexShrink: 0, width: 38, height: 38, borderRadius: '50%',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: t.field, border: `1px solid ${rule2}`, color: ink2, cursor: 'pointer',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fx-overlay"
        data-open={open}
        style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.45)' }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="fx-sheet"
        data-open={open}
        style={{
          // Anchored bottom-centre; capped at a phone width so it doesn't span a
          // wide desktop viewport (margin:auto centres it without touching the
          // translateY slide-up in .fx-sheet).
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 61,
          maxWidth: 480, margin: '0 auto',
          background: t.bg, borderRadius: '20px 20px 0 0',
          padding: '20px 24px calc(32px + env(safe-area-inset-bottom))',
          boxShadow: dark ? '0 -12px 40px rgba(0,0,0,0.55)' : '0 -4px 40px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: rule2, margin: '0 auto 20px' }} />

        {activeGroup && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: activeGroup.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ ...mono2, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: muted2 }}>
              {activeGroup.name}
            </span>
          </div>
        )}

        {confirming === 'leave' ? (
          <div>
            <p style={{ ...sans2, fontSize: 14, color: ink2, marginBottom: 16, lineHeight: 1.5 }}>
              Leave this crew? Your picks and status will be removed from the crew.
            </p>
            <button type="button" onClick={() => attempt(onLeave)}
              style={{ display: 'block', width: '100%', padding: '14px 0', marginBottom: 8, borderRadius: 12, border: 'none', background: t.dangerBg, color: '#fff', ...sans2, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Yes, leave crew
            </button>
            <button type="button" onClick={() => setConfirming(null)}
              style={{ display: 'block', width: '100%', padding: '12px 0', background: 'none', border: 'none', ...sans2, fontSize: 14, color: muted2, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        ) : confirming === 'delete' ? (
          <div>
            <p style={{ ...sans2, fontSize: 14, color: ink2, marginBottom: 16, lineHeight: 1.5 }}>
              Delete your account? This removes all your data from every crew — permanently.
            </p>
            <button type="button" onClick={() => attempt(onDelete)}
              style={{ display: 'block', width: '100%', padding: '14px 0', marginBottom: 8, borderRadius: 12, border: 'none', background: t.dangerBg, color: '#fff', ...sans2, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Yes, delete my account
            </button>
            <button type="button" onClick={() => setConfirming(null)}
              style={{ display: 'block', width: '100%', padding: '12px 0', background: 'none', border: 'none', ...sans2, fontSize: 14, color: muted2, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        ) : confirming === 'invite' ? (
          <div>
            <p style={{ ...sans2, fontSize: 14, color: ink2, marginBottom: 16, lineHeight: 1.5 }}>
              Share this code (or link) so friends can join {activeGroup?.name ? <strong>{activeGroup.name}</strong> : 'this crew'}. Works for 30 days.
            </p>
            {inviteBusy ? (
              <p style={{ ...sans2, fontSize: 14, color: muted2, marginBottom: 16 }}>Getting your code…</p>
            ) : inviteCode ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '14px 16px', marginBottom: 8, borderRadius: 12, background: t.field, border: `1px solid ${rule2}` }}>
                  <span style={{ ...mono2, fontSize: 20, letterSpacing: '0.2em', color: ink2 }}>{inviteCode}</span>
                  <button type="button" onClick={() => copy(inviteCode, 'code')}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', ...sans2, fontSize: 13, fontWeight: 700, color: accent2 }}>
                    {copied === 'code' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <button type="button" onClick={() => copy(`${window.location.origin}/join/${inviteCode}`, 'link')}
                  style={{ display: 'block', width: '100%', padding: '14px 0', marginBottom: 8, borderRadius: 12, border: `2px solid ${accent2}`, background: 'transparent', color: accent2, ...sans2, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  {copied === 'link' ? 'Invite link copied!' : 'Copy invite link'}
                </button>
              </>
            ) : (
              <p style={{ ...sans2, fontSize: 14, color: accent2, marginBottom: 16 }}>Couldn’t get a code — try again.</p>
            )}
            <button type="button" onClick={() => setConfirming(null)}
              style={{ display: 'block', width: '100%', padding: '12px 0', background: 'none', border: 'none', ...sans2, fontSize: 14, color: muted2, cursor: 'pointer' }}>
              Done
            </button>
          </div>
        ) : confirming === 'rename' ? (
          <div>
            <p style={{ ...sans2, fontSize: 14, color: muted2, marginBottom: 12, lineHeight: 1.5 }}>
              Your name shows to your crews and is used across all of them.
            </p>
            <input
              value={renameVal}
              onChange={e => { setRenameVal(e.target.value); setRenameErr(''); }}
              maxLength={20}
              autoFocus
              placeholder="Your name"
              aria-label="Your name"
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, borderRadius: 10, border: `1.5px solid ${rule2}`, padding: '0 14px', ...sans2, fontSize: 16, background: t.field, color: ink2, outline: 'none', marginBottom: renameErr ? 8 : 16 }}
            />
            {renameErr && <p style={{ ...sans2, fontSize: 13, color: accent2, margin: '0 0 12px' }}>{renameErr}</p>}
            <button type="button" disabled={renameBusy || !renameVal.trim()}
              onClick={async () => {
                setRenameBusy(true); setRenameErr('');
                const r = await onRename(renameVal.trim());
                setRenameBusy(false);
                if (!r?.ok) setRenameErr(r?.error || 'Could not rename');
                // On success the sheet closes itself (App sets settingsOpen=false).
              }}
              style={{ display: 'block', width: '100%', padding: '14px 0', marginBottom: 8, borderRadius: 12, border: 'none', background: t.ink, color: t.bg, ...sans2, fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: (renameBusy || !renameVal.trim()) ? 0.55 : 1 }}>
              {renameBusy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setConfirming(null)}
              style={{ display: 'block', width: '100%', padding: '12px 0', background: 'none', border: 'none', ...sans2, fontSize: 14, color: muted2, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        ) : confirming === 'denied' ? (
          <div>
            <p style={{ ...sans2, fontSize: 17, fontWeight: 700, color: ink2, marginBottom: 8, lineHeight: 1.45 }}>
              No, your request has been denied by {deniedBy}.
            </p>
            <p style={{ ...sans2, fontSize: 14, color: muted2, marginBottom: 18 }}>Sorry. 🙅</p>
            <button type="button" onClick={() => setConfirming(null)}
              style={{ display: 'block', width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: t.ink, color: t.bg, ...sans2, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              OK
            </button>
          </div>
        ) : (
          <div>
            {/* Signed-in identity — name + email, with rename + sign-out folded in
                as inline icon controls (replaces the old Account rows). */}
            {person && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 22px' }}>
                <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: activeGroup?.color || '#888', color: avatarInk(activeGroup?.color || '#888888'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                  {person[0]?.toUpperCase()}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', ...sans2, fontSize: 16, fontWeight: 700, color: ink2 }}>{person}</span>
                  {email && <span style={{ display: 'block', ...sans2, fontSize: 12, color: muted2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>}
                </span>
                <button type="button" aria-label="Change my name" title="Change my name"
                  onClick={() => { setRenameVal(person || ''); setRenameErr(''); setConfirming('rename'); }} style={iconBtn}>
                  <Pencil size={17} />
                </button>
                <button type="button" aria-label="Sign out" title="Sign out" onClick={onSignOut} style={iconBtn}>
                  <LogOut size={17} />
                </button>
              </div>
            )}

            {/* CREWS — the crew switcher (when in >1) + crew actions */}
            {sectionLabel('Crews')}
            {groups.length > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                {groups.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onSwitchGroup(g.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: g.id === activeGroupId ? t.activeRow : 'transparent',
                      ...sans2, fontSize: 14, fontWeight: g.id === activeGroupId ? 700 : 400, color: ink2,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: g.color, flexShrink: 0, display: 'inline-block' }} />
                    {g.name}
                    {g.id === activeGroupId && <span style={{ marginLeft: 'auto', ...mono2, fontSize: 10, color: muted2 }}>active</span>}
                  </button>
                ))}
              </div>
            )}
            {rowBtn('Create a new crew', ink2, onCreateAnother)}
            {rule}
            {rowBtn('Join another crew', ink2, onJoinAnother)}
            {activeGroup && rule}
            {activeGroup && rowBtn('Invite to this crew', ink2, openInvite)}

            {/* ITINERARY — original crew only (sky view + PDF export) */}
            {activeGroupId === G0_ID && (
              <>
                <div style={{ marginTop: 22 }}>{sectionLabel('Itinerary')}</div>
                {rowBtn('Export itinerary as PDF', ink2, onExportPdf)}
                {rule}
                {rowBtn(`Outdoor mode · ${outdoor ? 'On' : 'Off'}`, ink2, onToggleOutdoor)}
              </>
            )}

            {/* Fine print — destructive actions deprioritized to match the Privacy link */}
            <div style={{ borderTop: `1px solid ${rule2}`, marginTop: 22, paddingTop: 14, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              {footerLink('Leave this crew', () => setConfirming('leave'))}
              {footerLink('Delete my account', () => setConfirming('delete'))}
              <a href="/privacy" style={{ ...sans2, fontSize: 13, color: muted2, textDecoration: 'underline', padding: '6px 0' }}>Privacy policy</a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
