import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, Check, Plane, Car, Clock, Bed, ChevronDown, QrCode, X, FileDown, MapPin, Phone } from 'lucide-react';
import { days } from '../data/trip.js';
import { usePresence } from '../hooks/usePresence.js';
import { useWeather } from '../hooks/useWeather.js';
import { useLocalTime } from '../hooks/useLocalTime.js';
import { TomorrowlandMark, AirCanadaMark } from './BrandMarks.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useGroup } from '../groups/GroupContext.jsx';
import { timeToMin } from './lineup/time.js';
import SkyHeader from './itinerary/SkyHeader.jsx';
import TabHeader from './TabHeader.jsx';
import DayScrubber from './itinerary/DayScrubber.jsx';
import AgendaPanel from './itinerary/AgendaPanel.jsx';
import BottomSheet from './lineup/BottomSheet.jsx';
import TabPills from './lineup/TabPills.jsx';
import { sans, rPill, tmrwGold, raised as sheetRaised, chip as sheetChip, muted as sheetMuted, ink as sheetInk } from './lineup/theme.js';
import { agendaAt, clampDay } from './itinerary/agenda.js';
import { tintAt, mixSurface } from './itinerary/tint.js';

// Start minute of an event whose time is "HH:MM" or "HH:MM – HH:MM".
const eventStartMin = (t) => timeToMin(String(t).slice(0, 5));

// ── Palette — dark-first, aligned to the Lineup token ladder (theme.js) so the
// whole tab sits on one dark surface with the sky header. Roles are explicit:
// surfaces are dark, the text ramp is light, and a brightened red keeps the
// Itinerary's identity as the spotlight accent. The festival (Tomorrowland) and
// flight (Air Canada) day variants keep their own identity, retuned for dark.
const p = {
  // Surfaces (value-only ladder, lighter = nearer)
  canvas:  '#05070f',  // tab background — near-black so the card clearly floats
  bar:     '#0c1228',  // bottom nav / sticky bars
  card:    '#141d38',  // default day card — a real step up from canvas (no blue-on-blue)
  panel:   '#1a2444',  // inner panels (lodging / schedule / travel / refs)
  raised:  '#212d54',  // chips, date chip, leg-label pills
  // Text ramp (light on dark)
  ink:       '#eef1fb', // primary
  bodyMuted: '#c2cae5', // secondary
  muted:     '#9aa3c4', // tertiary — labels / captions
  caption:   '#6f7aa6', // muted caption
  // Accent — the Itinerary's red. RESERVED for the day's status line + TODAY only
  // (never times/links/icons — that overuse flattened the hierarchy).
  accent:    '#ff6a4d',
  accentInk: '#240a04', // dark ink on a bright accent / gold fill
  onDark:    '#eef1fb', // light text on a dark fill
  // Gold — the structural warm tone: schedule times, the weekday, and icons. It's
  // the everyday counterpart to the festival-only tmrwGold (kept distinct below).
  gold:      '#e3b34f',
  rule:      '#2b375e', // hairline divider — lighter now so card borders read as elevation
  pillBg:    'rgba(255,255,255,0.06)', // subtle chip fill (weather pills)
  // Gap days — cool, de-emphasised, dashed.
  gapBg:     '#0c1430',
  gapAccent: '#8c93b8',
  // Air Canada flight (identity unchanged).
  acBlack:      '#0a0a0a',
  acRed:        '#D82F2E',
  acRedText:    '#ff5747',
  acMuted:      '#b9b3ad',
  acWhite:      '#ffffff',
  // Tomorrowland festival (identity unchanged).
  tmrwBg:       '#241712',
  tmrwChipBg:   '#160d07',
  tmrwGold:     '#dcab43',
  tmrwChipLabel:'#a87b2a',
  tmrwBodyText: '#f0e8d8',
  tmrwBodyMuted:'#c2a982',
  tmrwBorder:   '#3a2a16',
  tmrwPanel:    'rgba(20,12,8,0.72)',
  tmrwPanelBorder: 'rgba(220,171,67,0.18)',
  // Elemental dots
  tmlBlue:  '#4a7fc1', tmlRed: '#c94040', tmlGreen: '#4a9a4a', tmlYellow: '#e8b84b',
  // Ticket viewer is an intentionally LIGHT document overlay — dark ink for it.
  docInk: '#1a1614', docRule: '#cabda4',
};
// Outdoor mode (§6) — a high-contrast LIGHT override for direct sunlight. Same
// keys as the dark palette so every component is palette-agnostic; only surfaces,
// text, accent, rule and gap flip. Festival/flight identity tokens are inherited
// from `p` (they stay dark and distinct even on the light tab). No tint outdoors.
const LIGHT = {
  ...p,
  canvas: '#dde3f0', bar: '#cdd6e8', card: '#f4f7fc', panel: '#e8edf6', raised: '#ffffff',
  ink: '#060c1c', bodyMuted: '#2f3a54', muted: '#5b677f', caption: '#6b7690',
  accent: '#a82a13', accentInk: '#ffffff', onDark: '#060c1c', rule: '#c2cdde',
  gold: '#8a6a12', // dark amber so times/icons stay legible on the light outdoor bg
  gapBg: '#e4e9f3', gapAccent: '#6b7690', pillBg: 'rgba(0,0,0,0.05)',
};

const mono = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };

// ── Card spacing scale ───────────────────────────────────────
// The one source of truth for DayCard rhythm — theme.js has radii but no spacing
// tokens, so panels used to hardcode (and drift) their own values. Reference these
// everywhere so every panel shares the same padding, header gap, and row gap.
const CARD_PAD_X  = 16;                                  // panel horizontal padding
const CARD_PAD_Y  = 14;                                  // panel vertical padding
const CARD_PAD    = `${CARD_PAD_Y}px ${CARD_PAD_X}px`;
const SECTION_GAP = 10;                                  // section header → its body
const ROW_GAP     = 8;                                   // between list rows (events/legs/refs)

// Shared LAYOUT for a tappable row (address→Maps, phone→dialer, and future actions):
// leading icon + text, 44px min tap target, no underline. Typography/colour are set
// per use so prose rows stay sans and code-ish rows (phone) stay mono.
const tapRow = {
  display: 'flex', width: 'fit-content', maxWidth: '100%',
  alignItems: 'center', gap: 6, minHeight: 44, textDecoration: 'none',
};

// Google Maps deep link for a named place — opens the Maps app on mobile.
const mapsHref = (query) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

// Surfaces carry the ambient dawn/dusk tint (spec §5); deeper surfaces take more.
// Text/accent tokens never tint. PalCtx hands the (possibly tinted) surfaces down
// so every card/panel reacts to the same effective minute as the sky. Defined
// AFTER `p` so createContext(p) doesn't hit `p`'s temporal dead zone at load.
const PalCtx = React.createContext(p);
const usePal = () => useContext(PalCtx);
function tintedPalette(minute) {
  const t = tintAt(minute);
  if (!t.strength) return p;
  const mix = (hex, mult) => mixSurface(hex, t, mult);
  return { ...p, canvas: mix(p.canvas, 1.8), bar: mix(p.bar, 1.2), card: mix(p.card, 1.0), panel: mix(p.panel, 0.85), raised: mix(p.raised, 0.7) };
}

// Format date as YYYY-MM-DD for weather API
function dayToDateStr(day) {
  return `2026-07-${day.dateNum.padStart(2, '0')}`;
}

// Determine if a day is "today" (−1 outside the trip window). `?previewDay=N`
// forces a day index — lets you preview the today-only agenda before the trip.
function getTodayIndex() {
  try {
    const preview = new URLSearchParams(window.location.search).get('previewDay');
    if (preview != null) {
      const n = parseInt(preview, 10);
      if (Number.isInteger(n) && n >= 0 && n < days.length) return n;
    }
  } catch {}
  const now = new Date();
  const tripStart = new Date('2026-07-15');
  const tripEnd   = new Date('2026-07-27');
  if (now < tripStart || now > tripEnd) return -1;
  const diff = Math.floor((now - tripStart) / 86_400_000);
  return Math.min(diff, days.length - 1);
}

// a11y (§8): honour the OS "reduce motion" setting — read once at module load.
const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

export default function ItineraryTab({ onOpenAccount, onExportPdf, outdoor = false, kicker, crewName, departureDate, tabs, activeTab, onSelectTab }) {
  const todayIdx = getTodayIndex();
  // `isTripLive` = the trip is on right now (today is one of the days). It only
  // gates the live NOW/COMING-UP agenda, shown when you're viewing today. Day
  // navigation itself (the DayScrubber) is always on. `?previewDay=N` forces it.
  const isTripLive = todayIdx >= 0;
  const { person } = useAuth();
  const { colorFor, inkFor } = useGroup();
  const myColor = colorFor(person);

  const [daySheetOpen, setDaySheetOpen] = useState(false); // day picker (matches the Lineup day sheet)
  // Which day the tab shows — the DayScrubber's position. Only this day's card
  // renders. Defaults to today during the trip, else Day 1.
  const [viewDayIdx, setViewDayIdx] = useState(() => (todayIdx >= 0 ? todayIdx : 0));
  const [liveMinute, setLiveMinute] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes();
  });
  // The sky/tint follow the device clock (discrete 30s tick — no continuous
  // animation). Time-of-day is no longer scrubbed; the scrubber picks the DAY.
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date(); setLiveMinute(n.getHours() * 60 + n.getMinutes());
    }, 30000);
    return () => clearInterval(id);
  }, []);
  const effectiveMinute = liveMinute;
  // Outdoor mode = fixed light palette (no tint). Otherwise the dark palette with
  // the ambient dawn/dusk tint applied to surfaces.
  const pal = useMemo(() => (outdoor ? LIGHT : tintedPalette(effectiveMinute)), [outdoor, effectiveMinute]);

  // The viewed day drives the card, sky header labels, and (if it's today) the
  // live agenda. dayLabel/nextLabel come from the viewed day, not just "today".
  const viewIdx = clampDay(viewDayIdx, days.length);
  const viewDay = days[viewIdx];
  const viewingToday = isTripLive && viewIdx === todayIdx;
  const dayLabel = `${viewDay.month} ${viewDay.dateNum}`;
  const nextEvent = viewDay.events?.find(e => eventStartMin(e.time) >= effectiveMinute);
  const nextLabel = nextEvent
    ? (nextEvent.label.length > 34 ? nextEvent.label.slice(0, 33) + '…' : nextEvent.label)
    : null;

  // Bottom-bar controls — built to MATCH the Lineup TripBar (same chip geometry,
  // font and corner radius) so the account + day pills line up across tabs. The
  // surfaces stay palette-driven (pal.*) so they keep tinting at dawn/dusk and
  // flip correctly in outdoor mode — only the geometry is borrowed from Lineup.
  const dayPillLabel = `${viewDay.dayOfWeek.slice(0, 3)} ${viewDay.dateNum}`;
  const dayLabelColor = outdoor ? pal.accent : myColor; // gold is illegible on the light outdoor bar
  const chipStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 13px',
    borderRadius: rPill, backgroundColor: pal.card, border: `1px solid ${pal.rule}`, color: pal.ink,
    ...sans, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  };
  // A static LIVE marker in the banner identity strip — shown only while you're
  // viewing today during the trip (the sky/agenda are genuinely live then).
  const liveChip = (
    <span aria-label="Viewing today, live"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: tmrwGold, textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: tmrwGold, boxShadow: `0 0 6px ${tmrwGold}` }} />
      LIVE
    </span>
  );

  return (
    <PalCtx.Provider value={pal}>
      {/* Ambient backdrop — washes the whole tab warm at dawn / cool at dusk
          (spec §5). Outside those windows pal.canvas === the base canvas, so this
          is a no-op. Sits over the App's static dark layer, behind all content. */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: pal.canvas, transition: PREFERS_REDUCED_MOTION ? 'none' : 'background-color 1.2s linear' }} />

      {/* Shared header shell (identical on both tabs): the sky body fills the
          banner, with the identity strip overlaid and the tab switcher as the
          bottom strip. The scrubber lives in a fixed transport bar at the bottom. */}
      <TabHeader kicker={kicker} crewName={crewName} departureDate={departureDate} statusChip={viewingToday ? liveChip : null}>
        <SkyHeader
          minute={effectiveMinute}
          dayLabel={dayLabel}
          nextLabel={nextLabel}
          outdoor={outdoor}
        />
      </TabHeader>

      {/* Breathing room so the first card/agenda doesn't butt flush against the
          banner's bottom edge (which read as the card being "cut off"). */}
      <div aria-hidden="true" style={{ height: 16 }} />

      {/* Live agenda — only when you're viewing today during the trip: the
          time-relative NOW/COMING-UP for right now. Otherwise hidden. */}
      {viewingToday && (
        <AgendaPanel agenda={agendaAt(viewDay, effectiveMinute)} outdoor={outdoor} />
      )}

      {/* The itinerary shows ONE day at a time — the day the scrubber points at.
          Keyed by viewIdx so switching days replays the enter animation. Its phase
          shows as a lightweight header when the day starts a new leg of the trip. */}
      <div key={viewIdx} className="fx-enter" style={{ paddingTop: viewingToday ? 12 : 0, paddingBottom: 28 }}>
        {viewDay.phase && (
          <PhaseDivider phase={viewDay.phase} idx={0} />
        )}
        <DayCard
          d={viewDay}
          isToday={viewIdx === todayIdx}
          dateStr={dayToDateStr(viewDay)}
        />
      </div>

      {/* Spacer so content clears the fixed two-row bottom bar (pills + scrubber). */}
      <div aria-hidden="true" style={{ height: 184 }} />

      {/* Fixed bottom transport bar — mirrors the Lineup TripBar so the two tabs
          read as one chrome: same surface, corner radius (rPill), 680-wide centred
          column and padding. Row 1 is the shared identity strip ([account][day]),
          positioned exactly where the Lineup bar puts them; row 2 is the tab's own
          control — here the timeline scrubber, where Lineup has its view tabs. */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45 }}>
        <div style={{ backgroundColor: pal.bar, borderTop: `1px solid ${pal.rule}`, borderTopLeftRadius: rPill, borderTopRightRadius: rPill, boxShadow: '0 -12px 30px rgba(0,0,0,0.45)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', padding: '12px 16px 14px', minHeight: 157, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>

            {/* Row 1 — Tabs · Day · Account, all on one line (scrolls if too
                narrow so the bar height never grows). Mirrors the Lineup bar. */}
            <div className="no-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'nowrap', overflowX: 'auto' }}>
              <TabPills tabs={tabs} activeTab={activeTab} onSelectTab={onSelectTab}
                activeBg={myColor} activeInk={inkFor(person)} chipBg={pal.card} chipBorder={pal.rule} chipInk={pal.ink} />
              <button
                onClick={() => setDaySheetOpen(true)}
                aria-haspopup="dialog"
                aria-label={`Day: ${dayPillLabel}${viewDayIdx === todayIdx ? ' (today)' : ''}. Tap to switch.`}
                style={{ ...chipStyle, ...mono, fontSize: 13, flexShrink: 0 }}
              >
                {viewDayIdx === todayIdx && (
                  <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dayLabelColor, flexShrink: 0 }} />
                )}
                <span style={{ color: dayLabelColor, fontWeight: 700 }}>{dayPillLabel}</span>
                <ChevronDown size={13} color={pal.muted} />
              </button>
              {onOpenAccount && (
                <button
                  onClick={onOpenAccount}
                  aria-haspopup="dialog"
                  aria-label={`Signed in as ${person}. Tap for account and crews.`}
                  style={{ ...chipStyle, flexShrink: 0 }}
                >
                  <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: myColor, color: inkFor(person), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                    {person?.[0]?.toUpperCase()}
                  </span>
                  <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person}</span>
                  <ChevronDown size={13} color={pal.muted} />
                </button>
              )}
            </div>

            {/* Row 2 — the Itinerary's transport: the trip DAY scrubber. Tap/drag/
                arrow across the trip's days; only the picked day's card shows above.
                Always present (it's the primary nav), mirroring Lineup's view row. */}
            <DayScrubber
              days={days}
              activeIdx={viewIdx}
              todayIdx={todayIdx}
              onSelect={setViewDayIdx}
              outdoor={outdoor}
            />
          </div>
        </div>
      </div>

      {/* Day picker — same bottom sheet pattern as the Lineup day chip, listing
          the full trip. Today is tagged, the active day checked; the list scrolls
          since the trip spans 13 days. */}
      {daySheetOpen && (
        <BottomSheet title="Which day?" accent={tmrwGold} onClose={() => setDaySheetOpen(false)}
          action={onExportPdf && (
            <button type="button" onClick={() => { setDaySheetOpen(false); onExportPdf(); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: rPill, background: sheetChip, border: `1px solid ${sheetRaised}`, cursor: 'pointer', ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: tmrwGold }}>
              <FileDown size={13} /> Export PDF
            </button>
          )}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {days.map((d, i) => {
              const active = i === viewDayIdx;
              const isToday = i === todayIdx;
              return (
                <button key={d.dateNum} onClick={() => { setViewDayIdx(i); setDaySheetOpen(false); }} aria-pressed={active}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '10px 14px', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left', backgroundColor: active ? sheetRaised : sheetChip }}>
                  <span style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: isToday ? myColor : sheetMuted, width: 52, flexShrink: 0 }}>
                    {isToday ? 'TODAY' : `DAY ${i + 1}`}
                  </span>
                  {/* Day name + city stacked, so the full city shows (some run long,
                      e.g. "Boom · Tomorrowland Day 1") instead of being truncated. */}
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ ...mono, fontSize: 16, fontWeight: 700, color: active ? myColor : sheetInk }}>
                      {d.dayOfWeek.slice(0, 3)} {d.month} {d.dateNum}
                    </span>
                    <span style={{ ...mono, fontSize: 11, color: sheetMuted }}>{d.city}</span>
                  </span>
                  {active && <Check size={16} strokeWidth={3} color={myColor} style={{ flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </BottomSheet>
      )}
    </PalCtx.Provider>
  );
}

// ── Phase divider ────────────────────────────────────────────
function PhaseDivider({ phase, idx }) {
  const pal = usePal();
  const color = phase.includes('OPEN') ? pal.gapAccent
              : phase === 'TOMORROWLAND' ? pal.tmrwGold // gold reads on the dark canvas
              : pal.muted;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, marginTop: idx === 0 ? 0 : 24 }}>
      {/* Lines on both sides so the label is always centred (incl. the first) */}
      <div style={{ flex: 1, height: 1, backgroundColor: pal.rule }} />
      <span style={{ ...mono, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, color }}>
        {phase}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: pal.rule }} />
    </div>
  );
}

// ── Day card ─────────────────────────────────────────────────
function DayCard({ d, isToday, dateStr }) {
  const pal = usePal();
  const isGap       = d.isGap === true;
  const isTmrw      = d.isTomorrowland === true;
  const isFlightDay = d.travel?.isFlight === true;

  // Flight days are now ordinary dark cards; the Air Canada identity lives in the
  // (black/red) travel panel + watermark, so the card itself joins the dark ladder.
  const cardBg    = isGap ? pal.gapBg : isTmrw ? pal.tmrwBg : pal.card;
  const cardBorder = isGap
    ? `1.5px dashed ${pal.gapAccent}`
    : isTmrw
    ? `1px solid ${pal.tmrwBorder}`
    : isToday
    ? `2px solid ${pal.accent}`
    : `1px solid ${pal.rule}`;

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: cardBorder, backgroundColor: cardBg, position: 'relative' }}>
      {/* Watermarks */}
      {isTmrw && (
        // Same fix as the flight card: fixed top anchor (no shift on expand) and
        // a positive right inset so the mark sits fully on-card, never clipped.
        <div aria-hidden="true" style={{ position: 'absolute', top: 18, right: 16, width: 132, height: 132, opacity: 0.09, pointerEvents: 'none', zIndex: 0 }}>
          <TomorrowlandMark color={pal.tmrwGold} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      {isFlightDay && (
        // Anchored to a fixed top (not 50% of a variable-height card, which made it
        // slide when Booking Refs expands) and inset fully on-card so it isn't clipped.
        <div aria-hidden="true" style={{ position: 'absolute', top: 18, right: 16, width: 132, height: 132, opacity: 0.08, pointerEvents: 'none', zIndex: 0 }}>
          <AirCanadaMark color={pal.acRed} style={{ width: '100%', height: '100%' }} />
        </div>
      )}

      {/* Today indicator */}
      {isToday && (
        <div style={{ backgroundColor: pal.accent, color: pal.accentInk, textAlign: 'center', padding: '3px 0', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, ...mono }}>
          Today
        </div>
      )}

      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'stretch', position: 'relative', zIndex: 1 }}>
        {/* Date chip */}
        <DateChip d={d} isTmrw={isTmrw} isGap={isGap} />
        {/* Header content */}
        <HeaderContent d={d} isTmrw={isTmrw} isGap={isGap} dateStr={dateStr} />
      </div>

      {/* Booking refs */}
      {d.bookingRefs?.length > 0 && (
        <BookingRefs refs={d.bookingRefs} isTmrw={isTmrw} isFlightDay={isFlightDay} />
      )}

      {/* Lodging */}
      {d.lodging && (
        <LodgingPanel lodging={d.lodging} isTmrw={isTmrw} />
      )}

      {/* Schedule */}
      {d.events?.length > 0 && (
        <SchedulePanel events={d.events} isTmrw={isTmrw} />
      )}

      {/* Travel */}
      {d.travel && (
        <TravelPanel travel={d.travel} isTmrw={isTmrw} />
      )}
    </div>
  );
}

// ── Date chip ────────────────────────────────────────────────
function DateChip({ d, isTmrw, isGap }) {
  const pal = usePal();
  const bg    = isGap ? pal.raised : isTmrw ? pal.tmrwChipBg : pal.raised;
  const label = isGap ? pal.bodyMuted : isTmrw ? pal.tmrwGold : pal.gold; // weekday: gold, not red
  const month = isTmrw ? pal.tmrwChipLabel : pal.muted;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `${CARD_PAD_Y}px 12px`, backgroundColor: bg, color: pal.onDark, minWidth: 80, flexShrink: 0 }}>
      <span style={{ ...mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: month }}>{d.month}</span>
      <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 2 }}>{d.dateNum}</span>
      <span style={{ ...mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, color: label, marginTop: 4 }}>{d.dayOfWeek.slice(0, 3)}</span>
      {isTmrw && (
        <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
          {[pal.tmlBlue, pal.tmlRed, pal.tmlGreen, pal.tmlYellow].map((c, i) => (
            <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: c, display: 'block' }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Header content (city, status, weather, time) ─────────────
function HeaderContent({ d, isTmrw, isGap, dateStr }) {
  const pal = usePal();
  const { weather, wmo, loading } = useWeather(d.timezone, dateStr);
  const localTime = useLocalTime(d.timezone);

  const cityColor  = isGap ? pal.gapAccent : isTmrw ? pal.tmrwGold : pal.ink;
  const dotColor   = isGap ? pal.gapAccent : isTmrw ? pal.tmrwGold : pal.accent;
  const statColor  = isGap ? pal.gapAccent : isTmrw ? pal.tmrwGold : pal.accent;
  const labelColor = isTmrw ? pal.tmrwBodyMuted : pal.muted;
  const noteColor  = isTmrw ? pal.tmrwBodyMuted : pal.muted;

  return (
    <div style={{ flex: 1, padding: CARD_PAD, minWidth: 0 }}>
      {/* Local time — the date chip already shows the day, so the full
          day-of-week label here was redundant. */}
      <div style={{ ...mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: labelColor, marginBottom: 4 }}>
        {localTime ? `${localTime} local` : ' '}
      </div>

      {/* City title */}
      <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: cityColor, wordBreak: 'break-word' }}>
        {d.city}
      </h3>

      {/* Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: dotColor, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: statColor }}>{d.status}</span>
      </div>

      {/* Note */}
      {d.note && (
        <p style={{ fontSize: 11, color: noteColor, marginTop: 4, lineHeight: 1.4 }}>{d.note}</p>
      )}

      {/* Weather row — a same-size skeleton holds the space while the per-day
          forecast loads, so the card never grows/jumps; real pills fade in. */}
      <div style={{ marginTop: 8 }}>
        <WeatherPill weather={weather} wmo={wmo} loading={loading} isTmrw={isTmrw} />
      </div>
    </div>
  );
}

// ── Weather pill ─────────────────────────────────────────────
function WeatherPill({ weather, wmo, loading, isTmrw }) {
  const pal = usePal();
  const bg   = isTmrw ? 'rgba(232,184,75,0.12)' : pal.pillBg;
  const text = isTmrw ? pal.tmrwGold : pal.bodyMuted;
  // display:flex (not inline-flex) so each chip stretches to fill its grid
  // cell; the grid gives every chip an equal width regardless of content.
  const chip = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: bg, borderRadius: 4, padding: '3px 7px', ...mono, fontSize: 10, color: text, fontWeight: 600, whiteSpace: 'nowrap' };
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6, width: '100%' };

  // Skeleton: same grid + chip dimensions, transparent text — holds the layout.
  if (loading) {
    return (
      <div style={grid} aria-hidden="true">
        {[0, 1, 2].map(i => <span key={i} style={{ ...chip, color: 'transparent' }}>&nbsp;</span>)}
      </div>
    );
  }
  if (!weather) return null;

  return (
    <div style={grid} className="fx-fade">
      <span style={chip}>
        <span style={{ fontSize: 13 }}>{wmo?.emoji}</span>
        {weather.hi}° / {weather.lo}°
        {weather.seasonal && <span>&nbsp;avg</span>}
      </span>
      {weather.feels != null && (
        <span style={chip}>🌡 Feels {weather.feels}°</span>
      )}
      {weather.precip != null && (
        <span style={chip}>🌧 {weather.precip}% rain</span>
      )}
    </div>
  );
}

// ── Booking refs (collapsible) ───────────────────────────────
function BookingRefs({ refs, isTmrw, isFlightDay }) {
  const [open, setOpen] = React.useState(false);
  const present = usePresence(open, 200);
  const pal = usePal();
  const bg     = isFlightDay ? '#111' : isTmrw ? 'rgba(13,5,24,0.6)' : pal.panel;
  const border = isFlightDay ? '#222' : isTmrw ? pal.tmrwPanelBorder : pal.rule;
  const label  = isFlightDay ? pal.acMuted : isTmrw ? pal.tmrwBodyMuted : pal.muted;
  const val    = isFlightDay ? '#fff' : isTmrw ? pal.tmrwBodyText : pal.ink;

  return (
    <div style={{ borderTop: `1px solid ${border}`, backgroundColor: bg, position: 'relative', zIndex: 1 }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label="Booking references"
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `11px ${CARD_PAD_X}px`, minHeight: 44, background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span style={{ ...mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: label, fontWeight: 600 }}>
          Booking Refs
        </span>
        <ChevronDown size={12} style={{ color: label, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-base) var(--ease-in-out)' }} />
      </button>
      {present && (
        <div className="fx-collapse" data-open={open}>
          <div style={{ padding: `0 ${CARD_PAD_X}px ${CARD_PAD_Y}px`, display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
            {refs.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ ...mono, fontSize: 10, color: label, letterSpacing: '0.1em' }}>{r.label}</span>
                <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: val, letterSpacing: '0.05em' }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lodging panel ────────────────────────────────────────────
function LodgingPanel({ lodging, isTmrw }) {
  const pal = usePal();
  const bg     = isTmrw ? pal.tmrwPanel : lodging.isGap ? pal.gapBg : pal.panel;
  const border = isTmrw ? pal.tmrwPanelBorder : pal.rule;
  const icon   = lodging.isGap ? pal.gapAccent : isTmrw ? pal.tmrwGold : pal.gold; // section + link icons: gold
  const label  = isTmrw ? pal.tmrwBodyText : pal.ink;
  const sub    = isTmrw ? pal.tmrwBodyMuted : pal.muted;
  const name   = lodging.isGap ? pal.bodyMuted : isTmrw ? pal.tmrwBodyText : pal.ink;
  const badgeBg = lodging.booked ? (isTmrw ? pal.tmrwGold : pal.raised) : 'transparent';
  const badgeBorder = lodging.booked ? 'none' : `1px solid ${lodging.isGap ? pal.gapAccent : isTmrw ? pal.tmrwGold : pal.accent}`;
  const badgeText = lodging.booked ? (isTmrw ? pal.tmrwChipBg : pal.onDark) : (lodging.isGap ? pal.gapAccent : isTmrw ? pal.tmrwGold : pal.accent);

  return (
    <div style={{ borderTop: `1px solid ${border}`, backgroundColor: bg, padding: CARD_PAD, position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SECTION_GAP }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bed size={13} style={{ color: icon }} />
          <span style={{ ...mono, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, color: label }}>Lodging</span>
          {lodging.nightLabel && (
            <span style={{ ...mono, fontSize: 10, color: sub, marginLeft: 2 }}>· {lodging.nightLabel}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 3, backgroundColor: badgeBg, border: badgeBorder }}>
          {lodging.booked && <Check size={9} style={{ color: badgeText }} strokeWidth={3} />}
          <span style={{ ...mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: badgeText }}>
            {lodging.booked ? 'Booked' : lodging.isGap ? 'TBD' : 'To book'}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: name }}>{lodging.name}</div>
      {/* Address → Google Maps. Uses the shared tapRow layout; a future travel-
          address link reuses the exact same pattern. */}
      {lodging.address && (
        <a href={mapsHref(`${lodging.name}, ${lodging.address}`)} target="_blank" rel="noopener noreferrer"
          aria-label={`Open ${lodging.name} in Maps`}
          style={{ ...tapRow, fontSize: 11, color: sub, gap: 5 }}>
          <MapPin size={13} style={{ color: icon, flexShrink: 0 }} />
          {lodging.address}
        </a>
      )}
      {lodging.phone && (
        <a href={`tel:${lodging.phone}`} aria-label={`Call ${lodging.name}`}
          style={{ ...tapRow, ...mono, fontSize: 11, color: sub, gap: 5 }}>
          <Phone size={13} style={{ color: icon, flexShrink: 0 }} />
          {lodging.phone}
        </a>
      )}
    </div>
  );
}

// ── Schedule panel ───────────────────────────────────────────
function SchedulePanel({ events, isTmrw }) {
  const pal = usePal();
  const bg     = isTmrw ? pal.tmrwPanel : pal.panel;
  const border = isTmrw ? pal.tmrwPanelBorder : pal.rule;
  const label  = isTmrw ? pal.tmrwBodyText : pal.ink;
  const time   = isTmrw ? pal.tmrwGold : pal.gold; // schedule times: gold, not red
  const text   = isTmrw ? pal.tmrwBodyText : pal.ink;

  // Ticket modal: `ticket` is the current src (kept during the exit anim),
  // `ticketOpen` drives enter/exit so the close can animate before unmount.
  const [ticket, setTicket]         = React.useState(null);
  const [ticketOpen, setTicketOpen] = React.useState(false);

  return (
    <div style={{ borderTop: `1px solid ${border}`, backgroundColor: bg, padding: CARD_PAD, position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: SECTION_GAP }}>
        <Clock size={13} style={{ color: time }} />
        <span style={{ ...mono, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, color: label }}>Schedule</span>
      </div>
      {/* Events list — grows with the day's data; a future "add to schedule" action
          row slots in here with the same ROW_GAP rhythm. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
        {events.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: time, minWidth: 80, flexShrink: 0 }}>{e.time}</span>
            <span style={{ fontSize: 13, lineHeight: 1.3, color: text, flex: 1 }}>{e.label}</span>
            {e.ticket && (
              <button
                onClick={() => { setTicket(e.ticket); setTicketOpen(true); }}
                aria-label={`View ticket for ${e.label}`}
                // align-self center + negative vertical margins: the 44px touch
                // target stays full size but doesn't inflate the baseline row.
                style={{ flexShrink: 0, alignSelf: 'center', width: 44, height: 44, marginTop: -12, marginBottom: -12, marginRight: -10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', color: time, cursor: 'pointer' }}
              >
                <QrCode size={22} />
              </button>
            )}
          </div>
        ))}
      </div>
      <TicketModal open={ticketOpen} src={ticket} onClose={() => setTicketOpen(false)} />
    </div>
  );
}

// ── Ticket modal ─────────────────────────────────────────────
// Almost-full-screen overlay that renders a booked ticket image. Closes on the
// ✕ button, the backdrop, or Escape; locks body scroll and restores focus.
function TicketModal({ open, src, onClose }) {
  const pal = usePal();
  const present = usePresence(open, 240); // keep mounted through the exit anim
  const closeRef = useRef(null);
  const openerRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    setImgLoaded(false);
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!present) return null;

  return createPortal((
    <div
      role="dialog" aria-modal="true" aria-label="Ticket"
      data-open={open} className="fx-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column',
        backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        padding: 'calc(12px + env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) calc(16px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))',
      }}
    >
      {/* Close row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          ref={closeRef} onClick={onClose} aria-label="Close ticket"
          style={{ minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 14px', borderRadius: 999, border: `1px solid ${pal.docRule}`, backgroundColor: '#fff', color: pal.docInk, ...mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          <X size={16} /> Close
        </button>
      </div>
      {/* Ticket — scales in from centre (.fx-modal). Its rounded corners are
          baked into the image (transparent), so drop-shadow hugs the card. The
          image itself fades in on decode so it never flashes a blank frame. */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div
          data-open={open} className="fx-modal"
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 460, filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.22))' }}
        >
          <img
            src={src} alt="Entrance ticket" onLoad={() => setImgLoaded(true)}
            style={{ display: 'block', width: '100%', height: 'auto', opacity: imgLoaded ? 1 : 0, transition: 'opacity var(--dur-base) var(--ease-out)' }}
          />
        </div>
      </div>
    </div>
  ), document.body);
}

// ── Travel panel ─────────────────────────────────────────────
function TravelPanel({ travel }) {
  const isFlight = travel.isFlight === true;
  const isCar    = travel.isCar === true;

  const pal = usePal();
  const bg         = isFlight ? pal.acBlack : pal.panel;
  const border     = isFlight ? pal.acBlack : pal.rule;
  const icon       = isFlight ? pal.acRed   : pal.gold; // travel icon: gold (flight keeps AC red)
  const headLabel  = isFlight ? '#fff'    : pal.ink;
  const fareColor  = isFlight ? pal.acMuted : pal.muted;
  const costColor  = isFlight ? '#fff'    : pal.ink;
  const innerRule  = isFlight ? '#2a2a2a' : pal.rule;
  const chipBg     = isFlight ? pal.acRed   : pal.raised;
  const chipText   = isFlight ? '#fff'    : pal.onDark;
  const legFrom    = isFlight ? '#fff'    : pal.ink;
  const legTime    = isFlight ? pal.acMuted : pal.muted;
  const tagBg      = travel.booked ? (isFlight ? '#fff' : pal.raised) : 'transparent';
  const tagBorder  = travel.booked ? 'none' : `1px solid ${isFlight ? pal.acRedText : pal.accent}`;
  const tagText    = travel.booked ? (isFlight ? pal.acRed : pal.onDark) : (isFlight ? pal.acRedText : pal.accent);
  const checkColor = isFlight ? pal.acRed : pal.onDark;

  return (
    <div style={{ borderTop: `1px solid ${border}`, backgroundColor: bg, padding: CARD_PAD, position: 'relative', overflow: 'hidden', zIndex: 1 }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SECTION_GAP }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isFlight ? <Plane size={13} style={{ color: icon }} />
              : isCar  ? <Car   size={13} style={{ color: icon }} />
              :           <ArrowDown size={13} style={{ color: icon }} />}
            <span style={{ ...mono, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, color: headLabel }}>
              {isFlight ? 'Flight · Air Canada' : isCar ? 'Drive' : 'Train'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 3, backgroundColor: tagBg, border: tagBorder }}>
            {travel.booked && <Check size={9} style={{ color: checkColor }} strokeWidth={3} />}
            <span style={{ ...mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: tagText }}>
              {travel.tag}
            </span>
          </div>
        </div>

        {/* Legs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
          {travel.legs.map((leg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ ...mono, fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 3, backgroundColor: chipBg, color: chipText, minWidth: 56, textAlign: 'center', flexShrink: 0 }}>
                {leg.label}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: legFrom, lineHeight: 1.2 }}>{leg.from} → {leg.to}</div>
                <div style={{ ...mono, fontSize: 10, color: legTime, marginTop: 2 }}>{leg.time}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Fare / cost footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: SECTION_GAP, paddingTop: SECTION_GAP, borderTop: `1px solid ${innerRule}` }}>
          <span style={{ ...mono, fontSize: 11, color: fareColor }}>{travel.fare}</span>
          {travel.cost && <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: costColor }}>{travel.cost}</span>}
        </div>
      </div>
    </div>
  );
}
