import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, Check, Plane, Car, Clock, Bed, ChevronDown, QrCode, X } from 'lucide-react';
import { days } from '../data/trip.js';
import { usePresence } from '../hooks/usePresence.js';
import { useWeather } from '../hooks/useWeather.js';
import { useLocalTime } from '../hooks/useLocalTime.js';
import { TomorrowlandMark, AirCanadaMark } from './BrandMarks.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useGroup } from '../groups/GroupContext.jsx';
import { timeToMin } from './lineup/time.js';
import SkyHeader from './itinerary/SkyHeader.jsx';
import TimelineScrubber from './itinerary/TimelineScrubber.jsx';
import AgendaPanel from './itinerary/AgendaPanel.jsx';
import { agendaAt } from './itinerary/agenda.js';
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
  canvas:  '#0a0e22',  // tab background
  bar:     '#0c1228',  // bottom nav / sticky bars
  card:    '#10162e',  // default day card
  panel:   '#161d3a',  // inner panels (lodging / schedule / travel / refs)
  raised:  '#1a2347',  // chips, date chip, leg-label pills
  // Text ramp (light on dark)
  ink:       '#eef1fb', // primary
  bodyMuted: '#c2cae5', // secondary
  muted:     '#9aa3c4', // tertiary — labels / captions
  caption:   '#6f7aa6', // muted caption
  // Accent — the Itinerary's red, brightened to read on dark; spotlight only.
  accent:    '#ff6a4d',
  accentInk: '#240a04', // dark ink on a bright accent / gold fill
  onDark:    '#eef1fb', // light text on a dark fill
  rule:      '#1c2342', // hairline divider
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
const mono = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };

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

export default function ItineraryTab({ onOpenAccount }) {
  const todayIdx = getTodayIndex();
  const refs = useRef([]);
  const { person } = useAuth();
  const { colorFor, inkFor } = useGroup();
  const myColor = colorFor(person);

  // Sky timeline — one value drives everything (spec §1). `liveMinute` ticks from
  // the device clock every 30s; `scrubMin` (null = live) holds a dragged minute.
  const [scrubMin, setScrubMin] = useState(null);
  const [showFull, setShowFull] = useState(false); // in-trip: reveal full day list under the agenda
  const [liveMinute, setLiveMinute] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date(); setLiveMinute(n.getHours() * 60 + n.getMinutes());
    }, 30000);
    return () => clearInterval(id);
  }, []);
  const effectiveMinute = scrubMin ?? liveMinute;
  const pal = useMemo(() => tintedPalette(effectiveMinute), [effectiveMinute]);

  // Header context derived from the existing day data (no new model this slice).
  const today = todayIdx >= 0 ? days[todayIdx] : null;
  const dayLabel = today ? `${today.month} ${today.dateNum}` : null;
  const nextEvent = today?.events?.find(e => eventStartMin(e.time) >= effectiveMinute);
  const nextLabel = nextEvent
    ? (nextEvent.label.length > 34 ? nextEvent.label.slice(0, 33) + '…' : nextEvent.label)
    : null;

  // Auto-scroll to today's card on mount
  useEffect(() => {
    if (todayIdx >= 0 && refs.current[todayIdx]) {
      setTimeout(() => {
        refs.current[todayIdx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [todayIdx]);

  return (
    <PalCtx.Provider value={pal}>
      {/* Ambient backdrop — washes the whole tab warm at dawn / cool at dusk
          (spec §5). Outside those windows pal.canvas === the base canvas, so this
          is a no-op. Sits over the App's static dark layer, behind all content. */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: -1, backgroundColor: pal.canvas, transition: 'background-color 1.2s linear' }} />

      {/* Sky header + scrubber — bleed out of the tab panel's 24px/16px padding
          so the sky runs flush under the tab bar and to the column edges. */}
      <div style={{ margin: '-24px -16px 16px', overflow: 'hidden', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }}>
        <SkyHeader minute={effectiveMinute} dayLabel={dayLabel} nextLabel={nextLabel} />
        <TimelineScrubber
          minute={effectiveMinute}
          isLive={scrubMin === null}
          onScrub={setScrubMin}
          onSync={() => setScrubMin(null)}
        />
      </div>

      {/* During the trip the time-relative agenda is the primary view (spec §4);
          the full day-by-day list tucks behind a toggle. Before/after the trip
          (no "today") the full list shows as before, so the tab is never empty. */}
      {today && (
        <AgendaPanel agenda={agendaAt(today, effectiveMinute)} />
      )}
      {today && (
        <button
          onClick={() => setShowFull(f => !f)}
          aria-expanded={showFull}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', ...mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#9aa3c4', padding: '10px 0 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          Full itinerary
          <ChevronDown size={12} style={{ transform: showFull ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-base) var(--ease-in-out)' }} />
        </button>
      )}

      {(!today || showFull) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 28 }}>
          {days.map((d, idx) => (
            <div key={d.dateNum} ref={el => refs.current[idx] = el}
              className="fx-enter" style={{ animationDelay: `${Math.min(idx, 8) * 45}ms` }}>
              {d.phase && (
                <PhaseDivider phase={d.phase} idx={idx} />
              )}
              <DayCard
                d={d}
                isToday={idx === todayIdx}
                dateStr={dayToDateStr(d)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Bottom nav — mirrors the Lineup TripBar (fixed, safe-area), in the
          Itinerary's light palette. Holds the account chip → shared menu. */}
      {onOpenAccount && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45, paddingBottom: 'env(safe-area-inset-bottom)', backgroundColor: pal.bar, borderTop: `1px solid ${p.rule}`, boxShadow: '0 -2px 16px rgba(0,0,0,0.35)' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', padding: '8px 16px' }}>
            <button
              onClick={onOpenAccount}
              aria-haspopup="dialog"
              aria-label={`Signed in as ${person}. Tap for account and crews.`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', color: p.ink, fontFamily: '"Inter", system-ui, sans-serif' }}
            >
              <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: myColor, color: inkFor(person), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
                {person?.[0]?.toUpperCase()}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person}</span>
              <ChevronDown size={14} color={p.muted} />
            </button>
          </div>
        </div>
      )}
    </PalCtx.Provider>
  );
}

// ── Phase divider ────────────────────────────────────────────
function PhaseDivider({ phase, idx }) {
  const color = phase.includes('OPEN') ? p.gapAccent
              : phase === 'TOMORROWLAND' ? p.tmrwGold // gold reads on the dark canvas
              : p.muted;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, marginTop: idx === 0 ? 0 : 24 }}>
      {/* Lines on both sides so the label is always centred (incl. the first) */}
      <div style={{ flex: 1, height: 1, backgroundColor: p.rule }} />
      <span style={{ ...mono, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700, color }}>
        {phase}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: p.rule }} />
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
  const cardBg    = isGap ? p.gapBg : isTmrw ? p.tmrwBg : pal.card;
  const cardBorder = isGap
    ? `1.5px dashed ${p.gapAccent}`
    : isTmrw
    ? `1px solid ${p.tmrwBorder}`
    : isToday
    ? `2px solid ${p.accent}`
    : `1px solid ${p.rule}`;

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: cardBorder, backgroundColor: cardBg, position: 'relative' }}>
      {/* Watermarks */}
      {isTmrw && (
        // Same fix as the flight card: fixed top anchor (no shift on expand) and
        // a positive right inset so the mark sits fully on-card, never clipped.
        <div aria-hidden="true" style={{ position: 'absolute', top: 18, right: 16, width: 132, height: 132, opacity: 0.09, pointerEvents: 'none', zIndex: 0 }}>
          <TomorrowlandMark color={p.tmrwGold} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
      {isFlightDay && (
        // Anchored to a fixed top (not 50% of a variable-height card, which made it
        // slide when Booking Refs expands) and inset fully on-card so it isn't clipped.
        <div aria-hidden="true" style={{ position: 'absolute', top: 18, right: 16, width: 132, height: 132, opacity: 0.08, pointerEvents: 'none', zIndex: 0 }}>
          <AirCanadaMark color={p.acRed} style={{ width: '100%', height: '100%' }} />
        </div>
      )}

      {/* Today indicator */}
      {isToday && (
        <div style={{ backgroundColor: p.accent, color: p.accentInk, textAlign: 'center', padding: '3px 0', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, ...mono }}>
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
  const bg    = isGap ? pal.raised : isTmrw ? p.tmrwChipBg : pal.raised;
  const label = isGap ? p.bodyMuted : isTmrw ? p.tmrwGold : p.accent;
  const month = isTmrw ? p.tmrwChipLabel : p.muted;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 12px', backgroundColor: bg, color: p.onDark, minWidth: 80, flexShrink: 0 }}>
      <span style={{ ...mono, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: month }}>{d.month}</span>
      <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 2 }}>{d.dateNum}</span>
      <span style={{ ...mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, color: label, marginTop: 4 }}>{d.dayOfWeek.slice(0, 3)}</span>
      {isTmrw && (
        <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
          {[p.tmlBlue, p.tmlRed, p.tmlGreen, p.tmlYellow].map((c, i) => (
            <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: c, display: 'block' }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Header content (city, status, weather, time) ─────────────
function HeaderContent({ d, isTmrw, isGap, dateStr }) {
  const { weather, wmo, loading } = useWeather(d.timezone, dateStr);
  const localTime = useLocalTime(d.timezone);

  const cityColor  = isGap ? p.gapAccent : isTmrw ? p.tmrwGold : p.ink;
  const dotColor   = isGap ? p.gapAccent : isTmrw ? p.tmrwGold : p.accent;
  const statColor  = isGap ? p.gapAccent : isTmrw ? p.tmrwGold : p.accent;
  const labelColor = isTmrw ? p.tmrwBodyMuted : p.muted;
  const noteColor  = isTmrw ? p.tmrwBodyMuted : p.muted;

  return (
    <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
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
  const bg   = isTmrw ? 'rgba(232,184,75,0.12)' : 'rgba(255,255,255,0.06)';
  const text = isTmrw ? p.tmrwGold : p.bodyMuted;
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
  const border = isFlightDay ? '#222' : isTmrw ? p.tmrwPanelBorder : p.rule;
  const label  = isFlightDay ? p.acMuted : isTmrw ? p.tmrwBodyMuted : p.muted;
  const val    = isFlightDay ? '#fff' : isTmrw ? p.tmrwBodyText : p.ink;

  return (
    <div style={{ borderTop: `1px solid ${border}`, backgroundColor: bg, position: 'relative', zIndex: 1 }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label="Booking references"
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', minHeight: 44, background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span style={{ ...mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: label, fontWeight: 600 }}>
          Booking Refs
        </span>
        <ChevronDown size={12} style={{ color: label, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-base) var(--ease-in-out)' }} />
      </button>
      {present && (
        <div className="fx-collapse" data-open={open}>
          <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
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
  const bg     = isTmrw ? p.tmrwPanel : lodging.isGap ? p.gapBg : pal.panel;
  const border = isTmrw ? p.tmrwPanelBorder : p.rule;
  const icon   = lodging.isGap ? p.gapAccent : isTmrw ? p.tmrwGold : p.accent;
  const label  = isTmrw ? p.tmrwBodyText : p.ink;
  const sub    = isTmrw ? p.tmrwBodyMuted : p.muted;
  const name   = lodging.isGap ? p.bodyMuted : isTmrw ? p.tmrwBodyText : p.ink;
  const badgeBg = lodging.booked ? (isTmrw ? p.tmrwGold : pal.raised) : 'transparent';
  const badgeBorder = lodging.booked ? 'none' : `1px solid ${lodging.isGap ? p.gapAccent : isTmrw ? p.tmrwGold : p.accent}`;
  const badgeText = lodging.booked ? (isTmrw ? p.tmrwChipBg : p.onDark) : (lodging.isGap ? p.gapAccent : isTmrw ? p.tmrwGold : p.accent);

  return (
    <div style={{ borderTop: `1px solid ${border}`, backgroundColor: bg, padding: '14px 16px', position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
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
      <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>{lodging.address}</div>
      {lodging.phone && (
        <a href={`tel:${lodging.phone}`} aria-label={`Call ${lodging.name}`} style={{ ...mono, fontSize: 11, color: icon, display: 'inline-flex', alignItems: 'center', minHeight: 44, textDecoration: 'none' }}>
          {lodging.phone}
        </a>
      )}
    </div>
  );
}

// ── Schedule panel ───────────────────────────────────────────
function SchedulePanel({ events, isTmrw }) {
  const pal = usePal();
  const bg     = isTmrw ? p.tmrwPanel : pal.panel;
  const border = isTmrw ? p.tmrwPanelBorder : p.rule;
  const label  = isTmrw ? p.tmrwBodyText : p.ink;
  const time   = isTmrw ? p.tmrwGold : p.accent;
  const text   = isTmrw ? p.tmrwBodyText : p.ink;

  // Ticket modal: `ticket` is the current src (kept during the exit anim),
  // `ticketOpen` drives enter/exit so the close can animate before unmount.
  const [ticket, setTicket]         = React.useState(null);
  const [ticketOpen, setTicketOpen] = React.useState(false);

  return (
    <div style={{ borderTop: `1px solid ${border}`, backgroundColor: bg, padding: '14px 16px', position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Clock size={13} style={{ color: time }} />
        <span style={{ ...mono, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, color: label }}>Schedule</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
          style={{ minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 14px', borderRadius: 999, border: `1px solid ${p.docRule}`, backgroundColor: '#fff', color: p.docInk, ...mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
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
  const bg         = isFlight ? p.acBlack : pal.panel;
  const border     = isFlight ? p.acBlack : p.rule;
  const icon       = isFlight ? p.acRed   : p.accent;
  const headLabel  = isFlight ? '#fff'    : p.ink;
  const fareColor  = isFlight ? p.acMuted : p.muted;
  const costColor  = isFlight ? '#fff'    : p.ink;
  const innerRule  = isFlight ? '#2a2a2a' : p.rule;
  const chipBg     = isFlight ? p.acRed   : pal.raised;
  const chipText   = isFlight ? '#fff'    : p.onDark;
  const legFrom    = isFlight ? '#fff'    : p.ink;
  const legTime    = isFlight ? p.acMuted : p.muted;
  const tagBg      = travel.booked ? (isFlight ? '#fff' : pal.raised) : 'transparent';
  const tagBorder  = travel.booked ? 'none' : `1px solid ${isFlight ? p.acRedText : p.accent}`;
  const tagText    = travel.booked ? (isFlight ? p.acRed : p.onDark) : (isFlight ? p.acRedText : p.accent);
  const checkColor = isFlight ? p.acRed : p.onDark;

  return (
    <div style={{ borderTop: `1px solid ${border}`, backgroundColor: bg, padding: '14px 16px', position: 'relative', overflow: 'hidden', zIndex: 1 }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${innerRule}` }}>
          <span style={{ ...mono, fontSize: 11, color: fareColor }}>{travel.fare}</span>
          {travel.cost && <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: costColor }}>{travel.cost}</span>}
        </div>
      </div>
    </div>
  );
}
