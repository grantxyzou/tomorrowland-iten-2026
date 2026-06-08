import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, Check, Plane, Car, Clock, Bed, ChevronDown, QrCode, X } from 'lucide-react';
import { days } from '../data/trip.js';
import { usePresence } from '../hooks/usePresence.js';
import { useWeather } from '../hooks/useWeather.js';
import { useLocalTime } from '../hooks/useLocalTime.js';
import { TomorrowlandMark, AirCanadaMark } from './BrandMarks.jsx';

// ── Palette ──────────────────────────────────────────────────
const p = {
  accent:       '#a82a13',
  accentLight:  '#ff6a4d',  // brighter red for small text on the dark date chip (AA on #1a1614)
  gapAccent:    '#7a5814',
  ink:          '#1a1614',
  paper:        '#ede7d8',
  muted:        '#5c544c',
  subtle:       '#938b81',
  rule:         '#cabda4',
  ruleSubtle:   '#e1d6bf',
  cardBg:       '#f5efde',
  gapBg:        '#f0e6cf',
  calloutBg:    '#ebe3cf',
  // Air Canada
  acBlack:      '#0a0a0a',
  acRed:        '#D82F2E',
  acRedText:    '#ff5747',
  acMuted:      '#b9b3ad',
  acWhite:      '#ffffff',
  // Tomorrowland — "Consciencia" 2026: golden-hour desert (warm shadow + liquid
  // gold), matched to the Lineup tab. Festival day cards (Jul 17–19).
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
};
const mono = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };

// Format date as YYYY-MM-DD for weather API
function dayToDateStr(day) {
  return `2026-07-${day.dateNum.padStart(2, '0')}`;
}

// Determine if a day is "today" or "upcoming next"
function getTodayIndex() {
  const now = new Date();
  const tripStart = new Date('2026-07-15');
  const tripEnd   = new Date('2026-07-27');
  if (now < tripStart || now > tripEnd) return -1;
  const diff = Math.floor((now - tripStart) / 86_400_000);
  return Math.min(diff, days.length - 1);
}

export default function ItineraryTab() {
  const todayIdx = getTodayIndex();
  const refs = useRef([]);

  // Auto-scroll to today's card on mount
  useEffect(() => {
    if (todayIdx >= 0 && refs.current[todayIdx]) {
      setTimeout(() => {
        refs.current[todayIdx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [todayIdx]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {days.map((d, idx) => (
        <div key={d.dateNum} ref={el => refs.current[idx] = el}>
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
  );
}

// ── Phase divider ────────────────────────────────────────────
function PhaseDivider({ phase, idx }) {
  const color = phase.includes('OPEN') ? p.gapAccent
              : phase === 'TOMORROWLAND' ? '#7a5d10' // dark gold — passes AA on light paper
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
  const isGap       = d.isGap === true;
  const isTmrw      = d.isTomorrowland === true;
  const isFlightDay = d.travel?.isFlight === true;

  const cardBg    = isGap ? p.gapBg : isTmrw ? p.tmrwBg : isFlightDay ? p.acWhite : p.cardBg;
  const cardBorder = isGap
    ? `1.5px dashed ${p.gapAccent}`
    : isTmrw
    ? `1px solid ${p.tmrwBorder}`
    : isFlightDay
    ? `1px solid ${p.acBlack}`
    : isToday
    ? `2px solid ${p.accent}`
    : `1px solid ${p.ruleSubtle}`;

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
        <div style={{ backgroundColor: p.accent, color: p.paper, textAlign: 'center', padding: '3px 0', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, ...mono }}>
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
  const bg    = isGap ? p.gapAccent : isTmrw ? p.tmrwChipBg : p.ink;
  const label = isGap ? '#fff5dc'  : isTmrw ? p.tmrwGold    : p.accentLight;
  const month = isTmrw ? p.tmrwChipLabel : p.subtle;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 12px', backgroundColor: bg, color: p.paper, minWidth: 80, flexShrink: 0 }}>
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
  const bg   = isTmrw ? 'rgba(232,184,75,0.12)' : 'rgba(26,22,20,0.06)';
  const text = isTmrw ? p.tmrwGold : p.muted;
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
  const bg     = isFlightDay ? '#111' : isTmrw ? 'rgba(13,5,24,0.6)' : p.cardBg;
  const border = isFlightDay ? '#222' : isTmrw ? p.tmrwPanelBorder : p.ruleSubtle;
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
  const bg     = isTmrw ? p.tmrwPanel : lodging.isGap ? '#e8dcbf' : p.calloutBg;
  const border = isTmrw ? p.tmrwPanelBorder : p.ruleSubtle;
  const icon   = lodging.isGap ? p.gapAccent : isTmrw ? p.tmrwGold : p.accent;
  const label  = isTmrw ? p.tmrwBodyText : p.ink;
  const sub    = isTmrw ? p.tmrwBodyMuted : p.muted;
  const name   = lodging.isGap ? p.gapAccent : isTmrw ? p.tmrwBodyText : p.ink;
  const badgeBg = lodging.booked ? (isTmrw ? p.tmrwGold : p.ink) : 'transparent';
  const badgeBorder = lodging.booked ? 'none' : `1px solid ${lodging.isGap ? p.gapAccent : isTmrw ? p.tmrwGold : p.accent}`;
  const badgeText = lodging.booked ? (isTmrw ? p.tmrwChipBg : p.paper) : (lodging.isGap ? p.gapAccent : isTmrw ? p.tmrwGold : p.accent);

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
  const bg     = isTmrw ? p.tmrwPanel : p.calloutBg;
  const border = isTmrw ? p.tmrwPanelBorder : p.ruleSubtle;
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
          style={{ minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 14px', borderRadius: 999, border: `1px solid ${p.rule}`, backgroundColor: '#fff', color: p.ink, ...mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
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

  const bg         = isFlight ? p.acBlack : p.calloutBg;
  const border     = isFlight ? p.acBlack : p.ruleSubtle;
  const icon       = isFlight ? p.acRed   : p.accent;
  const headLabel  = isFlight ? '#fff'    : p.ink;
  const fareColor  = isFlight ? p.acMuted : p.muted;
  const costColor  = isFlight ? '#fff'    : p.ink;
  const innerRule  = isFlight ? '#2a2a2a' : p.ruleSubtle;
  const chipBg     = isFlight ? p.acRed   : p.ink;
  const chipText   = '#fff';
  const legFrom    = isFlight ? '#fff'    : p.ink;
  const legTime    = isFlight ? p.acMuted : p.muted;
  const tagBg      = travel.booked ? (isFlight ? '#fff' : p.ink) : 'transparent';
  const tagBorder  = travel.booked ? 'none' : `1px solid ${isFlight ? p.acRedText : p.accent}`;
  const tagText    = travel.booked ? (isFlight ? p.acRed : p.paper) : (isFlight ? p.acRedText : p.accent);
  const checkColor = isFlight ? p.acRed : p.paper;

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
