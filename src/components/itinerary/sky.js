// Sky simulation — the single-value engine behind the Itinerary sky header and
// scrubber. Everything derives from one number: the minute of day (0–1439).
// Pure and dependency-free so it can be unit-tested without a DOM.
//
// Colors and key moments are transcribed from the "Sky Header & Timeline
// Scrubber" design spec (sky gradient stops + celestial arc).

// 12 keyed gradient moments at Boom, Belgium. Between two stops the top and
// bottom colors lerp independently (smoothstep eased). Minutes are minute-of-day.
export const STOPS = [
  { min: 0,    top: '#030715', bottom: '#060b1a' }, // 00:00 NIGHT
  { min: 270,  top: '#0c0a20', bottom: '#180e36' }, // 04:30 PRE-DAWN
  { min: 320,  top: '#3a1808', bottom: '#703010' }, // 05:20 AMBER
  { min: 347,  top: '#a03010', bottom: '#e06020' }, // 05:47 SUNRISE
  { min: 390,  top: '#1868c0', bottom: '#5ab0ee' }, // 06:30 MORNING
  { min: 480,  top: '#1060c8', bottom: '#44a8e8' }, // 08:00 DAY
  { min: 720,  top: '#1258c0', bottom: '#3ea0e0' }, // 12:00 NOON
  { min: 1200, top: '#1668c8', bottom: '#48aaec' }, // 20:00 LATE DAY
  { min: 1250, top: '#c84010', bottom: '#f07030' }, // 20:50 SUNSET
  { min: 1292, top: '#600870', bottom: '#c02898' }, // 21:32 DUSK
  { min: 1355, top: '#120828', bottom: '#220c40' }, // 22:35 TWILIGHT
  { min: 1440, top: '#030715', bottom: '#060b1a' }, // 24:00 NIGHT
];

// Sun is above the horizon between these minutes; the moon takes the rest.
const SUN_RISE = 270;  // 04:30
const SUN_SET  = 1292; // 21:32

const clampMin = (m) => Math.max(0, Math.min(1440, m));
const hexToRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (r, g, b) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const smoothstep = (t) => t * t * (3 - 2 * t);

export function lerpColor(a, b, t) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

// { top, bottom } gradient colors for a given minute.
export function skyGradient(minute) {
  const m = clampMin(minute);
  let i = 0;
  while (i < STOPS.length - 1 && STOPS[i + 1].min <= m) i++;
  const a = STOPS[i];
  const b = STOPS[Math.min(i + 1, STOPS.length - 1)];
  const span = b.min - a.min || 1;
  const t = smoothstep(Math.max(0, Math.min(1, (m - a.min) / span)));
  return { top: lerpColor(a.top, b.top, t), bottom: lerpColor(a.bottom, b.bottom, t) };
}

// { isSun, xPct (5–95), peak (0 at horizon → 1 at zenith), color, glow }.
export function celestial(minute) {
  const m = clampMin(minute);
  const isSun = m >= SUN_RISE && m < SUN_SET;

  let t; // 0→1 progress across the body's own arc
  if (isSun) {
    t = (m - SUN_RISE) / (SUN_SET - SUN_RISE);
  } else {
    const span = 1440 - (SUN_SET - SUN_RISE); // night length in minutes
    const since = m >= SUN_SET ? m - SUN_SET : m + 1440 - SUN_SET;
    t = since / span;
  }

  const xPct = 5 + 90 * t;
  const peak = 4 * t * (1 - t); // parabola: 0 at the ends, 1 at the midpoint

  const color = isSun
    ? lerpColor('#ffb040', '#fffae0', peak) // warm near horizon → bright at zenith
    : '#d8dff4';
  const glow = isSun
    ? (peak > 0.5 ? 'rgba(255,220,80,0.55)' : 'rgba(255,190,60,0.85)')
    : 'rgba(200,215,244,0.5)';

  return { isSun, xPct, peak, color, glow };
}

// Coarse label for the header chip.
export function skyMode(minute) {
  const m = clampMin(minute);
  if (m >= 270 && m < 390) return 'DAWN';   // 04:30–06:30
  if (m >= 390 && m < 1200) return 'DAY';    // 06:30–20:00
  if (m >= 1200 && m < 1355) return 'DUSK';  // 20:00–22:35
  return 'NIGHT';
}
