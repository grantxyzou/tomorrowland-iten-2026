// Shared theme tokens + constants for the Lineup tab.
// Design language: "Direction D — Midnight, Borderless" (token spec).
// Depth comes from a value-based surface ladder + soft shadows — NO strokes.
// Typeface / icons / voice are inherited from the build and unchanged.
import { STAGES } from '../../data/lineup.js';

export const mono = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };
export const sans = { fontFamily: '"Space Grotesk", -apple-system, system-ui, sans-serif' };
// Distinctive display serif — wordmark + stage headers (echoes the poster's
// ornate lettering); labels stay mono, artist names stay sans for legibility.
export const display = { fontFamily: '"Fraunces", Georgia, serif' };

// ── Surfaces — separate by VALUE alone, lighter = nearer (no borders) ──
export const well    = '#070b1c';  // recessed — input wells
export const canvas  = '#0a0e22';  // device / page background
export const tmrwBg  = '#0a0e22';  // alias kept for existing consumers = canvas
export const bar     = '#0c1228';  // bars, toast, sticky publish bar
export const paper   = '#10162e';  // card / sheet surface
export const chip    = '#161d3a';  // chip / panel
export const raised  = '#1a2347';  // raised / selected row (nearer = lighter)

// Tinted surfaces — a clash carries a warm cast, never an outline.
export const clashWell    = '#1a0f17';
export const clashHeader  = '#2a141d';
export const keptInClash  = '#1a2750';
export const droppedDisc  = '#2a1620';
export const unpickedDisc = '#1c2342';
export const togetherSlot = '#10221a';

// ── Text on dark — five steps of brightness ──
export const ink       = '#eef1fb';  // primary
export const bodyMuted = '#c2cae5';  // secondary
export const muted     = '#9aa3c4';  // tertiary — labels / captions
export const caption   = '#6f7aa6';  // muted caption
export const faint     = '#5b67ad';  // faint / unpicked

// ── Spotlight — gold marks exactly one thing per view ──
export const tmrwGold  = '#e9b949';  // gold · active
export const goldLit   = '#f3e6c4';  // gold · lit (display / wordmark / NOW)
export const inkOnGold = '#1a1505';  // text/stroke on a gold or bright fill
export const checkInk  = '#1a1505';  // checkmark stroke (sits on a bright person dot)

// ── Signal — status only, never decoration ──
export const clashRed = '#ff8d86';  // clash · text
export const clashFab = '#e8554e';  // clash · solid / FAB
export const live     = '#7bd06a';  // live · together

// Faint cool hairline for any divider left after the borderless pass.
export const rule = '#1c2342';

// ── Elevation — the only depth tokens (replace borders) ──
export const shPanel  = '0 14px 34px rgba(0,0,0,.50)';        // panel drop
export const shRow    = '0 6px 16px rgba(0,0,0,.45)';         // row / card lift
export const shBar    = '0 -12px 30px rgba(0,0,0,.45)';       // bar (upward)
export const hiTop    = 'inset 0 1px 0 rgba(255,255,255,.05)';// top highlight
export const shWell   = 'inset 0 2px 6px rgba(0,0,0,.60)';    // recessed well
export const glowGold = '0 0 14px rgba(233,185,73,.50)';      // gold glow

// ── Radius scale ──
export const rBadge  = 9;
export const rSeg    = 11;
export const rRow    = 13;
export const rTrack  = 16;
export const rPanel  = 18;
export const rSheet  = 22;
export const rPill   = 30;
export const rDevice = 46;

// Crew — avatar hue carried everywhere; drives the active UI accent.
export const PERSON_COLORS = {
  Grant:   '#e9b949',  // gold
  Desmond: '#8fb6ff',  // blue
  Lawrence:'#e23b3b',  // red
};
// Ink/icon colour that sits ON each person's fill — dark on the light gold/blue
// hues, light on Lawrence's deeper red (so filled chips/badges stay legible).
export const PERSON_INK = {
  Grant:   '#1a1505',
  Desmond: '#11131c',
  Lawrence:'#fff5f4',
};

// Spotify accents: bright brand green for the decorative dot, a darkened
// variant for buttons so white text clears WCAG AA (~6:1).
export const spotifyDot = '#1DB954';
export const spotifyInk = '#0d5c2f';

export const DAYS = [
  { id: 'fri', label: 'Fri 17' },
  { id: 'sat', label: 'Sat 18' },
  { id: 'sun', label: 'Sun 19' },
];

export const VIEWS = [
  { id: 'stage', label: 'Stage' },
  { id: 'time',  label: 'Time' },
  { id: 'crew',  label: 'Crew' },
];

export const STAGE_ORDER = Object.keys(STAGES);
