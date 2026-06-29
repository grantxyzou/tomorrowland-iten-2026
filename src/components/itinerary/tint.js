// Ambient surface tint (spec §5). Dawn bleeds warm into surfaces, dusk bleeds
// cool — strongest on the deepest surfaces, never touching text (callers apply
// it to surface tokens only). All pure; tintAt() is keyed on the minute of day.

const DAWN = { start: 270, peak: 345, end: 450, rgb: [200, 90, 15], peakStrength: 0.16 };  // 04:30–07:30
const DUSK = { start: 1200, peak: 1290, end: 1380, rgb: [140, 20, 100], peakStrength: 0.14 }; // 20:00–23:00

function rampStrength(w, m) {
  if (m <= w.start || m >= w.end) return 0;
  return m < w.peak
    ? w.peakStrength * (m - w.start) / (w.peak - w.start)
    : w.peakStrength * (w.end - m) / (w.end - w.peak);
}

// { rgb, strength } for the minute. strength 0 outside the dawn/dusk windows.
export function tintAt(minute) {
  const dawn = rampStrength(DAWN, minute);
  if (dawn > 0) return { rgb: DAWN.rgb, strength: dawn };
  const dusk = rampStrength(DUSK, minute);
  if (dusk > 0) return { rgb: DUSK.rgb, strength: dusk };
  return { rgb: [0, 0, 0], strength: 0 };
}

const hexToRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

// Lerp a surface hex toward the tint colour by strength*mult (clamped to 1).
// Deeper surfaces pass a higher mult so they carry more warmth/cool.
export function mixSurface(hex, tint, mult) {
  if (!tint || !tint.strength) return hex;
  const s = Math.min(1, tint.strength * mult);
  const [r, g, b] = hexToRgb(hex);
  const [tr, tg, tb] = tint.rgb;
  return rgbToHex(r + (tr - r) * s, g + (tg - g) * s, b + (tb - b) * s);
}
