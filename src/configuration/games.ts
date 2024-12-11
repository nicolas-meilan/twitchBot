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
    title: 'Valorant en directo | Amigos + competitivo = caos controlado 🤪🎮',
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
    title: 'Dragon Ball Sparking Zero | Más risas que victorias 😂🎮',
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
    title: 'Phasmophobia en Vivo | Gritos, risas y fantasmas con amigos 👻😂',
    gameId: '518184',
    tags: [
      ...BASE_TAGS,
      'Phasmophobia',
      'ghosthunting',
      'horror',
      'teamplay',
      'jumpscares',
    ],
  },
  [FORTNITE]: {
    title: 'Fortnite Chill en Vivo | Relajado pero buscando la Victoria Royale 😎🎮',
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
    title: 'Dev Time | Sesión chill de programación, ¡únete! 🚀💡',
    gameId: '1469308723',
    tags: [
      ...BASE_TAGS,
      'coding',
      'livestreamcoding',
      'codinglive',
      'tech',
      'developer',
    ],
  },
};
