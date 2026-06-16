// ─────────────────────────────────────────────────────────────
// TOMORROWLAND WEEKEND 1 LINEUP — Jul 17–19 2026
//
// The official stage posters list each stage's artists for the WHOLE
// weekend ("July 17–19") in one alphabetical block — they do NOT say
// which of Fri / Sat / Sun a DJ plays. So each stage has ONE roster,
// shown identically on all three day tabs. When the official timetable
// (set times) drops, switch entries to objects with start/end and the
// per-day / clash logic lights up.
//
// ENTRY SHAPE — a roster entry is either:
//   • a plain string                      → unchanged, time TBA
//   • { name, status, idSlug, start, end }
//       status : 'new' | 'edited' | 'deleted'  (omit = unchanged)
//                 new     → added in the latest official sync
//                 edited  → renamed/corrected to the official spelling
//                 deleted → dropped from the Weekend-1 lineup; kept on
//                           screen, struck through, not pickable
//       idSlug : pins the set-id slug so picks survive a rename
//                (see the durability rule by `sets` below)
//
// SYNCED to the official Jul 17–19 posters. NEW / EDITED / DELETED tags
// reflect the diff vs the previous app roster.
// ─────────────────────────────────────────────────────────────

export const LINEUP_STATUS = 'official-partial'; // 'placeholder' | 'official-partial' | 'official'

export const PEOPLE = ['Grant', 'Desmond', 'Lawrence'];

// Stages in poster order, each colour-matched to the official artwork.
export const STAGES = {
  'Mainstage':              { color: '#d9a93e' },
  'Freedom by Bud':         { color: '#3fae8f' },
  'The Rose Garden':        { color: '#cf6699' },
  'Elixir':                 { color: '#6fae52' },
  'Cage':                   { color: '#d2933c' },
  'The Rave Cave':          { color: '#8a6fbf' },
  'Planaxis':               { color: '#3fa9a0' },
  'Melodia by Corona':      { color: '#d05a52' },
  'Celestia by KuCoin':     { color: '#5a86c4' },
  'Atmosphere':             { color: '#7fae3f' },
  'Core':                   { color: '#cf69a0' },
  'Crystal Garden':         { color: '#7d8fcf' },
  'The Great Library':      { color: '#c2a23f' },
  'Moose Bar':              { color: '#5aae6a' },
  'House of Fortune by JBL':{ color: '#c2c2cc' },
};

// ── One official Weekend-1 roster per stage (alphabetical, as on the
//    posters). Shown on all three day tabs until set times are announced.
const WK1 = {
  'Mainstage': [
    'Alesso', 'B Jones', { name: 'Bassjackers', status: 'new' }, 'Boris Brejcha',
    'Calvin Harris', 'David Guetta', 'Dimitri Vegas & Like Mike', 'Disco Lines',
    'Fisher', 'Halō', { name: 'Hannah Laing', status: 'new' }, 'Henri PFR',
    'John Newman', 'John Summit', 'Kevin de Vries', 'Maddix', 'Malugi',
    'Marlon Hoffstadt', 'Martin Garrix', 'MC Stretch', 'Merow', 'Nervo', 'Novah',
    'Omdat Het Kan & Average Rob', 'Sebastian Ingrosso', 'Stephani B',
    { name: 'The Chainsmokers', status: 'edited', idSlug: 'chainsmokers' },
    { name: 'Vintage Culture', status: 'new' },
  ],

  'Freedom by Bud': [
    { name: '4444 of a Kind', status: 'new' }, { name: 'Aline Rocha', status: 'new' },
    'Alok: Rave The World', 'Arielle Free', 'Armin van Buuren', 'Chase & Status (DJ Set)',
    'Dave Lambert', 'DJ Licious', 'Holy Priest', 'I Hate Models', 'Jack Shore',
    'Jesabel', 'Luna & Lenthe', 'Max Styler', 'Meduza³', 'Mind Against', 'Miss Monique',
    'Neon', 'Netsky', 'Pegassi', 'Plastik Funk B2B Olympe', 'Rose Ringed', 'Semsei',
    'Space 92', 'Symphony Of Unity',
  ],

  'The Rose Garden': [
    'A Little Sound', 'Adrenalize',
    { name: 'Æon:Mode', status: 'edited', idSlug: 'dn-mode' },
    'Alison Wonderland', 'Anton Invicta', 'Blooom B2B Sudley', 'Blvckprint',
    'Bonzai All Stars', 'Camo & Krooked', 'Digital Madness', 'DJ Furax', 'DJ Ghost',
    'Franky Kloeck', 'Funkhauser', 'Greg S.', 'Isaac', 'Jan Vervloet', 'Jente B2B Neall',
    'Just-K', 'Kanine', 'Mae.Lien', { name: 'MC Mota', status: 'new' }, 'MC Pyro',
    'Murdock', 'Pat B', 'Phi Phi', 'Primate', 'Push', 'Rebelion', 'Rooler', 'Stoog3s',
    'Sub Zero Project', 'Synoxis', 'The Saints', 'The Z.', 'TNT', 'Villain', 'X-Tof',
  ],

  'Elixir': [
    'Afrolosjes Soundsystem', 'Audiowave', 'Ballantine & Dieux Père', 'DJ Fasta',
    'Encore Soundsystem', 'Favella Som Sistema', 'Flavour Drop', 'G-Lo', 'Heaven Sam',
    'High Grade Sound', 'Jerønimo', 'Karyo', 'Kurashi Soundsystem', 'Lordesius & Anders',
    'MC Claudio', 'MC Rim', 'Melv!ee', 'Milinguap', 'Monsieur', 'Noah',
    'Nona Van Braeckel', 'Pretty Girls Like Trap Music Soundsystem (Imani & Claire Lyons)',
    "Rick & James 80's Party", 'Rockefellababe', 'Sako Glitch', 'Sleazy Stereo',
    'Sojuju & Julian Jermain', 'Soul Shakers', 'Steww Soundsystem', 'Team Damp',
    'Tola Og', 'Tribal Kush', 'Unregular', 'Vunzige Deuntjes Soundsystem', 'Wef',
  ],

  'Cage': [
    'A.N.I.', 'Adrián Mills F2F Sisu', 'Byorn', 'David Löhlein F2F Yasmin Regisford',
    'Dexphase', 'Dither', 'Elmefti', { name: 'Emilija F2F Frederic.', status: 'edited' },
    'Fumi F2F Hujus', 'GPF B2B Dr Donk', 'Hurts F2F Row 1', 'Klaps F2F Miamor',
    { name: 'Lolalita & Brennt (Live)', status: 'edited' }, 'Luna Fields', 'Lunakorpz',
    'Maike Depas', 'Mind Compressor', { name: 'Notmytype', status: 'new' }, 'Rayzen',
    'Sacha Malice', { name: 'Sandy Warez B2B Revenja', status: 'new' },
    'Serafina F2F Zwilling', 'Vernex B2B Nrki', 'Vieze Asbak', 'Von Bikräv',
  ],

  'The Rave Cave': [
    'Aghatixx', 'Bobby & Djenko', 'Brits & Boen', 'Coco Bevan', 'Cvnts', 'Dries Smet',
    'Foxed Up', 'Godtripper', 'Jonas Van Opstal', 'Junkie Kid',
    { name: 'Justin Wilkes', status: 'new' }, 'Los Bomberos', 'Mell Tierra', 'Mitched',
    'Monta', 'Nastya Dikikh', 'Nederhand', 'Noaffection B2B Om3n', 'Paloma',
    { name: 'Panda Sound System', status: 'new' }, 'Soulcity', 'The Spook',
    'Thomas Moulene', 'Vitucci', 'Yerun', 'Zuke',
    { name: 'Ben Malone', status: 'deleted' },
  ],

  'Planaxis': [
    '[Ivy]', 'Arcando', 'Bassjackers', 'Chocolate Puma', 'Cyborg-18',
    "D'Angello & Francis", 'Dvbbs', 'Exception', 'Fabio Fusco', 'Firaga', 'Hi Profile',
    'Ian Asher', 'John 00 Fleming', 'Kaaze', 'Laidback Luke', 'Level Up',
    'Liquid Stranger', 'Lucas & Steve', 'Mad Maxx', "Malaa's Alter Ego", 'Marnik',
    { name: 'Neelix', status: 'edited' }, 'Nostalgix', 'Omiki', 'Punctual', 'Quintino',
    'Sabai', 'Seven Lions', 'Somnia', 'Steve Aoki', 'Subtronics', 'Trip-Tamine',
    'Yannick Thiry',
  ],

  'Melodia by Corona': [
    'Arado', 'Awen', 'Chinonegro', 'Christian82', 'Cristina Tosio',
    'Da Capo B2B Caiiro B2B Enoo Napa', 'Danni Gato', 'Dave Hang', 'Delafino', 'DJ Gee',
    'Emiliano Demarco', 'Felix Da Funk', 'Hermanos Inglesos', 'Idemi', 'Isa Roos',
    'Le Windey', 'Lerato Tsotetsi', 'Lunnas', 'Lya', 'Marta Loe B2B Rebeca Ark',
    'Rosey Gold', 'Sam Shure', 'Tania Moon', 'Thakzin', 'Twenty Six', 'Unread', 'Vanco',
  ],

  'Celestia by KuCoin': [
    'Bennett', 'Block & Crown B2B Lynne', 'Cyria (Hybrid)', 'Diego Miranda B2B Pette',
    'Diffrent', 'Dimitri Vangelis & Wyman', 'DJ Nano', 'Encure B2B Honey Gee',
    'Fake Mood', 'Helsloot', 'Joyse B2B Ryan Spicer', 'Juno', 'Matisse & Sadko', 'MPH',
    'MRMK', 'MxGPU (Hybrid)', 'Nico Morano B2B Xinobi', 'Olive Anguz', 'Õona Dahl',
    'Roox', 'Rozie', 'Sebsky', { name: 'Sef Sanst', status: 'new' }, 'Sentin',
    'Will Sparks', 'Yves V',
  ],

  'Atmosphere': [
    'Amelie Lens', 'Anetha', { name: 'Ben Klock', status: 'new' },
    { name: 'Biia B2B Charlie Sparks', status: 'edited' }, 'Bisoux', 'Blondex',
    { name: 'Elli Acula', status: 'new' }, 'Estella Boersma', 'Flour',
    'Indira Paganotto', 'Interactive Noise', 'Kuko', 'Mandy B2B Negitiv', 'Marhu',
    'Nico Moreno', 'Øtta', 'Peterblue', 'Reinier Zonneveld (Live)', 'Row1',
    { name: 'Sara Landry', status: 'new' }, 'Shdw B2B Überkikz',
    { name: 'Simone B2B Southstar', status: 'new' }, 'Ve/Ra',
  ],

  'Core': [
    { name: 'Antdot', status: 'new' }, 'Avalon Emerson B2B Ben UFO', 'Bedouin',
    'Betical', 'Bibi Seck', 'Capoon', { name: 'Carlita B2B Malive', status: 'new' },
    'Curol', 'Dino Lenny', 'Eileen', 'Fafi Abdel Nour', 'Ineffekt', 'Job Jobse',
    { name: 'John Noseda B2B Kenny Montana', status: 'edited' }, 'Massignan.y',
    'Modeselektor (DJ Set)', 'Sally C', 'Samm B2B Ajna',
    { name: 'Sasha B2B Young Marco', status: 'new' }, 'Sedef Adasï',
  ],

  'Crystal Garden': [
    { name: 'Ben Hemsley', status: 'new' }, { name: 'Blond:ish', status: 'new' },
    { name: 'Camila Jun', status: 'edited' }, 'Cici Daze', 'Dali', 'Dean Turnley',
    'DJ Gigola', 'DJ Tennis B2B Vintage Culture', 'Elfigo', 'Eridu',
    { name: 'Franky Rizardo', status: 'new' }, 'Hitty', 'Kettama B2B Michael Bibi',
    'Marsolo', 'Morten B2B Malaa', 'Nosi', 'Oscar And The Wolf', 'Poleen',
    { name: 'Re-Type', status: 'new' }, 'Steve Angello', 'Wade',
  ],

  'The Great Library': [
    'Afrojack', 'Agents of Time', 'Andromedik', 'Artbat', 'Blasterjaxx', 'Ciel.',
    'Da Tweekaz', 'Diètro', 'Dimitri Vegas B2B Timmy Trumpet', 'DJ Sally', 'Gabry Ponte',
    'Gryffin', 'Hardwell B2B Sub Zero Project', 'Hypaton', 'James Carter', 'Jazzy',
    'Linska', 'Lost Frequencies', 'Magik', 'Manuals', 'Marten Hørger',
    { name: 'Marvin & Cameron', status: 'new' }, 'Marwan Dua', 'Mattn', 'Mike Williams',
    'Nicky Romero', 'Ofenbach', 'Oliver Heldens', 'R3hab', 'Sam Feldt', 'Tomas Grey',
    'Viktor', 'Vini Vici', 'Whisnu Santika', 'Yazzmin',
  ],

  'Moose Bar': [
    'Bosart', { name: 'Effe Serieus', status: 'new' }, 'Funkhauser', 'Funktastix',
    { name: 'Jebroer', status: 'new' }, 'Jelle DK', 'Jeroen Visser',
    { name: 'Jerrooo', status: 'edited' }, 'Les Mecs Eclectics', 'Rino', 'Tom Cosyns',
    { name: 'Wilbert Pigmans', status: 'new' },
  ],

  'House of Fortune by JBL': [
    'Adam K', { name: 'Amber Broos B2B DJ Daddy Broos', status: 'new' },
    { name: 'Blasterjaxx', status: 'new' }, 'Conrad Taylor',
    { name: 'Da Tweekaz', status: 'new' }, 'DJ Gab', 'Fonsi Nieto', 'Fran Ares',
    'Gravagerz', 'Krevix', { name: 'Kris Kross Amsterdam', status: 'new' },
    'Lennert Wolfs', 'Lucas & Steve', 'Lucca Van Damme', 'Makasi', 'Mandy', 'Mark Roma',
    { name: 'Mike Williams Throwback Set', status: 'edited' }, 'Nicky Romero',
    { name: 'Noro$t', status: 'new' }, { name: 'Sam Hofman', status: 'new' },
    'Sofía Cristo', 'Stadiumx', 'Yuuki Yoshiyama',
  ],
};

// ── Lineup by day → stage → artists ──────────────────────────
// All three days share the same roster object (the posters are
// weekend-level, not per-day). Picks are still stored per day, so an
// existing Fri pick stays attached to Friday.
export const LINEUP = { fri: WK1, sat: WK1, sun: WK1 };

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
