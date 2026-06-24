// ─────────────────────────────────────────────────────────────
// TOMORROWLAND WEEKEND 1 LINEUP — Jul 17–19 2026
//
// Real per-day split (Day 1 = Fri 17, Day 2 = Sat 18, Day 3 = Sun 19),
// now with OFFICIAL SET TIMES read off the released per-day timetables.
// Times are local Belgium time (Europe/Brussels), 24h "HH:MM". Sets that
// run past midnight use the early-AM time for `end` (e.g. end: '01:00');
// the clash + time logic in LineupTab adds 1440 min internally, so no
// special-casing is needed here.
//
// When the timetable dropped, several entries that had been tagged
// `status:'new'` (provisional, no published day) moved to their real
// day/stage — e.g. Bassjackers → Fri Mainstage, Sef sansT → Sat Celestia,
// Aline Rocha → Sun Freedom, the Wilbert Pigmans / Effe Serieus Moose Bar
// swap, and the House of Fortune reshuffle (Da Tweekaz, Blasterjaxx, Sam
// Hofman, Kris Kross Amsterdam, Amber Broos). They keep `status:'new'`.
//
// Timetable blocks that aren't traditional roster artists are still
// included with their times: the festival "Discovery" opening segments,
// the "Surprise" guest slots, and the extra acts Frank Verstraeten /
// Karakals. The only blocks left out are the "More To Be Announced"
// placeholders (no act to name) and hosts/MCs who don't get a set time —
// MC Stretch, MC Rim, MC Claudio, MC Pyro, MC Mota. Those MCs and a couple
// of unannounced acts (e.g. Villain) stay as plain strings = "Set time TBA".
//
// ENTRY SHAPE — a roster entry is either:
//   • a plain string                      → unchanged, time TBA
//   • { name, status, idSlug, start, end }
//       status : 'new' | 'edited' | 'deleted'  (omit = unchanged)
//                 new     → added in the latest official sync
//                 edited  → renamed/corrected to the official spelling
//                 deleted → dropped from the lineup; kept on screen,
//                           struck through, not pickable
//       idSlug : pins the set-id slug so picks survive a rename
//                (see the durability rule by `sets` below)
// ─────────────────────────────────────────────────────────────

export const LINEUP_STATUS = 'official'; // 'placeholder' | 'official-partial' | 'official'

export const PEOPLE = ['Grant', 'Desmond', 'Lawrence'];

// Stage key hues — Direction D "midnight" register: brighter, cleaner dots on
// the dark surfaces. The six headline stages use the token-spec values; the
// rest are harmonised to the same brightness and kept visually distinct.
export const STAGES = {
  'Mainstage':              { color: '#e9b949' },
  'Freedom by Bud':         { color: '#46d0b0' },
  'The Rose Garden':        { color: '#e7669a' },
  'Elixir':                 { color: '#7bd06a' },
  'Cage':                   { color: '#caa6ff' },
  'The Rave Cave':          { color: '#8fb6ff' },
  'Planaxis':               { color: '#46c2b4' },
  'Melodia by Corona':      { color: '#ef7a6f' },
  'Celestia by KuCoin':     { color: '#6fa0ff' },
  'Atmosphere':             { color: '#9bd06a' },
  'Core':                   { color: '#e58ab0' },
  'Crystal Garden':         { color: '#aab6ff' },
  'The Great Library':      { color: '#d9c24a' },
  'Moose Bar':              { color: '#6ec888' },
  'House of Fortune by JBL':{ color: '#c6cce0' },
};

// ── Lineup by day → stage → artists (with official set times) ─
export const LINEUP = {
  fri: {
    'Mainstage': [
      { name: 'Discovery', start: '12:00', end: '14:00' },
      { name: 'The Chainsmokers', status: 'edited', idSlug: 'chainsmokers', start: '21:45', end: '22:45' },
      { name: 'Disco Lines', start: '15:30', end: '16:30' },
      { name: 'Henri PFR', start: '17:35', end: '18:35' },
      { name: 'Marlon Hoffstadt', start: '19:40', end: '20:40' },
      { name: 'Martin Garrix', start: '23:50', end: '00:50' },
      'MC Stretch',
      { name: 'Nervo', start: '18:40', end: '19:40' },
      { name: 'Novah', start: '20:40', end: '21:40' },
      { name: 'Sebastian Ingrosso', start: '22:50', end: '23:50' },
      { name: 'Vintage Culture', status: 'new', start: '14:00', end: '15:30' },
      { name: 'Bassjackers', status: 'new', start: '16:30', end: '17:30' },
    ],
    'Freedom by Bud': [
      { name: '4444 of a Kind', status: 'new', start: '22:30', end: '23:30' },
      { name: 'Frank Verstraeten', start: '16:30', end: '18:00' },
      { name: 'Holy Priest', start: '23:30', end: '00:30' },
      { name: 'Jesabel', start: '13:30', end: '15:00' },
      { name: 'Max Styler', start: '18:00', end: '19:30' },
      { name: 'Mind Against', start: '21:00', end: '22:30' },
      { name: 'Miss Monique', start: '19:30', end: '21:00' },
      { name: 'Rose Ringed', start: '15:00', end: '16:30' },
      { name: 'Semsei', start: '12:00', end: '13:30' },
    ],
    'The Rose Garden': [
      { name: 'A Little Sound', start: '21:00', end: '22:00' },
      { name: 'Æon:Mode', status: 'edited', idSlug: 'dn-mode', start: '19:00', end: '20:00' },
      { name: 'Alison Wonderland', start: '23:00', end: '00:00' },
      { name: 'Anton Invicta', start: '14:30', end: '16:00' },
      { name: 'Blooom B2B Sudley', start: '17:00', end: '18:00' },
      { name: 'Camo & Krooked', start: '00:00', end: '01:00' },
      { name: 'Kanine', start: '22:00', end: '23:00' },
      { name: 'Mae.Lien', start: '13:30', end: '14:30' },
      { name: 'Murdock', start: '20:00', end: '21:00' },
      { name: 'Primate', start: '18:00', end: '19:00' },
      { name: 'Stoog3s', start: '16:00', end: '17:00' },
      { name: 'Synoxis', start: '12:00', end: '13:30' },
    ],
    'Elixir': [
      { name: 'Audiowave', start: '22:30', end: '23:30' },
      { name: 'Flavour Drop', start: '18:00', end: '19:30' },
      { name: 'High Grade Sound', start: '14:30', end: '16:00' },
      'MC Rim',
      { name: 'Milinguap', start: '16:00', end: '17:00' },
      { name: 'Monsieur', start: '13:00', end: '14:30' },
      { name: 'Nona Van Braeckel', start: '20:30', end: '21:30' },
      { name: "Rick & James 80's Party", start: '23:30', end: '01:00' },
      { name: 'Soul Shakers', start: '17:00', end: '18:00' },
      { name: 'Tola Og', start: '19:30', end: '20:30' },
      { name: 'Unregular', start: '21:30', end: '22:30' },
    ],
    'Cage': [
      { name: 'Dither', start: '18:00', end: '19:00' },
      { name: 'Elmefti', start: '15:00', end: '16:00' },
      { name: 'GPF B2B Dr Donk', start: '19:00', end: '20:00' },
      { name: 'Lolalita & Brennt (Live)', status: 'edited', start: '16:00', end: '17:00' },
      { name: 'Lunakorpz', start: '21:00', end: '22:00' },
      { name: 'Mind Compressor', start: '20:00', end: '21:00' },
      { name: 'Rayzen', start: '13:00', end: '14:00' },
      { name: 'Sacha Malice', start: '12:00', end: '13:00' },
      { name: 'Vernex B2B Nrki', start: '22:00', end: '23:00' },
      { name: 'Von Bikräv', start: '17:00', end: '18:00' },
      { name: 'Sandy Warez B2B Revenja', status: 'new', start: '14:00', end: '15:00' },
    ],
    'The Rave Cave': [
      { name: 'Ben Malone', status: 'deleted' },
      { name: 'Cvnts', start: '22:00', end: '23:00' },
      { name: 'Junkie Kid', start: '23:00', end: '00:00' },
      { name: 'Nastya Dikikh', start: '21:00', end: '22:00' },
      { name: 'Paloma', start: '17:00', end: '18:30' },
      { name: 'Thomas Moulene', start: '14:30', end: '16:00' },
      { name: 'Zuke', start: '18:30', end: '19:30' },
      { name: 'Justin Wilkes', status: 'new', start: '19:30', end: '21:00' },
      { name: 'Panda Sound System', status: 'new', start: '16:00', end: '17:00' },
    ],
    'Planaxis': [
      { name: 'Cyborg-18', start: '12:00', end: '13:00' },
      { name: 'Fabio Fusco', start: '19:00', end: '20:00' },
      { name: 'Firaga', start: '16:00', end: '17:00' },
      { name: 'Hi Profile', start: '18:00', end: '19:00' },
      { name: 'John 00 Fleming', start: '15:00', end: '16:00' },
      { name: 'Mad Maxx', start: '22:30', end: '00:00' },
      { name: 'Neelix', status: 'edited', start: '20:00', end: '21:30' },
      { name: 'Omiki', start: '21:30', end: '22:30' },
      { name: 'Somnia', start: '17:00', end: '18:00' },
      { name: 'Trip-Tamine', start: '14:00', end: '15:00' },
      { name: 'Yannick Thiry', start: '13:00', end: '14:00' },
    ],
    'Melodia by Corona': [
      { name: 'Awen', start: '20:30', end: '22:00' },
      { name: 'Da Capo B2B Caiiro B2B Enoo Napa', start: '22:00', end: '00:00' },
      { name: 'Danni Gato', start: '18:00', end: '19:00' },
      { name: 'Isa Roos', start: '12:00', end: '13:30' },
      { name: 'Lerato Tsotetsi', start: '13:30', end: '15:00' },
      { name: 'Rosey Gold', start: '15:00', end: '16:30' },
      { name: 'Thakzin', start: '16:30', end: '18:00' },
      { name: 'Vanco', start: '19:00', end: '20:30' },
    ],
    'Celestia by KuCoin': [
      { name: 'Bennett', start: '21:30', end: '23:00' },
      { name: 'Diffrent', start: '17:00', end: '18:30' },
      { name: 'Juno', start: '14:00', end: '15:30' },
      { name: 'MPH', start: '18:30', end: '20:00' },
      { name: 'MRMK', start: '13:00', end: '14:00' },
      { name: 'Olive Anguz', start: '20:00', end: '21:30' },
      { name: 'Roox', start: '12:00', end: '13:00' },
      { name: 'Rozie', start: '15:30', end: '17:00' },
    ],
    'Atmosphere': [
      { name: 'Bisoux', start: '12:00', end: '14:00' },
      { name: 'Kuko', start: '18:30', end: '20:00' },
      { name: 'Mandy B2B Negitiv', start: '20:00', end: '21:30' },
      { name: 'Nico Moreno', start: '21:30', end: '23:00' },
      { name: 'Peterblue', start: '15:30', end: '17:00' },
      { name: 'Row1', start: '14:00', end: '15:30' },
      { name: 'Sara Landry', status: 'new', start: '23:00', end: '00:55' },
      { name: 'Simone B2B Southstar', status: 'new', start: '17:00', end: '18:30' },
    ],
    'Core': [
      { name: 'Bibi Seck', start: '17:00', end: '19:00' },
      { name: 'Eileen', start: '12:00', end: '14:00' },
      { name: 'John Noseda B2B Kenny Montana', status: 'edited', start: '14:00', end: '17:00' },
      { name: 'Modeselektor (DJ-set)', start: '23:00', end: '00:50' },
      { name: 'Sally C', start: '19:00', end: '21:00' },
      { name: 'Sasha B2B Young Marco', status: 'new', start: '21:00', end: '23:00' },
    ],
    'Crystal Garden': [
      { name: 'Camila Jun', status: 'edited', start: '16:30', end: '18:00' },
      { name: 'Eridu', start: '13:30', end: '15:00' },
      { name: 'Kettama B2B Michael Bibi', start: '21:00', end: '23:00' },
      { name: 'Marsolo', start: '15:00', end: '16:30' },
      { name: 'Djora', start: '12:00', end: '13:30' },
      { name: 'Blond:ish', status: 'new', start: '19:30', end: '21:00' },
      { name: 'Franky Rizardo', status: 'new', start: '23:00', end: '00:30' },
    ],
    'The Great Library': [
      { name: 'Artbat', start: '22:00', end: '23:00' },
      { name: 'Da Tweekaz', start: '19:00', end: '20:00' },
      { name: 'DJ Sally', start: '15:00', end: '16:00' },
      { name: 'Hardwell B2B Sub Zero Project', start: '00:00', end: '00:55' },
      { name: 'Magik', start: '12:00', end: '13:00' },
      { name: 'Manuals', start: '13:00', end: '14:00' },
      { name: 'Mike Williams', start: '17:00', end: '18:00' },
      { name: 'Nicky Romero', start: '23:00', end: '00:00' },
      { name: 'Ofenbach', start: '20:00', end: '21:00' },
      { name: 'R3hab', start: '21:00', end: '22:00' },
      { name: 'Sam Feldt', start: '18:00', end: '19:00' },
      { name: 'Tomas Grey', start: '14:00', end: '15:00' },
      { name: 'Whisnu Santika', start: '16:00', end: '17:00' },
    ],
    'Moose Bar': [
      { name: 'Bosart', start: '12:00', end: '16:00' },
      { name: 'Funktastix', start: '20:00', end: '00:00' },
      { name: 'Rino', start: '16:00', end: '19:00' },
      { name: 'Wilbert Pigmans', status: 'new', start: '19:00', end: '20:00' },
    ],
    'House of Fortune by JBL': [
      { name: 'Conrad Taylor', start: '18:00', end: '19:00' },
      { name: 'Fran Ares', start: '14:00', end: '15:00' },
      { name: 'Gravagerz', start: '21:00', end: '22:00' },
      { name: 'Lucca Van Damme', start: '15:00', end: '16:00' },
      { name: 'Mike Williams Throwback Set', status: 'edited', start: '20:00', end: '21:00' },
      { name: 'Nicky Romero', start: '19:00', end: '20:00' },
      { name: 'Stadiumx', start: '16:00', end: '17:00' },
      { name: 'Amber Broos B2B DJ Daddy Broos', status: 'new', start: '17:00', end: '18:00' },
    ],
  },

  sat: {
    'Mainstage': [
      { name: 'Discovery', start: '12:00', end: '14:00' },
      { name: 'Boris Brejcha', start: '19:10', end: '20:10' },
      { name: 'David Guetta', start: '23:35', end: '00:50' },
      { name: 'Dimitri Vegas & Like Mike', start: '22:20', end: '23:35' },
      { name: 'Fisher', start: '21:15', end: '22:15' },
      { name: 'Halō', start: '18:10', end: '19:10' },
      { name: 'John Newman', start: '20:10', end: '21:10' },
      { name: 'Maddix', start: '17:05', end: '18:05' },
      'MC Stretch',
      { name: 'Merow', start: '14:00', end: '15:00' },
      { name: 'Omdat Het Kan & Average Rob', start: '16:00', end: '17:00' },
      { name: 'Stephani B', start: '15:00', end: '16:00' },
    ],
    'Freedom by Bud': [
      { name: 'Armin van Buuren', start: '22:00', end: '00:30' },
      { name: 'Dave Lambert', start: '12:00', end: '13:30' },
      { name: 'Luna & Lenthe', start: '13:30', end: '15:00' },
      { name: 'Meduza³', start: '19:00', end: '20:00' },
      { name: 'Netsky', start: '20:00', end: '21:00' },
      { name: 'Plastik Funk B2B Olympe', start: '15:00', end: '16:30' },
      { name: 'Space 92', start: '16:30', end: '18:00' },
      { name: 'Symphony Of Unity', start: '18:00', end: '19:00' },
      { name: 'Symphony Of Unity', start: '21:00', end: '22:00' },
    ],
    'The Rose Garden': [
      { name: 'Blvckprint', start: '15:00', end: '16:00' },
      { name: 'Bonzai All Stars', start: '00:00', end: '01:00' },
      { name: 'DJ Furax', start: '17:00', end: '18:00' },
      { name: 'DJ Ghost', start: '18:00', end: '19:00' },
      { name: 'Franky Kloeck', start: '22:00', end: '23:00' },
      { name: 'Funkhauser', start: '21:00', end: '22:00' },
      { name: 'Greg S.', start: '16:00', end: '17:00' },
      { name: 'Jan Vervloet', start: '20:00', end: '21:00' },
      { name: 'Jente B2B Neall', start: '14:00', end: '15:00' },
      { name: 'Just-K', start: '12:00', end: '13:00' },
      'MC Pyro',
      { name: 'Phi Phi', start: '13:00', end: '14:00' },
      { name: 'Push', start: '19:00', end: '20:00' },
      { name: 'X-Tof', start: '23:00', end: '00:00' },
    ],
    'Elixir': [
      { name: 'Afrolosjes Soundsystem', start: '23:00', end: '00:00' },
      { name: 'Ballantine & Dieux Père', start: '16:00', end: '17:00' },
      { name: 'Encore Soundsystem', start: '21:00', end: '22:00' },
      { name: 'Kurashi Soundsystem', start: '20:00', end: '21:00' },
      { name: 'Lordesius & Anders', start: '14:00', end: '15:00' },
      'MC Claudio',
      { name: 'Melv!ee', start: '18:00', end: '19:00' },
      { name: 'Pretty Girls Like Trap Music Soundsystem (Imani & Claire Lyons)', start: '15:00', end: '16:00' },
      { name: 'Rockefellababe', start: '22:00', end: '23:00' },
      { name: 'Sojuju & Julian Jermain', start: '13:00', end: '14:00' },
      { name: 'Stewww Soundsystem', start: '00:00', end: '01:00' },
      { name: 'Vunzige Deuntjes Soundsystem', start: '19:00', end: '20:00' },
      { name: 'Wef', start: '17:00', end: '18:00' },
    ],
    'Cage': [
      { name: 'A.N.I.', start: '17:00', end: '18:30' },
      { name: 'Byorn', start: '20:00', end: '21:30' },
      { name: 'Dexphase', start: '18:30', end: '20:00' },
      { name: 'Luna Fields', start: '12:00', end: '14:00' },
      { name: 'Maike Depas', start: '14:00', end: '15:30' },
      { name: 'Vieze Asbak', start: '21:30', end: '23:00' },
      { name: 'Not My Type', status: 'new', start: '15:30', end: '17:00' },
    ],
    'The Rave Cave': [
      { name: 'Aghatixx', start: '15:00', end: '16:00' },
      { name: 'Bobby & Djenko', start: '22:00', end: '23:30' },
      { name: 'Brits & Boen', start: '16:00', end: '17:30' },
      { name: 'Jonas Van Opstal', start: '23:30', end: '01:00' },
      { name: 'Los Bomberos', start: '14:00', end: '15:00' },
      { name: 'Monta', start: '17:30', end: '19:00' },
      { name: 'Soulcity', start: '20:30', end: '22:00' },
      { name: 'The Spook', start: '13:00', end: '14:00' },
      { name: 'Vitucci', start: '19:00', end: '20:30' },
    ],
    'Planaxis': [
      { name: 'Bassjackers', start: '21:00', end: '22:00' },
      { name: 'Surprise', start: '19:00', end: '20:00' },
      { name: 'Chocolate Puma', start: '13:00', end: '14:00' },
      { name: "D'Angello & Francis", start: '12:00', end: '13:00' },
      { name: 'Dvbbs', start: '22:00', end: '23:00' },
      { name: 'Ian Asher', start: '16:00', end: '17:00' },
      { name: 'Kaaze', start: '15:00', end: '16:00' },
      { name: 'Laidback Luke', start: '18:00', end: '19:00' },
      { name: 'Lucas & Steve', start: '20:00', end: '21:00' },
      { name: 'Marnik', start: '14:00', end: '15:00' },
      { name: 'Quintino', start: '17:00', end: '18:00' },
      { name: 'Steve Aoki', start: '23:00', end: '23:50' },
    ],
    'Melodia by Corona': [
      { name: 'Arado', start: '23:00', end: '00:00' },
      { name: 'Chinonegro', start: '18:00', end: '19:00' },
      { name: 'Emiliano Demarco', start: '15:00', end: '16:30' },
      { name: 'Hermanos Inglesos', start: '13:30', end: '15:00' },
      { name: 'Idemi', start: '19:00', end: '20:30' },
      { name: 'Lya', start: '12:00', end: '13:30' },
      { name: 'Sam Shure', start: '20:30', end: '22:00' },
      { name: 'Twenty Six', start: '22:00', end: '23:00' },
      { name: 'Unread', start: '16:30', end: '18:00' },
    ],
    'Celestia by KuCoin': [
      { name: 'Block & Crown B2B Lynne', start: '16:00', end: '17:00' },
      { name: 'Diego Miranda B2B Pette', start: '17:00', end: '18:00' },
      { name: 'Dimitri Vangelis & Wyman', start: '18:00', end: '19:00' },
      { name: 'DJ Nano', start: '20:00', end: '21:00' },
      { name: 'Encure B2B Honey Gee', start: '14:00', end: '15:00' },
      { name: 'Joyse B2B Ryan Spicer', start: '15:00', end: '16:00' },
      { name: 'Matisse & Sadko', start: '21:00', end: '22:00' },
      { name: 'Sebsky', start: '13:00', end: '14:00' },
      { name: 'Will Sparks', start: '22:00', end: '23:00' },
      { name: 'Yves V', start: '19:00', end: '20:00' },
      { name: 'Sef sansT', status: 'new', start: '12:00', end: '13:00' },
    ],
    'Atmosphere': [
      { name: 'Biia B2B Charlie Sparks', status: 'edited', start: '20:00', end: '21:30' },
      { name: 'Estella Boersma', start: '15:30', end: '17:00' },
      { name: 'Indira Paganotto', start: '21:30', end: '23:30' },
      { name: 'Interactive Noise', start: '12:00', end: '14:00' },
      { name: 'Marhu', start: '14:00', end: '15:30' },
      { name: 'Reinier Zonneveld (Live)', start: '23:30', end: '00:55' },
      { name: 'Ben Klock', status: 'new', start: '18:30', end: '20:00' },
      { name: 'Elli Acula', status: 'new', start: '17:00', end: '18:30' },
    ],
    'Core': [
      { name: 'Bedouin', start: '23:00', end: '00:50' },
      { name: 'Betical', start: '15:00', end: '16:30' },
      { name: 'Capoon', start: '12:00', end: '13:30' },
      { name: 'Curol', start: '13:30', end: '15:00' },
      { name: 'Dino Lenny', start: '16:30', end: '18:00' },
      { name: 'Samm B2B Ajna', start: '19:30', end: '21:30' },
      { name: 'Antdot', status: 'new', start: '18:00', end: '19:30' },
      { name: 'Carlita B2B Malive', status: 'new', start: '21:30', end: '23:00' },
    ],
    'Crystal Garden': [
      { name: 'Cici Daze', start: '12:00', end: '13:30' },
      { name: 'Dali', start: '13:30', end: '15:00' },
      { name: 'Dean Turnley', start: '17:00', end: '18:30' },
      { name: 'Morten B2B Malaa', start: '20:00', end: '21:30' },
      { name: 'Nosi', start: '15:00', end: '17:00' },
      { name: 'Steve Angello', start: '21:30', end: '00:30' },
      { name: 'Ben Hemsley', status: 'new', start: '18:30', end: '20:00' },
    ],
    'The Great Library': [
      { name: 'Agents of Time', start: '20:00', end: '21:30' },
      { name: 'Andromedik', start: '18:00', end: '19:00' },
      { name: 'Ciel.', start: '13:00', end: '14:00' },
      { name: 'Jazzy', start: '17:00', end: '18:00' },
      { name: 'Linska', start: '15:00', end: '16:00' },
      { name: 'Lost Frequencies', start: '21:30', end: '22:45' },
      { name: 'Marten Hørger', start: '19:00', end: '20:00' },
      { name: 'Marwan Dua', start: '14:00', end: '15:00' },
      { name: 'Oliver Heldens', start: '22:45', end: '00:00' },
      { name: 'Marvin & Cameron', status: 'new', start: '12:00', end: '13:00' },
    ],
    'Moose Bar': [
      { name: 'Funkhauser', start: '15:00', end: '19:00' },
      { name: 'Jelle DK', start: '20:00', end: '00:00' },
      { name: 'Jeroen Visser', start: '12:00', end: '15:00' },
      { name: 'Je Broer', status: 'new', start: '19:00', end: '20:00' },
    ],
    'House of Fortune by JBL': [
      { name: 'Fonsi Nieto', start: '16:00', end: '17:00' },
      { name: 'Lennert Wolfs', start: '14:00', end: '15:00' },
      { name: 'Lucas & Steve', start: '18:00', end: '19:00' },
      { name: 'Makasi', start: '13:00', end: '14:00' },
      { name: 'Mandy', start: '21:00', end: '22:00' },
      { name: 'Mark Roma', start: '15:00', end: '16:00' },
      { name: 'Yuuki Yoshiyama', start: '20:00', end: '21:00' },
      { name: 'Kris Kross Amsterdam', status: 'new', start: '19:00', end: '20:00' },
    ],
  },

  sun: {
    'Mainstage': [
      { name: 'Discovery', start: '12:00', end: '14:30' },
      { name: 'Karakals', start: '15:30', end: '16:30' },
      { name: 'Surprise', start: '19:40', end: '20:40' },
      { name: 'Alesso', start: '21:45', end: '22:45' },
      { name: 'B Jones', start: '18:40', end: '19:40' },
      { name: 'Calvin Harris', start: '22:50', end: '23:50' },
      { name: 'John Summit', start: '20:40', end: '21:40' },
      { name: 'Kevin de Vries', start: '17:35', end: '18:35' },
      { name: 'Malugi', start: '16:30', end: '17:30' },
      'MC Stretch',
      { name: 'Hannah Laing', status: 'new', start: '14:30', end: '15:30' },
    ],
    'Freedom by Bud': [
      { name: 'Alok: Rave The World', start: '21:00', end: '22:00' },
      { name: 'Arielle Free', start: '16:00', end: '17:30' },
      { name: 'Chase & Status (DJ Set)', start: '20:00', end: '21:00' },
      { name: 'DJ Licious', start: '13:30', end: '15:00' },
      { name: 'I Hate Models', start: '22:00', end: '23:30' },
      { name: 'Jack Shore', start: '17:30', end: '18:30' },
      { name: 'Neon', start: '12:00', end: '13:30' },
      { name: 'Pegassi', start: '18:30', end: '20:00' },
      { name: 'Aline Rocha', status: 'new', start: '15:00', end: '16:00' },
    ],
    'The Rose Garden': [
      { name: 'Adrenalize', start: '14:30', end: '15:30' },
      { name: 'Digital Madness', start: '12:00', end: '13:00' },
      { name: 'Isaac', start: '17:30', end: '18:30' },
      { name: 'Pat B', start: '19:30', end: '20:30' },
      { name: 'Rebelion', start: '18:30', end: '19:30' },
      { name: 'Rooler', start: '16:30', end: '17:30' },
      { name: 'Sub Zero Project', start: '20:30', end: '22:00' },
      { name: 'The Saints', start: '22:00', end: '23:00' },
      { name: 'The Z.', start: '13:00', end: '14:30' },
      { name: 'TNT', start: '15:30', end: '16:30' },
      'Villain',
      { name: 'MC Mota', status: 'new' },
    ],
    'Elixir': [
      { name: 'DJ Fasta', start: '16:00', end: '17:00' },
      { name: 'Favella Som Sistema', start: '15:00', end: '16:00' },
      { name: 'G-Lo', start: '13:00', end: '14:00' },
      { name: 'Heaven Sam', start: '19:00', end: '20:00' },
      { name: 'Jerønimo', start: '23:00', end: '00:00' },
      { name: 'Karyo', start: '20:00', end: '21:00' },
      { name: 'Noah', start: '17:00', end: '18:00' },
      { name: 'Sako Glitch', start: '14:00', end: '15:00' },
      { name: 'Sleazy Stereo', start: '22:00', end: '23:00' },
      { name: 'Team Damp', start: '18:00', end: '19:00' },
      { name: 'Tribal Kush', start: '21:00', end: '22:00' },
    ],
    'Cage': [
      { name: 'Adrián Mills F2F Sisu', start: '21:30', end: '23:00' },
      { name: 'David Löhlein F2F Yasmin Regisford', start: '17:00', end: '18:30' },
      { name: 'Emilija F2F Frederic.', status: 'edited', start: '18:30', end: '20:00' },
      { name: 'Fumi F2F Hujus', start: '15:30', end: '17:00' },
      { name: 'Hurts F2F Row 1', start: '14:00', end: '15:30' },
      { name: 'Klaps F2F Miamor', start: '12:00', end: '14:00' },
      { name: 'Serafina F2F Zwilling', start: '20:00', end: '21:30' },
    ],
    'The Rave Cave': [
      { name: 'Coco Bevan', start: '22:00', end: '23:00' },
      { name: 'Dries Smet', start: '16:30', end: '17:30' },
      { name: 'Foxed Up', start: '20:00', end: '21:00' },
      { name: 'Godtripper', start: '23:00', end: '23:50' },
      { name: 'Mell Tierra', start: '15:00', end: '16:30' },
      { name: 'Mitched', start: '21:00', end: '22:00' },
      { name: 'Nederhand', start: '19:00', end: '20:00' },
      { name: 'Noaffection B2B Om3n', start: '17:30', end: '19:00' },
      { name: 'Yerun', start: '13:00', end: '15:00' },
    ],
    'Planaxis': [
      { name: 'Arcando', start: '19:00', end: '20:00' },
      { name: 'Exception', start: '12:00', end: '13:15' },
      { name: '[Ivy]', start: '16:00', end: '17:00' },
      { name: 'Level Up', start: '18:00', end: '19:00' },
      { name: 'Liquid Stranger', start: '21:00', end: '22:00' },
      { name: "Malaa's Alter Ego", start: '20:00', end: '21:00' },
      { name: 'Nostalgix', start: '17:00', end: '18:00' },
      { name: 'Punctual', start: '13:15', end: '15:00' },
      { name: 'Sabai', start: '15:00', end: '16:00' },
      { name: 'Seven Lions', start: '22:00', end: '23:00' },
      { name: 'Subtronics', start: '23:00', end: '00:00' },
    ],
    'Melodia by Corona': [
      { name: 'Christian82', start: '14:30', end: '15:30' },
      { name: 'Cristina Tosio', start: '16:30', end: '18:00' },
      { name: 'Dave Hang', start: '21:00', end: '22:00' },
      { name: 'Delafino', start: '20:00', end: '21:00' },
      { name: 'DJ Gee', start: '13:30', end: '14:30' },
      { name: 'Felix Da Funk', start: '22:00', end: '23:00' },
      { name: 'Le Windey', start: '12:00', end: '13:30' },
      { name: 'Lunnas', start: '18:00', end: '19:00' },
      { name: 'Marta Loe B2B Rebeca Ark', start: '19:00', end: '20:00' },
      { name: 'Tania Moon', start: '15:30', end: '16:30' },
    ],
    'Celestia by KuCoin': [
      { name: 'Cyria (Hybrid)', start: '13:30', end: '15:00' },
      { name: 'Fake Mood', start: '15:00', end: '16:30' },
      { name: 'Helsloot', start: '18:00', end: '19:30' },
      { name: 'MxGPU (Hybrid)', start: '19:30', end: '21:00' },
      { name: 'Nico Morano B2B Xinobi', start: '21:00', end: '22:30' },
      { name: 'Õona Dahl', start: '16:30', end: '18:00' },
      { name: 'Sentin', start: '12:00', end: '13:30' },
    ],
    'Atmosphere': [
      { name: 'Amelie Lens', start: '22:30', end: '23:55' },
      { name: 'Anetha', start: '20:30', end: '22:30' },
      { name: 'Blondex', start: '16:00', end: '17:30' },
      { name: 'Flour', start: '12:00', end: '14:00' },
      { name: 'Øtta', start: '19:00', end: '20:30' },
      { name: 'Shdw B2B Überkikz', start: '17:30', end: '19:00' },
      { name: 'Ve/Ra', start: '14:00', end: '16:00' },
    ],
    'Core': [
      { name: 'Avalon Emerson B2B Ben UFO', start: '20:00', end: '22:00' },
      { name: 'Fafi Abdel Nour', start: '16:00', end: '18:00' },
      { name: 'Ineffekt', start: '14:00', end: '16:00' },
      { name: 'Job Jobse', start: '22:00', end: '23:50' },
      { name: 'Massignan.y', start: '12:00', end: '14:00' },
      { name: 'Sedef Adasï', start: '18:00', end: '20:00' },
    ],
    'Crystal Garden': [
      { name: 'DJ Gigola', start: '19:30', end: '21:00' },
      { name: 'DJ Tennis B2B Vintage Culture', start: '22:00', end: '23:30' },
      { name: 'Elfigo', start: '16:30', end: '18:00' },
      { name: 'Hitty', start: '15:00', end: '16:30' },
      { name: 'Oscar And The Wolf', start: '21:00', end: '22:00' },
      { name: 'Wade', start: '18:00', end: '19:30' },
      { name: 'Poleen', start: '12:00', end: '13:30' },
      { name: 'Re-Type', status: 'new', start: '13:30', end: '15:00' },
    ],
    'The Great Library': [
      { name: 'Afrojack', start: '22:00', end: '23:00' },
      { name: 'Blasterjaxx', start: '19:00', end: '20:00' },
      { name: 'Diètro', start: '12:00', end: '13:00' },
      { name: 'Dimitri Vegas B2B Timmy Trumpet', start: '21:00', end: '22:00' },
      { name: 'Gabry Ponte', start: '17:00', end: '18:00' },
      { name: 'Gryffin', start: '20:00', end: '21:00' },
      { name: 'Hypaton', start: '16:00', end: '17:00' },
      { name: 'James Carter', start: '14:00', end: '15:00' },
      { name: 'Mattn', start: '18:00', end: '19:00' },
      { name: 'Viktor', start: '15:00', end: '16:00' },
      { name: 'Vini Vici', start: '23:00', end: '23:55' },
      { name: 'Yazzmin', start: '13:00', end: '14:00' },
    ],
    'Moose Bar': [
      { name: 'Jerrooo', status: 'edited', start: '20:00', end: '00:00' },
      { name: 'Les Mecs Eclectics', start: '16:00', end: '19:00' },
      { name: 'Tom Cosyns', start: '12:00', end: '16:00' },
      { name: 'Effe Serieus', status: 'new', start: '19:00', end: '20:00' },
    ],
    'House of Fortune by JBL': [
      { name: 'Adam K', start: '15:00', end: '16:00' },
      { name: 'DJ Gab', start: '13:00', end: '14:00' },
      { name: 'Krevix', start: '14:00', end: '15:00' },
      { name: 'Sofía Cristo', start: '16:00', end: '17:00' },
      { name: 'Noro$t', status: 'new', start: '18:00', end: '19:00' },
      { name: 'Da Tweekaz', status: 'new', start: '19:00', end: '20:00' },
      { name: 'Sam Hofman', status: 'new', start: '17:00', end: '18:00' },
      { name: 'Blasterjaxx', status: 'new', start: '21:00', end: '22:00' },
    ],
  },
};

// ── Derive flat sets[] for the picks / clash engine ──────────
//
// DURABILITY RULE — picks must survive lineup edits:
//   The set id is content-based: `${day}-${stageSlug}-${nameSlug}`.
//   It is tied to the ARTIST, not their position. So you can freely
//   ADD, REMOVE, or REORDER artists and every existing pick stays
//   attached to the right person.
//   RENAMING an artist changes `slug(name)` and would orphan their pick.
//   To rename safely, set `idSlug` on the entry to the artist's OLD slug
//   so the id (and therefore the pick) stays stable while the displayed
//   name changes. (Used for 'The Chainsmokers' and 'Æon:Mode'.)
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const sets = Object.entries(LINEUP).flatMap(([day, stages]) =>
  Object.entries(stages).flatMap(([stage, entries]) => {
    const stageSlug = slug(stage);
    const seen = {};
    return entries.map((entry) => {
      const e = typeof entry === 'string' ? { name: entry } : entry;
      const nameSlug = e.idSlug ?? slug(e.name);
      const base = `${day}-${stageSlug}-${nameSlug}`;
      // Disambiguate the rare same-name-in-same-stage case so ids stay unique
      // and stable (the first keeps the clean id; dupes get a numeric suffix).
      seen[base] = (seen[base] || 0) + 1;
      const id = seen[base] > 1 ? `${base}-${seen[base]}` : base;
      return {
        id,
        name: e.name,
        stage,
        day,
        status: e.status ?? null,   // 'new' | 'edited' | 'deleted' | null
        start: e.start ?? null,
        end: e.end ?? null,
      };
    });
  })
);
