// ─────────────────────────────────────────────────────────────
// TRIP DATA — edit this file to update the itinerary live
// Push to GitHub → Vercel redeploys in ~30s → everyone sees it
// ─────────────────────────────────────────────────────────────

// Last updated timestamp — update this string whenever you push changes
// so Grant / Des / Lawrence can see what changed at a glance
export const LAST_UPDATED = '2026-06-07T12:00:00';
export const LAST_UPDATE_NOTE = 'Initial build — all bookings current';

// ─── Hotels ──────────────────────────────────────────────────
const lindner = {
  name: 'Lindner Hotel Antwerp – JDV by Hyatt',
  address: 'Lange Kievitstraat 125, 2018 Antwerpen',
  phone: '+32 3 203 60 00',
  ref: null,
  booked: true,
};

const frankfurtHotel = {
  name: 'Scandic Frankfurt Museumsufer',
  address: 'Wilhelm-Leuschner-Straße 44, 60329 Frankfurt',
  phone: '+49 69 273 130',
  ref: null,
  booked: true,
};

const radissonAntwerp = {
  name: 'Radisson Blu Hotel, Antwerp City Centre',
  address: 'Koningin Astridplein 7, 2018 Antwerpen',
  phone: '+32 3 203 12 34',
  ref: null,
  booked: true,
};

const hiltonBrussels = {
  name: 'Hilton Garden Inn Brussels Airport',
  address: 'Culliganlaan 3A, 1831 Diegem',
  phone: '+32 2 894 39 40',
  ref: null,
  booked: true,
};

// ─── Days ─────────────────────────────────────────────────────
// Each day: { phase?, dateNum, month, dayOfWeek, city, status, note?,
//             isTomorrowland?, isGap?,
//             travel?: { booked, isFlight?, isCar?, legs[], fare, cost, tag, ref? },
//             lodging?: { name, address, phone?, ref?, booked, nightLabel?, isGap? },
//             events?: [{ time, label }],
//             bookingRefs?: [{ label, value }]   ← shows as tap-to-reveal chips
//             timezone: 'Europe/Brussels' | 'Europe/Berlin' | 'America/Vancouver'
//           }
export const days = [
  // ── OUTBOUND ──────────────────────────────────────────────
  {
    phase: 'OUTBOUND',
    dateNum: '15',
    month: 'JUL',
    dayOfWeek: 'Wednesday',
    city: 'Vancouver → Brussels',
    status: 'Fly out',
    note: 'Overnight via Montréal',
    timezone: 'America/Vancouver',
    travel: {
      booked: true,
      isFlight: true,
      legs: [
        { label: 'AC 304', from: 'Vancouver YVR', to: 'Montréal YUL', time: '09:05 → 16:59' },
        { label: 'AC 832', from: 'Montréal YUL', to: 'Brussels BRU', time: '18:25 → 07:10+1' },
      ],
      fare: 'Air Canada · 13h 5m · 1 stop',
      cost: null,
      tag: 'Booked',
      ref: null,
    },
    bookingRefs: [
      { label: 'AC Booking', value: '— add ref —' },
    ],
  },

  {
    dateNum: '16',
    month: 'JUL',
    dayOfWeek: 'Thursday',
    city: 'Brussels → Antwerp',
    status: 'Arrive · Tomorrowland kickoff',
    note: 'Land BRU 07:10 · transit to Antwerp Central',
    timezone: 'Europe/Brussels',
    events: [
      { time: '09:00', label: 'Train shuttle to Belgian Journey / Invited from Antwerp Central' },
      { time: '15:00', label: 'Check-in · Lindner Hotel Antwerp (Day 1/5)' },
      { time: '18:00 – 23:59', label: 'Invited · Brussels, Rue Picard 11' },
    ],
    lodging: { ...lindner, nightLabel: 'Night 1 of 4' },
  },

  // ── TOMORROWLAND ──────────────────────────────────────────
  {
    phase: 'TOMORROWLAND',
    isTomorrowland: true,
    dateNum: '17',
    month: 'JUL',
    dayOfWeek: 'Friday',
    city: 'Boom · Tomorrowland Day 1',
    status: 'Festival',
    timezone: 'Europe/Brussels',
    events: [
      { time: '01:00', label: 'Last shuttle from Belgian Journey / Invited back' },
      { time: '11:00', label: 'Shuttle from hotel to festival' },
    ],
    lodging: { ...lindner, nightLabel: 'Night 2 of 4' },
  },
  {
    isTomorrowland: true,
    dateNum: '18',
    month: 'JUL',
    dayOfWeek: 'Saturday',
    city: 'Boom · Tomorrowland Day 2',
    status: 'Festival',
    timezone: 'Europe/Brussels',
    events: [
      { time: '01:00', label: 'Last shuttle from festival to hotel' },
      { time: '11:00', label: 'Shuttle from hotel to festival' },
    ],
    lodging: { ...lindner, nightLabel: 'Night 3 of 4' },
  },
  {
    isTomorrowland: true,
    dateNum: '19',
    month: 'JUL',
    dayOfWeek: 'Sunday',
    city: 'Boom · Tomorrowland Day 3',
    status: 'Festival · final day',
    timezone: 'Europe/Brussels',
    events: [
      { time: '01:00', label: 'Last shuttle from festival to hotel' },
      { time: '11:00', label: 'Shuttle from hotel to festival' },
    ],
    lodging: { ...lindner, nightLabel: 'Night 4 of 4' },
  },
  {
    dateNum: '20',
    month: 'JUL',
    dayOfWeek: 'Monday',
    city: 'Antwerp',
    status: 'Checkout · last night in Antwerp',
    note: 'Booked by Lawrence · 3 adults, 1 room',
    timezone: 'Europe/Brussels',
    events: [
      { time: '01:00', label: 'Last shuttle from festival to hotel' },
      { time: '12:00', label: 'Check-out · Lindner Hotel Antwerp (Day 5/5)' },
      { time: '15:00', label: 'Check-in · Radisson Blu, Antwerp City Centre' },
    ],
    lodging: { ...radissonAntwerp, nightLabel: 'Mon night' },
  },

  // ── GERMANY WEEK ──────────────────────────────────────────
  {
    phase: 'GERMANY WEEK',
    dateNum: '21',
    month: 'JUL',
    dayOfWeek: 'Tuesday',
    city: 'Antwerp → Frankfurt',
    status: 'Travel day',
    note: 'Arrive Frankfurt 16:33 · pickup Budget car 16:30 (call ahead — tight)',
    timezone: 'Europe/Berlin',
    travel: {
      booked: true,
      legs: [
        { label: 'IC 3333', from: 'Antwerpen-Centraal', to: 'Brussels-Nord', time: '11:40 → ~13:00' },
        { label: 'ICE 315', from: 'Brussels-Nord', to: 'Frankfurt(Main)Hbf', time: '~13:30 → 16:33' },
      ],
      fare: 'Sparpreis Europa',
      cost: '€344 for 4',
      tag: 'Booked',
      ref: 'DB Order 416175198568',
    },
    bookingRefs: [
      { label: 'DB Order', value: '416175198568' },
      { label: 'Budget Car', value: '+49 69 710445596' },
    ],
    lodging: { ...frankfurtHotel, nightLabel: 'Night 1 of 3' },
  },
  {
    dateNum: '22',
    month: 'JUL',
    dayOfWeek: 'Wednesday',
    city: 'Stuttgart',
    status: 'Day trip · Porsche + Mercedes museums',
    timezone: 'Europe/Berlin',
    travel: {
      booked: true,
      isCar: true,
      legs: [
        { label: 'A3 / A5', from: 'Frankfurt', to: 'Stuttgart', time: '~07:30 → ~09:30 (210 km)' },
        { label: 'A8 / A5', from: 'Stuttgart', to: 'Frankfurt', time: '~18:00 → ~20:00' },
      ],
      fare: 'Volvo XC90 · Budget rental',
      cost: null,
      tag: 'Booked',
    },
    events: [
      { time: '11:30 – 12:30', label: 'Porsche Museum tour · Porscheplatz 1, Stuttgart', ticket: '/tickets/porsche-museum.png' },
    ],
    bookingRefs: [
      // Order/booking numbers intentionally kept OFF the public site — they live
      // on the original ticket. The ticket modal's QR + numbers are blurred too.
      { label: 'Museum tickets', value: '€20pp × 3' },
    ],
    lodging: { ...frankfurtHotel, nightLabel: 'Night 2 of 3' },
  },
  {
    dateNum: '23',
    month: 'JUL',
    dayOfWeek: 'Thursday',
    city: 'Köln',
    status: 'Day trip · Kolumba + Cathedral',
    timezone: 'Europe/Berlin',
    travel: {
      booked: true,
      isCar: true,
      legs: [
        { label: 'A3', from: 'Frankfurt', to: 'Köln', time: '~09:00 → ~11:00 (190 km)' },
        { label: 'A3', from: 'Köln', to: 'Frankfurt', time: '~19:00 → ~21:00' },
      ],
      fare: 'Volvo XC90 · Budget rental',
      cost: null,
      tag: 'Booked',
    },
    lodging: { ...frankfurtHotel, nightLabel: 'Night 3 of 3' },
  },

  // ── BRUSSELS RETURN ────────────────────────────────────────
  {
    phase: 'BRUSSELS',
    dateNum: '24',
    month: 'JUL',
    dayOfWeek: 'Friday',
    city: 'Frankfurt → Brussels',
    status: 'Travel day',
    note: 'Drop car at Budget by 16:30 (Schulstrasse 7) · 3 ppl on 12:16 train',
    timezone: 'Europe/Brussels',
    travel: {
      booked: true,
      legs: [
        { label: 'ICE 314', from: 'Frankfurt(Main)Hbf', to: 'Bruxelles-Nord', time: '12:16 → 15:26' },
        { label: 'IC 4536', from: 'Bruxelles-Nord', to: 'Bruxelles-Central', time: '15:32 → 15:36' },
      ],
      fare: 'Sparpreis Europa',
      cost: '€278.49 for 3',
      tag: 'Booked',
    },
    bookingRefs: [
      { label: 'DB Order', value: '— add ref —' },
    ],
    lodging: { ...hiltonBrussels, nightLabel: 'Night 1 of 3' },
  },
  {
    dateNum: '25',
    month: 'JUL',
    dayOfWeek: 'Saturday',
    city: 'Brussels',
    status: 'Free day',
    note: 'Optional day trip to Bruges or Ghent (35–60 min by train)',
    timezone: 'Europe/Brussels',
    lodging: { ...hiltonBrussels, nightLabel: 'Night 2 of 3' },
  },
  {
    dateNum: '26',
    month: 'JUL',
    dayOfWeek: 'Sunday',
    city: 'Brussels',
    status: 'Free day · last night',
    note: 'At the airport hotel — easy hop to BRU for the 09:55 flight',
    timezone: 'Europe/Brussels',
    lodging: { ...hiltonBrussels, nightLabel: 'Night 3 of 3' },
  },

  // ── RETURN ────────────────────────────────────────────────
  {
    phase: 'RETURN',
    dateNum: '27',
    month: 'JUL',
    dayOfWeek: 'Monday',
    city: 'Brussels → Vancouver',
    status: 'Fly home',
    note: 'BRU 09:55 — be at airport by 07:30',
    timezone: 'Europe/Brussels',
    travel: {
      booked: true,
      isFlight: true,
      legs: [
        { label: 'AC 827', from: 'Brussels BRU', to: 'Toronto YYZ', time: '09:55 → 11:45' },
        { label: 'AC 113', from: 'Toronto YYZ', to: 'Vancouver YVR', time: '13:30 → 15:37' },
      ],
      fare: 'Air Canada · 14h 42m · 1 stop',
      cost: null,
      tag: 'Booked',
      ref: null,
    },
    bookingRefs: [
      { label: 'AC Booking', value: '— add ref —' },
    ],
  },
];
