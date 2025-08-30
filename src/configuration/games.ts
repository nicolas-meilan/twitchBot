export type Game = {
  title: string;
  gameId: string;
  tags: string[];
};

const VALORANT_KEY = 'valorant';
const PEAK_KEY = 'peak';
const DB_KEY = 'dragonballsparkingzero';
const PHASMOPHOBIA = 'phasmophobia';
const FORTNITE = 'fortnite';
const DESARROLLO = 'desarrollo';
const DEAD_BY_DAYLIGHT = 'deadbydaylight';
const MINECRAFT = 'minecraft';
const JUST_CHATTING = 'justchatting';

export const GAMES_KEYS = [
  PEAK_KEY,
  VALORANT_KEY,
  DB_KEY,
  PHASMOPHOBIA,
  FORTNITE,
  DESARROLLO,
  DEAD_BY_DAYLIGHT,
  MINECRAFT,
];

export const BASE_TAGS = [
  'spanish',
  'chill',
  'gaming',
  'diversion',
  'argentina',
  'latam',
];

export const GAMES: {
  [key: typeof GAMES_KEYS[number]]: Game;
} = {
  [JUST_CHATTING]: {
    title: 'Charlita tranqui en vivo 🧉✨ Pasá a saludar y quedate un rato',
    gameId: '509658',
    tags: [
      ...BASE_TAGS,
      'chat',
      'conversar',
      'comunidad',
      'charlas',
    ],
  },
  [VALORANT_KEY]: {
    title: 'Valorant en directo | ¿Querés jugar? Mandá !unirme y entrá al equipo 🎮🔥',
    gameId: '516575',
    tags: [
      ...BASE_TAGS,
      'competitive',
      'valorant',
      'shooter',
      'fps',
    ],
  },
  [PEAK_KEY]: {
    title: 'PEAK en directo | Montañas, memes y mucha tensión 🌋💪',
    gameId: '1081998272',
    tags: [
      ...BASE_TAGS,
      'adventure',
      'peak',
      'survival',
      'climbing',
    ],
  },
  [DB_KEY]: {
    title: 'Dragon Ball Sparking Zero en directo | Más risas que victorias 😂🎮',
    gameId: '400407464',
    tags: [
      ...BASE_TAGS,
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
      'shooter',
      'funnyplays',
    ],
  },
  [DESARROLLO]: {
    title: 'Dev Time | Sesión chill de programación, ¡únete! 🚀💡',
    gameId: '1469308723',
    tags: [
      ...BASE_TAGS,
      'coding',
      'livestreamcoding',
      'tech',
      'developer',
    ],
  },
  [DEAD_BY_DAYLIGHT]: {
    title: 'Dead by Daylight en Vivo | Supervivencia y terror con amigos 👻🔪',
    gameId: '491487',
    tags: [
      ...BASE_TAGS,
      'laughs',
      'friends',
      'cooperative',
      'suspense',
    ],
  },
  [MINECRAFT]: {
    title: 'Minecraft en Vivo | Construcción, aventuras y creatividad sin límites 🧱⛏️',
    gameId: '27471',
    tags: [
      ...BASE_TAGS,
      'building',
      'survival',
      'sandbox',
      'adventure',
    ],
  },
};
