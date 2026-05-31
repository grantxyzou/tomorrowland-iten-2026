// ─────────────────────────────────────────────────────────────
// TOMORROWLAND WEEKEND 1 LINEUP — Jul 17–19 2026
//
// HOW TO EDIT:
//   • To add an artist: add a string to the right day → stage array below.
//   • Stage names here MUST match the keys in STAGES.
//   • Set times are not announced yet ("Set time TBA"). When the
//     official timetable drops, switch an entry to an object:
//        { name: 'Martin Garrix', start: '21:00', end: '23:00' }
//     and the clash-detection + time sorting light up automatically.
//
// NOTE: Artist names below were transcribed from the official poster
//       images — verify against tomorrowlandlineup.com before trusting.
// ─────────────────────────────────────────────────────────────

export const LINEUP_STATUS = 'official-partial'; // 'placeholder' | 'official-partial' | 'official'

export const PEOPLE = ['Grant', 'Des', 'Lawrence'];

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
// An entry is either a plain name (time TBA) or { name, start, end }.
export const LINEUP = {
  fri: {
    'Mainstage': ['Chainsmokers', 'Disco Lines', 'Henri PFR', 'Marlon Hoffstadt', 'Martin Garrix', 'MC Stretch', 'Nervo', 'Novah', 'Sebastian Ingrosso'],
    'Freedom by Bud': ['Holy Priest', 'Jesabel', 'Max Styler', 'Mind Against', 'Miss Monique', 'Rose Ringed', 'Semsei'],
    'The Rose Garden': ['A Little Sound', 'Ædn:Mode', 'Alison Wonderland', 'Anton Invicta', 'Blooom B2B Sudley', 'Camo & Krooked', 'Kanine', 'Mae.Lien', 'Murdock', 'Primate', 'Stoog3s', 'Synoxis'],
    'Elixir': ['Audiowave', 'Flavour Drop', 'High Grade Sound', 'MC Rim', 'Milinguap', 'Monsieur', 'Nona Van Braeckel', "Rick & James 80's Party", 'Soul Shakers', 'Sandy Warez B2B Revenja', 'Tola Og', 'Unregular'],
    'Cage': ['Dither', 'Elmefti', 'GPF B2B Dr Donk', 'Lolalita B2B Brennt', 'Lunakorpz', 'Mind Compressor', 'Rayzen', 'Sacha Malice', 'Vernex B2B Nrki', 'Von Bikräv'],
    'The Rave Cave': ['Ben Malone', 'Cvnts', 'Junkie Kid', 'Nastya Dikikh', 'Paloma', 'Thomas Moulene', 'Zuke'],
    'Planaxis': ['Cyborg-18', 'Fabio Fusco', 'Firaga', 'Hi Profile', 'John 00 Fleming', 'Mad Maxx', 'Meelix', 'Omiki', 'Somnia', 'Trip-Tamine', 'Yannick Thiry'],
    'Melodia by Corona': ['Awen', 'Da Capo B2B Caiiro B2B Enoo Napa', 'Danni Gato', 'Isa Roos', 'Lerato Tsotetsi', 'Rosey Gold', 'Thakzin', 'Vanco'],
    'Celestia by KuCoin': ['Bennett', 'Diffrent', 'Juno', 'MPH', 'MRMK', 'Olive Anguz', 'Roox', 'Rozie', 'To Be Announced'],
    'Atmosphere': ['Bisoux', 'Kuko', 'Mandy B2B Negitiv', 'Nico Moreno', 'Peterblue', 'Row1', 'Sasha B2B Young Marco'],
    'Core': ['Bibi Seck', 'Eileen', 'Kenny Montana B2B John Moseda', 'Modeselektor (DJ-Set)', 'Sally C', 'Simone B2B Southstar'],
    'Crystal Garden': ['Camilla Jun', 'Eridu', 'Kettama B2B Michael Bibi', 'Marsolo', 'Poleen'],
    'The Great Library': ['Artbat', 'Da Tweekaz', 'DJ Sally', 'Hardwell B2B Sub Zero Project', 'Magik', 'Manuals', 'Mike Williams', 'Nicky Romero', 'Ofenbach', 'R3hab', 'Sam Feldt', 'Tomas Grey', 'Whisnu Santika'],
    'Moose Bar': ['Bosart', 'Funktastix', 'Rino'],
    'House of Fortune by JBL': ['Conrad Taylor', 'Fran Ares', 'Gravagerz', 'Lucca Van Damme', 'Mike Williams', 'Nicky Romero', 'Stadiumx', 'To Be Announced'],
  },

  sat: {
    'Mainstage': ['Boris Brejcha', 'David Guetta', 'Dimitri Vegas & Like Mike', 'Fisher', 'Halö', 'John Newman', 'Maddix', 'MC Stretch', 'Merow', 'Omdat Het Kan & Average Rob', 'Stephani B'],
    'Freedom by Bud': ['Armin van Buuren', 'Dave Lambert', 'Luna & Lenthe', 'Meduza³', 'Netsky', 'Plastik Funk B2B Olympe', 'Space 92', 'Symphony Of Unity'],
    'The Rose Garden': ['Blvckprint', 'Bonzai All Stars', 'DJ Furax', 'DJ Ghost', 'Franky Kloeck', 'Funkhauser', 'Greg S.', 'Jan Vervloet', 'Jente B2B Neall', 'Just-K', 'MC Pyro', 'Phi Phi', 'Push', 'X-Tof'],
    'Elixir': ['Afrolosjes Soundsystem', 'Ballantine & Dieux-Père', 'Encore Soundsystem', 'Kurashi Soundsystem', 'Lordesius & Anders', 'MC Claudio', 'Mel.v!ee', 'Pretty Girls Like Trap Music Soundsystem', 'Rockefellababe', 'Sojuju & Julian Jermain', 'Steww Soundsystem', 'Vunzige Deuntjes Soundsystem', 'Wef'],
    'Cage': ['A.N.I', 'Byorn', 'Dexphase', 'Luna Fields', 'Maike Depas', 'Vieze Asbak'],
    'The Rave Cave': ['Aghatixx', 'Bobby & Djenko', 'Brits & Boen', 'Jonas Van Opstal', 'Los Bomberos', 'Monta', 'Soulcity', 'The Spook', 'Vitucci'],
    'Planaxis': ['Bassjackers', 'Chocolate Puma', "D'Angello & Francis", 'Dvbbs', 'Ian Asher', 'Kaaze', 'Laidback Luke', 'Lucas & Steve', 'Marnik', 'Quintino', 'Steve Aoki'],
    'Melodia by Corona': ['Arado', 'Chinonegro', 'Emiliano Demarco', 'Hermanos Inglesos', 'Idemi', 'Lya', 'Sam Shure', 'Twenty Six', 'Unread'],
    'Celestia by KuCoin': ['Block & Crown B2B Lynne', 'Diego Miranda B2B Pette', 'Dimitri Vangelis & Wyman', 'DJ Nano', 'Encure B2B Honey Gee', 'Joyse B2B Ryan Spicer', 'Matisse & Sadko', 'Sebsky', 'Will Sparks', 'Yves V'],
    'Atmosphere': ['Antdot', 'Bia B2B Charlie Sparks', 'Estella Boersma', 'Indira Paganotto', 'Interactive Noise', 'Marhu', 'Reinier Zonneveld (Live)'],
    'Core': ['Ben Klock', 'Ben Hemsley', 'Bedouin', 'Betical', 'Capoon', 'Curol', 'Dino Lenny', 'Samm B2B Ajna'],
    'Crystal Garden': ['Cici Daze', 'Dali', 'Dean Turnley', 'Morten B2B Malaa', 'Nosi', 'Steve Angello'],
    'The Great Library': ['Agents of Time', 'Andromedik', 'Ciel.', 'Jazzy', 'Linska', 'Lost Frequencies', 'Marten Hørger', 'Marwan Dua', 'Oliver Heldens'],
    'Moose Bar': ['Funkhauser', 'Jelle DK', 'Jeroen Visser'],
    'House of Fortune by JBL': ['Fonsi Nieto', 'Lennert Wolfs', 'Lucas & Steve', 'Makasi', 'Mandy', 'Mark Roma', 'Yuuki Yoshiyama'],
  },

  sun: {
    'Mainstage': ['Alesso', 'B Jones', 'Calvin Harris', 'John Summit', 'Kevin de Vries', 'Malugi', 'MC Stretch'],
    'Freedom by Bud': ['Alok: Rave The World', 'Arielle Free', 'Chase & Status (DJ Set)', 'DJ Licious', 'I Hate Models', 'Jack Shore', 'Neon', 'Pegassi'],
    'The Rose Garden': ['Adrenalize', 'Digital Madness', 'Isaac', 'Pat B', 'Rebelion', 'Rooler', 'Sub Zero Project', 'The Saints', 'The Z.', 'TNT', 'Villain'],
    'Elixir': ['DJ Fasta', 'Favella Som Sistema', 'G-Lo', 'Heaven Sam', 'Jeronimo', 'Karyo', 'Noah', 'Sako Glitch', 'Sleazy Stereo', 'Team Damp', 'Tribal Kush'],
    'Cage': ['Adrián Mills F2F Sisu', 'David Löhlein F2F Yasmin Regisford', 'Emilija F2F Frederic Selected', 'Fumi F2F Hujus', 'Hurts F2F Row 1', 'Klaps F2F Miamor', 'Serafina F2F Zwilling.'],
    'The Rave Cave': ['Coco Bevan', 'Dries Smet', 'Foxed Up', 'Godtripper', 'Mell Tierra', 'Mitched', 'Nederhand', 'Noaffection B2B Om3n', 'Yerun'],
    'Planaxis': ['Arcando', 'Exception', 'Ivy', 'Level Up', 'Liquid Stranger', "Malaa's Alter Ego", 'Nostalgix', 'Punctual', 'Sabai', 'Seven Lions', 'Subtronics'],
    'Melodia by Corona': ['Christian82', 'Cristina Tosio', 'Dave Hang', 'Delafino', 'DJ Gee', 'Felix Da Funk', 'Le Windey', 'Lunnas', 'Marta Loe B2B Rebeca Ark', 'Tania Moon'],
    'Celestia by KuCoin': ['Cyria (Hybrid)', 'Fake Mood', 'Helsloot', 'MxGPU (Hybrid)', 'Nico Morano B2B Xinobi', 'Õona Dahl', 'Sentin'],
    'Atmosphere': ['Amelie Lens', 'Anetha', 'Blondex', 'Flour', 'Øtta', 'Shdw B2B Überkikz', 'Ve/Ra'],
    'Core': ['Avalon Emerson B2B Ben UFO', 'Fafi Abdel Nour', 'Ineffekt', 'Job Jobse', 'Massignan.y', 'Sedef Adasî'],
    'Crystal Garden': ['DJ Gigola', 'DJ Tennis B2B Vintage Culture', 'Elfigo', 'Hitty', 'Oscar And The Wolf', 'Wade'],
    'The Great Library': ['Afrojack', 'Blasterjaxx', 'Diètro', 'Dimitri Vegas B2B Timmy Trumpet', 'Gabry Ponte', 'Gryffin', 'Hypaton', 'James Carter', 'Mattn', 'Viktor', 'Vini Vici', 'Yazzmin'],
    'Moose Bar': ['Jerroo', 'Les Mecs Eclectics', 'Tom Cosyns'],
    'House of Fortune by JBL': ['Adam K', 'DJ Gab', 'Krevix', 'Sofia Cristo'],
  },
};

// ── Derive flat sets[] for the picks / clash engine ──────────
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const sets = Object.entries(LINEUP).flatMap(([day, stages]) =>
  Object.entries(stages).flatMap(([stage, entries]) =>
    entries.map((entry, i) => {
      const e = typeof entry === 'string' ? { name: entry } : entry;
      return {
        id: `${day}-${slug(stage)}-${i}`,
        name: e.name,
        stage,
        day,
        start: e.start ?? null,
        end: e.end ?? null,
      };
    })
  )
);
