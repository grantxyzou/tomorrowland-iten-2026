// ─────────────────────────────────────────────────────────────
// TOMORROWLAND WEEKEND 1 LINEUP — Jul 17–19 2026
// Update this file when the official timetable is released
// ─────────────────────────────────────────────────────────────

export const LINEUP_STATUS = 'placeholder'; // change to 'official' when real

export const PEOPLE = ['Grant', 'Des', 'Lawrence'];

// Stages colour-coded
export const STAGES = {
  'Mainstage':      { color: '#e8b84b' },
  'Freedom':        { color: '#4a7fc1' },
  'Core':           { color: '#c94040' },
  'Atmosphere':     { color: '#4a9a4a' },
  'Crystal Garden': { color: '#9b59b6' },
  'Alchemy':        { color: '#e67e22' },
};

// Format: { id, name, stage, day: 'fri'|'sat'|'sun', start: 'HH:MM', end: 'HH:MM' }
// Times are local Belgium time (CEST, UTC+2)
// ── Replace these with the real lineup when it drops ─────────
export const sets = [
  // FRI Jul 17
  { id: 's1',  name: 'Martin Garrix',       stage: 'Mainstage',      day: 'fri', start: '21:00', end: '23:00' },
  { id: 's2',  name: 'Charlotte de Witte',  stage: 'Core',           day: 'fri', start: '22:00', end: '00:00' },
  { id: 's3',  name: 'Amelie Lens',         stage: 'Freedom',        day: 'fri', start: '20:00', end: '22:00' },
  { id: 's4',  name: 'Solomun',             stage: 'Atmosphere',     day: 'fri', start: '23:00', end: '01:00' },
  { id: 's5',  name: 'Tale Of Us',          stage: 'Crystal Garden', day: 'fri', start: '19:00', end: '21:00' },
  { id: 's6',  name: 'Richie Hawtin',       stage: 'Core',           day: 'fri', start: '00:00', end: '02:00' },

  // SAT Jul 18
  { id: 's7',  name: 'Eric Prydz',          stage: 'Mainstage',      day: 'sat', start: '22:00', end: '00:00' },
  { id: 's8',  name: 'BICEP',               stage: 'Freedom',        day: 'sat', start: '21:00', end: '23:00' },
  { id: 's9',  name: 'Fisher',              stage: 'Alchemy',        day: 'sat', start: '20:00', end: '22:00' },
  { id: 's10', name: 'Peggy Gou',           stage: 'Atmosphere',     day: 'sat', start: '19:00', end: '21:00' },
  { id: 's11', name: 'Afterlife',           stage: 'Crystal Garden', day: 'sat', start: '23:00', end: '01:00' },
  { id: 's12', name: 'Âme',                stage: 'Core',           day: 'sat', start: '22:00', end: '00:00' },

  // SUN Jul 19
  { id: 's13', name: 'David Guetta',        stage: 'Mainstage',      day: 'sun', start: '21:00', end: '23:00' },
  { id: 's14', name: 'Nina Kraviz',         stage: 'Core',           day: 'sun', start: '22:00', end: '00:00' },
  { id: 's15', name: 'Disclosure',          stage: 'Freedom',        day: 'sun', start: '20:00', end: '22:00' },
  { id: 's16', name: 'Moderat',             stage: 'Atmosphere',     day: 'sun', start: '19:00', end: '21:00' },
  { id: 's17', name: 'Maceo Plex',          stage: 'Crystal Garden', day: 'sun', start: '23:00', end: '01:00' },
  { id: 's18', name: 'Stephan Bodzin',      stage: 'Alchemy',        day: 'sun', start: '21:00', end: '23:00' },
];
