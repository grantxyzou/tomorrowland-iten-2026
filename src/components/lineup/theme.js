// Shared theme tokens + constants for the Lineup tab (dark "Cage" theme).
// Extracted from LineupTab so every sub-module references one source.
import { STAGES } from '../../data/lineup.js';

export const mono = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };
export const sans = { fontFamily: '"Space Grotesk", -apple-system, system-ui, sans-serif' };
// Distinctive display serif — wordmark + stage headers (echoes the poster's
// ornate lettering); labels stay mono, artist names stay sans for legibility.
export const display = { fontFamily: '"Fraunces", Georgia, serif' };

// Palette — "Cage" 2026 edition: deep-blue oil painting + molten gold. The tab
// is a DARK theme: navy surfaces, cream text, bright gold accents.
export const tmrwBg    = '#0c1126';  // deepest surface — picked rows, party btn, clash cards
export const tmrwGold  = '#e8c25e';  // molten gold — accent on dark
export const bodyMuted = '#a9b2cf';  // cool muted text on dark
export const paper     = '#19224a';  // card surface (sections, dropdown, search)
export const ink       = '#f2ecdc';  // primary text → cream
export const muted     = '#a9b2cf';  // secondary text / labels (cool light gray)
export const rule      = '#34406e';  // borders / dividers
export const clashRed  = '#ef6e6e';  // clash warnings (brightened for dark)
export const checkInk  = '#0c1126';  // checkmark stroke — stays dark (sits on a bright person dot)

// Bright identity colours — text/dots/chips on the dark theme. Used with dark
// text (tmrwBg) when filled, or as-is for text/dots on navy surfaces.
export const PERSON_COLORS = {
  Grant:   '#e8b84b',  // gold
  Desmond: '#7aa6dd',  // blue
  Lawrence:'#5cb85c',  // green
};
// Per-person "molten metal" frame gradient — the Lineup border + accents
// re-tint to whoever the "I'm ___" dropdown says you are.
export const FRAME = {
  Grant:    'linear-gradient(135deg, #7a5810 0%, #f3d77a 22%, #b5832a 48%, #ffe8a8 70%, #8a6312 100%)',
  Desmond:  'linear-gradient(135deg, #1f3a6b 0%, #aacaf0 22%, #3f6dae 48%, #d6e8ff 70%, #25406f 100%)',
  Lawrence: 'linear-gradient(135deg, #1f5a2c 0%, #aee0a6 22%, #3f8f46 48%, #d6f5cf 70%, #235e2b 100%)',
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
export const ME_KEY = 'tml2026_me'; // remembers which person this device is
