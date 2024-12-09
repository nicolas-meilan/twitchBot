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

export const BASE_TAGS = [
  'spanish',
  'chill',
  'gaming',
  'fun',
  'funny',
];

export const GAMES: {
  [key: typeof GAMES_KEYS[number]]: Game;
} = {
  [VALORANT_KEY]: {
    title: 'Valorant | La Jett que no dispara',
    gameId: '516575',
    tags: [
      ...BASE_TAGS,
      'funnygameplay',
      'competitive',
      'valorant',
      'shooter',
      'valorantchill',
    ],
  },
  [DB_KEY]: {
    title: 'Dragon Ball Sparking Zero | Todos son Goku',
    gameId: '400407464',
    tags: [
      ...BASE_TAGS,
      'noobplays',
      'DRAGONBALLSPARKINGZERO',
      'dragonball',
      'dragonballz',
      'animegames',
    ],
  },
  [PHASMOPHOBIA]: {
    title: 'Phasmophobia | Buscando a Juan Carlos',
    gameId: '518184',
    tags: [
      ...BASE_TAGS,
      'Phasmophobia',
      'ghosthunting',
      'horror',
      'funnyhorrormoments',
      'jumpscares',
    ],
  },
  [FORTNITE]: {
    title: 'Fortnite | Atacando niños rata',
    gameId: '33214',
    tags: [
      ...BASE_TAGS,
      'casualgaming',
      'Fortnite',
      'fortnitechill',
      'funnyplays',
      'royale',
    ],
  },
  [DESARROLLO]: {
    title: 'Desarrollo | Programando chill',
    gameId: '1469308723',
    tags: [
      ...BASE_TAGS,
      'coding',
      'softwaredevelopment',
      'programming',
      'tech',
      'developer',
    ],
  },
};
