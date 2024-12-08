export type Game = {
  title: string;
  gameId: string;
  tags: string[];
};

const VALORANT_KEY = 'valorant';
const DB_KEY = 'dragonballsparkingzero';
const PHASMOPHOBIA = 'phasmophobia';
const FORTNITE = 'fortnite';
const DESARROLLO = 'desarrollo';

export const GAMES_KEYS = [
  VALORANT_KEY,
  DB_KEY,
  PHASMOPHOBIA,
  FORTNITE,
  DESARROLLO,
];

const BASE_TAGS = [
  'Español',
  'Argentina',
  'chill',
  'gaming',
  'risas',
];

export const GAMES: {
  [key: typeof GAMES_KEYS[number]]: Game;
} = {
  [VALORANT_KEY]: {
    title: 'Valorant | La Jett que no dispara',
    gameId: '516575',
    tags: [
      ...BASE_TAGS,
      'manqueando',
      'competitivo',
      'valorant',
      'Valo',
      'valorantchill',
    ],
  },
  [DB_KEY]: {
    title: 'Dragon Ball Sparking Zero | Todos son Goku',
    gameId: '400407464',
    tags: [
      ...BASE_TAGS,
      'manqueando',
      'DRAGONBALLSPARKINGZERO',
      'dragonball',
      'dragonballz',
      'dragonballespañol',
    ],
  },
  [PHASMOPHOBIA]: {
    title: 'Phasmophobia | Buscando a Juan Carlos',
    gameId: '518184',
    tags: [
      ...BASE_TAGS,
      'Phasmophobia',
      'fantasmas',
      'miedo',
      'sustos',
      'Sustosyrisas',
    ],
  },
  [FORTNITE]: {
    title: 'Fortnite | Atacando niños rata',
    gameId: '33214',
    tags: [
      ...BASE_TAGS,
      'manqueando',
      'Fortnite',
      'fortnitechill',
      'construccion',
      'ZeroBuildFortnite',
    ],
  },
  [DESARROLLO]: {
    title: 'Desarrollo | Programando chill',
    gameId: '1469308723',
    tags: [
      ...BASE_TAGS,
      'desarrollo',
      'programacion',
      'informatica',
      'software',
      'ingenieria',
    ],
  },
};
