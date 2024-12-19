export const KEY_DELIMITER = '__';
export const STRING_PARAM = '__PARAM_';

export const COMMANDS_SEPARATOR = ' 💻 ';
export const COMMANDS_RESPONSE_KEY = `${KEY_DELIMITER}COMMANDS${KEY_DELIMITER}`;
export const MOD_COMMANDS_RESPONSE_KEY = `${KEY_DELIMITER}MOD_COMMANDS${KEY_DELIMITER}`;

export const VALORANT_RANK_RESPONSE_KEY = `${KEY_DELIMITER}VALORANT_RANK${KEY_DELIMITER}`;
export const VALORANT_LAST_RANKED_RESPONSE_KEY = `${KEY_DELIMITER}VALORANT_LAST_RANKED${KEY_DELIMITER}`;
export const JOKES_KEY = `${KEY_DELIMITER}JOKES${KEY_DELIMITER}`;

export const RESPONSES_KEYS = [
  VALORANT_RANK_RESPONSE_KEY,
  VALORANT_LAST_RANKED_RESPONSE_KEY,
  COMMANDS_RESPONSE_KEY,
  MOD_COMMANDS_RESPONSE_KEY,
  JOKES_KEY,
];

export const COMMAND_DELIMITER = '/';

export const CHANGE_CHANNEL_INFORMATION_KEY = '!categoria';
export const CREATE_CLIP_KEY = '!clip';
export const MOST_POPULAR_CLIP_KEY = '!clipmaspopular';

export const TTS_KEY = '!tts';
export const TTS_MOD_SENDER = 'Un moderador';
export const TTS_MESSAGE = `${STRING_PARAM}1 dijo: ${STRING_PARAM}2`;

export const MODS_MESSAGES_CONFIG = [
  CHANGE_CHANNEL_INFORMATION_KEY,
  TTS_KEY,
  CREATE_CLIP_KEY,
  MOST_POPULAR_CLIP_KEY,
];

export const MESSAGES_CONFIG: {
    [message: string]: string;
} = {
  ['!nickvalo']: '🎮 rungekutta93#RK93',
  ['!valorantid']: '🎮 rungekutta93#RK93',
  ['!plataformas']: '🌐¡Seguí mis aventuras en todas las plataformas!🌐 🎮https://www.twitch.tv/rungekutta93 🎮https://kick.com/rungekutta93',
  ['!redes']: '🌐¡Seguí mis aventuras en todas las plataformas!🌐 🎮https://www.twitch.tv/rungekutta93 🎮https://kick.com/rungekutta93',
  ['!horarios']: '🎮Mi horario de streams🎮 🗓️ Todos los días a las 10:30 PM ❌ Los jueves se descansa',
  ['!risas']: '😂 ¡Se descontroló el chat! Jajaja, qué nivel de risas, gente. 🤣 ¡Los quiero ver a todos spameando el jajajaja! 😂🔥',
  ['!perdon']: '😅 ¡Uh, me mandé una! Perdón, gente. 🙏 Espero que me perdonen... o no. 😂💜',
  ['!rangovalorant']: `🎮 rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!rango']: `🎮 rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!elo']: `🎮 rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!valorantrango']: `🎮 rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!valorant']: `🎮 rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!ultimarankedvalo']: `🎮 ${VALORANT_LAST_RANKED_RESPONSE_KEY}`,
  ['!ultimarankedvalorant']: `🎮 ${VALORANT_LAST_RANKED_RESPONSE_KEY}`,
  ['!ultimapartida']: `🎮 ${VALORANT_LAST_RANKED_RESPONSE_KEY}`,
  ['!comandos']: `Lista de comandos:${COMMANDS_SEPARATOR}${COMMANDS_RESPONSE_KEY}`,
  ['!comandosmod']: `Lista de comandos para mods:${COMMANDS_SEPARATOR}${MOD_COMMANDS_RESPONSE_KEY}`,
  ['!chiste']: `🤡 ${JOKES_KEY}`,
  ['!chistes']: `🤡 ${JOKES_KEY}`,
};

export const NEW_FOLLOWER_MESSAGE = `🎉 ¡Mil Gracias @${STRING_PARAM}1, por la buena onda y el follow! 🙌✨ ¡Bienvenido/a a la comunidad! 🎮🚀 ¡Se vienen cosas piolas!`;
export const NEW_SUB_MESSAGE = `🎉 ¡Mil gracias @${STRING_PARAM}1 por esa suscripción! 🙌✨ ¡Bienvenido/a a la banda de subs! 🎮🚀 ¡Ahora sos parte de la familia! 💜 ¡Alta facha!`;
export const BITS_MESSAGE = `🎉 ¡Mil Gracias @${STRING_PARAM}1 por tirar esos ${STRING_PARAM}2 bits! 💎✨ ¡Se re valora, amigo/a! 🔥`;

export const FOLLOW_SPAM_MESSAGES = [
  '🎮 ¡Gracias por coparte con el stream! 🔔 Mandale follow así no te perdés nada. 💜 ¿Te gusta la movida? Suscribite y bancá el contenido. 🔥 ¡También estoy en Kick, pasate! https://kick.com/rungekutta93',
  '🎮 ¡Bienvenido/a al directo! 🔔 Tirame un follow así estás al tanto de todo lo que se viene. 💜 Si te gusta lo que ves, suscribite y formá parte. 🔥 También ando por Kick: https://kick.com/rungekutta93.',
  '🔥 ¡Gracias por sumarte al stream! 💜 Tu apoyo suma un montón. Dale follow y, si te pinta, suscribite. 🎮 ¿Sabías que también estoy en Kick? ¡Pasá y seguime!: https://kick.com/rungekutta93.',
  '🔔 ¡No te colgués! 🎮 Mandale follow así no te perdés ningún stream. 💜 ¿Te gusta la onda? Suscribite y bancame con todo. 🔥 Estoy en Kick también: https://kick.com/rungekutta93.',
];

export const PRIME_SPAM_MESSAGES = [
  '💜 ¿Tenés Amazon Prime? 🎁 ¡Con Prime Gaming te podés suscribir GRATIS a este canal todos los meses! ✨ ¡Aprovechá y bancá el contenido que te copa!',
  '📦 ¿Sos Prime? 💜 ¡Prime Gaming te da una sub gratis al mes! ✨ Mandala acá y sumate a la banda. ¡Es un golazo!',
  '🎮 ¿Conocés Prime Gaming? 💜 Si tenés Amazon Prime, tenés una sub mensual GRATIS. 🔥 Usala acá y bancá el stream. ¡Sos crack!',
  '✨ ¡Aprovechá Amazon Prime a full! 📦 Prime Gaming te regala una sub GRATIS todos los meses. 💜 Si te copa el stream, usala acá y formá parte. ¡Es fácil y gratis!',
  '💡 ¿Sabías que con Amazon Prime tenés una sub GRATIS? 🎁 Usala con Prime Gaming y bancá el contenido. 💜 ¡Sumate a la comunidad!',
];

export const ACTION_NOT_ALLOWED = 'No podés hacer eso, papá';

export const CHANNEL_INFO_ACTION_GAME_NOT_AVAILABLE = 'El juego no está disponible';
export const CHANNEL_INFO_ACTION_SUCCESS = '¡Información del canal actualizada con éxito!';
export const CHANNEL_INFO_ACTION_ERROR = 'No pudimos actualizar la info del canal';

export const CLIP_ACTION_ERROR = 'Error con el clip';
export const CLIP_ACTION_SUCCESS = `🎥 ¡Acá tenés el clip, papá! 👉 ${STRING_PARAM}`;
export const CLIP_ACTION_SUCCESS_EDIT_AVAILABLE = `🎥 ¡Acá tenés el clip, papá! 👉 ${STRING_PARAM}1 | 📝 Editá el clip acá: ${STRING_PARAM}2`;
