import React, { useEffect, useRef } from 'react';
import { ArrowDown, Check, Plane, Car, Clock, Bed, AlertCircle, ChevronDown } from 'lucide-react';
import { days } from '../data/trip.js';
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
  // Tomorrowland
  tmrwBg:       '#1a0a2e',
  tmrwChipBg:   '#0d0518',
  tmrwGold:     '#e8b84b',
  tmrwChipLabel:'#a37622',
  tmrwBodyText: '#f0e8d8',
  tmrwBodyMuted:'#b8a888',
  tmrwBorder:   '#3d2a0a',
  tmrwPanel:    'rgba(13,5,24,0.75)',
  tmrwPanelBorder: 'rgba(232,184,75,0.15)',
  // Elemental dots
  tmlBlue:  '#4a7fc1', tmlRed: '#c94040', tmlGreen: '#4a9a4a', tmlYellow: '#e8b84b',
};
const sans = { fontFamily: '"Space Grotesk", -apple-system, system-ui, sans-serif' };
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
              : phase === 'TOMORROWLAND' ? p.tmrwGold
              : p.muted;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, marginTop: idx === 0 ? 0 : 24 }}>
      {idx > 0 && <div style={{ flex: 1, height: 1, backgroundColor: p.rule }} />}
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
        <LodgingPanel lodging={d.lodging} isTmrw={isTmrw} isGap={isGap} />
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

      {/* Weather row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        {!loading && weather && (
          <WeatherPill weather={weather} wmo={wmo} isTmrw={isTmrw} />
        )}
      </div>
    </div>
  );
}

// ── Weather pill ─────────────────────────────────────────────
function WeatherPill({ weather, wmo, isTmrw }) {
  const bg   = isTmrw ? 'rgba(232,184,75,0.12)' : 'rgba(26,22,20,0.06)';
  const text = isTmrw ? p.tmrwGold : p.muted;
  const chip = { display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: bg, borderRadius: 4, padding: '2px 7px', ...mono, fontSize: 10, color: text, fontWeight: 600 };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
  const bg     = isFlightDay ? '#111' : isTmrw ? 'rgba(13,5,24,0.6)' : p.cardBg;
  const border = isFlightDay ? '#222' : isTmrw ? p.tmrwPanelBorder : p.ruleSubtle;
  const label  = isFlightDay ? p.acMuted : isTmrw ? p.tmrwBodyMuted : p.muted;
  const val    = isFlightDay ? '#fff' : isTmrw ? p.tmrwBodyText : p.ink;

  return (
    <div style={{ borderTop: `1px solid ${border}`, backgroundColor: bg, position: 'relative', zIndex: 1 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <span style={{ ...mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: label, fontWeight: 600 }}>
          Booking Refs
        </span>
        <ChevronDown size={12} style={{ color: label, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {refs.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ ...mono, fontSize: 10, color: label, letterSpacing: '0.1em' }}>{r.label}</span>
              <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: val, letterSpacing: '0.05em' }}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lodging panel ────────────────────────────────────────────
function LodgingPanel({ lodging, isTmrw, isGap }) {
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
        <a href={`tel:${lodging.phone}`} style={{ ...mono, fontSize: 10, color: icon, marginTop: 3, display: 'inline-block', textDecoration: 'none' }}>
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
            <span style={{ fontSize: 13, lineHeight: 1.3, color: text }}>{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
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
