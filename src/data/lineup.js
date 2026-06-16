// ─────────────────────────────────────────────────────────────
// TOMORROWLAND WEEKEND 1 LINEUP — Jul 17–19 2026
//
// Real per-day split (Day 1 = Fri 17, Day 2 = Sat 18, Day 3 = Sun 19).
// Day + stage assignments are the official ones (cross-checked against
// the per-day data on festivalmates.com, which matches the known
// headliner days — Fisher Sat, Garrix Fri, Alesso/Calvin Sun). Set
// TIMES are not announced yet ("Set time TBA"). When the timetable drops,
// switch an entry to { name, start, end } and the clash + time logic lights up.
//
// A handful of the newest poster additions have no published day yet;
// they are placed provisionally to keep each day's filter balanced and
// tagged `status:'new'`.
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

// ── Lineup by day → stage → artists ──────────────────────────
export const LINEUP = {
  fri: {
    'Mainstage': [{ name: 'The Chainsmokers', status: 'edited', idSlug: 'chainsmokers' }, 'Disco Lines', 'Henri PFR', 'Marlon Hoffstadt', 'Martin Garrix', 'MC Stretch', 'Nervo', 'Novah', 'Sebastian Ingrosso', { name: 'Vintage Culture', status: 'new' }],
    'Freedom by Bud': [{ name: '4444 of a Kind', status: 'new' }, 'Holy Priest', 'Jesabel', 'Max Styler', 'Mind Against', 'Miss Monique', 'Rose Ringed', 'Semsei'],
    'The Rose Garden': ['A Little Sound', { name: 'Æon:Mode', status: 'edited', idSlug: 'dn-mode' }, 'Alison Wonderland', 'Anton Invicta', 'Blooom B2B Sudley', 'Camo & Krooked', 'Kanine', 'Mae.Lien', 'Murdock', 'Primate', 'Stoog3s', 'Synoxis'],
    'Elixir': ['Audiowave', 'Flavour Drop', 'High Grade Sound', 'MC Rim', 'Milinguap', 'Monsieur', 'Nona Van Braeckel', "Rick & James 80's Party", 'Soul Shakers', 'Tola Og', 'Unregular'],
    'Cage': ['Dither', 'Elmefti', 'GPF B2B Dr Donk', { name: 'Lolalita & Brennt (Live)', status: 'edited' }, 'Lunakorpz', 'Mind Compressor', 'Rayzen', 'Sacha Malice', 'Vernex B2B Nrki', 'Von Bikräv', { name: 'Sandy Warez B2B Revenja', status: 'new' }],
    'The Rave Cave': [{ name: 'Ben Malone', status: 'deleted' }, 'Cvnts', 'Junkie Kid', 'Nastya Dikikh', 'Paloma', 'Thomas Moulene', 'Zuke', { name: 'Justin Wilkes', status: 'new' }, { name: 'Panda Sound System', status: 'new' }],
    'Planaxis': ['Cyborg-18', 'Fabio Fusco', 'Firaga', 'Hi Profile', 'John 00 Fleming', 'Mad Maxx', { name: 'Neelix', status: 'edited' }, 'Omiki', 'Somnia', 'Trip-Tamine', 'Yannick Thiry'],
    'Melodia by Corona': ['Awen', 'Da Capo B2B Caiiro B2B Enoo Napa', 'Danni Gato', 'Isa Roos', 'Lerato Tsotetsi', 'Rosey Gold', 'Thakzin', 'Vanco'],
    'Celestia by KuCoin': ['Bennett', 'Diffrent', 'Juno', 'MPH', 'MRMK', 'Olive Anguz', 'Roox', 'Rozie'],
    'Atmosphere': ['Bisoux', 'Kuko', 'Mandy B2B Negitiv', 'Nico Moreno', 'Peterblue', 'Row1', { name: 'Sara Landry', status: 'new' }, { name: 'Simone B2B Southstar', status: 'new' }],
    'Core': ['Bibi Seck', 'Eileen', { name: 'John Noseda B2B Kenny Montana', status: 'edited' }, 'Modeselektor (DJ Set)', 'Sally C', { name: 'Sasha B2B Young Marco', status: 'new' }],
    'Crystal Garden': [{ name: 'Camila Jun', status: 'edited' }, 'Eridu', 'Kettama B2B Michael Bibi', 'Marsolo', 'Poleen', { name: 'Blond:ish', status: 'new' }, { name: 'Franky Rizardo', status: 'new' }],
    'The Great Library': ['Artbat', 'Da Tweekaz', 'DJ Sally', 'Hardwell B2B Sub Zero Project', 'Magik', 'Manuals', 'Mike Williams', 'Nicky Romero', 'Ofenbach', 'R3hab', 'Sam Feldt', 'Tomas Grey', 'Whisnu Santika'],
    'Moose Bar': ['Bosart', 'Funktastix', 'Rino', { name: 'Effe Serieus', status: 'new' }],
    'House of Fortune by JBL': ['Conrad Taylor', 'Fran Ares', 'Gravagerz', 'Lucca Van Damme', { name: 'Mike Williams Throwback Set', status: 'edited' }, 'Nicky Romero', 'Stadiumx', { name: 'Da Tweekaz', status: 'new' }],
  },

  sat: {
    'Mainstage': ['Boris Brejcha', 'David Guetta', 'Dimitri Vegas & Like Mike', 'Fisher', 'Halō', 'John Newman', 'Maddix', 'MC Stretch', 'Merow', 'Omdat Het Kan & Average Rob', 'Stephani B'],
    'Freedom by Bud': ['Armin van Buuren', 'Dave Lambert', 'Luna & Lenthe', 'Meduza³', 'Netsky', 'Plastik Funk B2B Olympe', 'Space 92', 'Symphony Of Unity', { name: 'Aline Rocha', status: 'new' }],
    'The Rose Garden': ['Blvckprint', 'Bonzai All Stars', 'DJ Furax', 'DJ Ghost', 'Franky Kloeck', 'Funkhauser', 'Greg S.', 'Jan Vervloet', 'Jente B2B Neall', 'Just-K', 'MC Pyro', 'Phi Phi', 'Push', 'X-Tof'],
    'Elixir': ['Afrolosjes Soundsystem', 'Ballantine & Dieux Père', 'Encore Soundsystem', 'Kurashi Soundsystem', 'Lordesius & Anders', 'MC Claudio', 'Melv!ee', 'Pretty Girls Like Trap Music Soundsystem (Imani & Claire Lyons)', 'Rockefellababe', 'Sojuju & Julian Jermain', 'Steww Soundsystem', 'Vunzige Deuntjes Soundsystem', 'Wef'],
    'Cage': ['A.N.I.', 'Byorn', 'Dexphase', 'Luna Fields', 'Maike Depas', 'Vieze Asbak', { name: 'Notmytype', status: 'new' }],
    'The Rave Cave': ['Aghatixx', 'Bobby & Djenko', 'Brits & Boen', 'Jonas Van Opstal', 'Los Bomberos', 'Monta', 'Soulcity', 'The Spook', 'Vitucci'],
    'Planaxis': ['Bassjackers', 'Chocolate Puma', "D'Angello & Francis", 'Dvbbs', 'Ian Asher', 'Kaaze', 'Laidback Luke', 'Lucas & Steve', 'Marnik', 'Quintino', 'Steve Aoki'],
    'Melodia by Corona': ['Arado', 'Chinonegro', 'Emiliano Demarco', 'Hermanos Inglesos', 'Idemi', 'Lya', 'Sam Shure', 'Twenty Six', 'Unread'],
    'Celestia by KuCoin': ['Block & Crown B2B Lynne', 'Diego Miranda B2B Pette', 'Dimitri Vangelis & Wyman', 'DJ Nano', 'Encure B2B Honey Gee', 'Joyse B2B Ryan Spicer', 'Matisse & Sadko', 'Sebsky', 'Will Sparks', 'Yves V'],
    'Atmosphere': [{ name: 'Biia B2B Charlie Sparks', status: 'edited' }, 'Estella Boersma', 'Indira Paganotto', 'Interactive Noise', 'Marhu', 'Reinier Zonneveld (Live)', { name: 'Ben Klock', status: 'new' }, { name: 'Elli Acula', status: 'new' }],
    'Core': ['Bedouin', 'Betical', 'Capoon', 'Curol', 'Dino Lenny', 'Samm B2B Ajna', { name: 'Antdot', status: 'new' }],
    'Crystal Garden': ['Cici Daze', 'Dali', 'Dean Turnley', 'Morten B2B Malaa', 'Nosi', 'Steve Angello', { name: 'Ben Hemsley', status: 'new' }],
    'The Great Library': ['Agents of Time', 'Andromedik', 'Ciel.', 'Jazzy', 'Linska', 'Lost Frequencies', 'Marten Hørger', 'Marwan Dua', 'Oliver Heldens', { name: 'Marvin & Cameron', status: 'new' }],
    'Moose Bar': ['Funkhauser', 'Jelle DK', 'Jeroen Visser', { name: 'Jebroer', status: 'new' }],
    'House of Fortune by JBL': ['Fonsi Nieto', 'Lennert Wolfs', 'Lucas & Steve', 'Makasi', 'Mandy', 'Mark Roma', 'Yuuki Yoshiyama', { name: 'Blasterjaxx', status: 'new' }, { name: 'Sam Hofman', status: 'new' }],
  },

  sun: {
    'Mainstage': ['Alesso', 'B Jones', 'Calvin Harris', 'John Summit', 'Kevin de Vries', 'Malugi', 'MC Stretch', { name: 'Bassjackers', status: 'new' }, { name: 'Hannah Laing', status: 'new' }],
    'Freedom by Bud': ['Alok: Rave The World', 'Arielle Free', 'Chase & Status (DJ Set)', 'DJ Licious', 'I Hate Models', 'Jack Shore', 'Neon', 'Pegassi'],
    'The Rose Garden': ['Adrenalize', 'Digital Madness', 'Isaac', 'Pat B', 'Rebelion', 'Rooler', 'Sub Zero Project', 'The Saints', 'The Z.', 'TNT', 'Villain', { name: 'MC Mota', status: 'new' }],
    'Elixir': ['DJ Fasta', 'Favella Som Sistema', 'G-Lo', 'Heaven Sam', 'Jerønimo', 'Karyo', 'Noah', 'Sako Glitch', 'Sleazy Stereo', 'Team Damp', 'Tribal Kush'],
    'Cage': ['Adrián Mills F2F Sisu', 'David Löhlein F2F Yasmin Regisford', { name: 'Emilija F2F Frederic.', status: 'edited' }, 'Fumi F2F Hujus', 'Hurts F2F Row 1', 'Klaps F2F Miamor', 'Serafina F2F Zwilling'],
    'The Rave Cave': ['Coco Bevan', 'Dries Smet', 'Foxed Up', 'Godtripper', 'Mell Tierra', 'Mitched', 'Nederhand', 'Noaffection B2B Om3n', 'Yerun'],
    'Planaxis': ['Arcando', 'Exception', '[Ivy]', 'Level Up', 'Liquid Stranger', "Malaa's Alter Ego", 'Nostalgix', 'Punctual', 'Sabai', 'Seven Lions', 'Subtronics'],
    'Melodia by Corona': ['Christian82', 'Cristina Tosio', 'Dave Hang', 'Delafino', 'DJ Gee', 'Felix Da Funk', 'Le Windey', 'Lunnas', 'Marta Loe B2B Rebeca Ark', 'Tania Moon'],
    'Celestia by KuCoin': ['Cyria (Hybrid)', 'Fake Mood', 'Helsloot', 'MxGPU (Hybrid)', 'Nico Morano B2B Xinobi', 'Õona Dahl', 'Sentin', { name: 'Sef Sanst', status: 'new' }],
    'Atmosphere': ['Amelie Lens', 'Anetha', 'Blondex', 'Flour', 'Øtta', 'Shdw B2B Überkikz', 'Ve/Ra'],
    'Core': ['Avalon Emerson B2B Ben UFO', 'Fafi Abdel Nour', 'Ineffekt', 'Job Jobse', 'Massignan.y', 'Sedef Adasï', { name: 'Carlita B2B Malive', status: 'new' }],
    'Crystal Garden': ['DJ Gigola', 'DJ Tennis B2B Vintage Culture', 'Elfigo', 'Hitty', 'Oscar And The Wolf', 'Wade', { name: 'Re-Type', status: 'new' }],
    'The Great Library': ['Afrojack', 'Blasterjaxx', 'Diètro', 'Dimitri Vegas B2B Timmy Trumpet', 'Gabry Ponte', 'Gryffin', 'Hypaton', 'James Carter', 'Mattn', 'Viktor', 'Vini Vici', 'Yazzmin'],
    'Moose Bar': [{ name: 'Jerrooo', status: 'edited' }, 'Les Mecs Eclectics', 'Tom Cosyns', { name: 'Wilbert Pigmans', status: 'new' }],
    'House of Fortune by JBL': ['Adam K', 'DJ Gab', 'Krevix', 'Sofía Cristo', { name: 'Amber Broos B2B DJ Daddy Broos', status: 'new' }, { name: 'Kris Kross Amsterdam', status: 'new' }, { name: 'Noro$t', status: 'new' }],
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
