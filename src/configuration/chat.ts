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

export const TTS_KEY = '!tts';
export const TTS_MOD_SENDER = 'Un moderador';
export const TTS_MESSAGE = `${STRING_PARAM}1 dijo: ${STRING_PARAM}2`;

export const MODS_MESSAGES_CONFIG = [
  CHANGE_CHANNEL_INFORMATION_KEY,
  TTS_KEY,
];

export const MESSAGES_CONFIG: {
    [message: string]: string;
} = {
  ['!nickvalo']: '🎮 rungekutta93#RK93',
  ['!valorantid']: '🎮 rungekutta93#RK93',
  ['!plataformas']: '🌐¡Sigue mis aventuras en todas las plataformas!🌐 🎮https://www.twitch.tv/rungekutta93 🎮https://kick.com/rungekutta93',
  ['!redes']: '🌐¡Sigue mis aventuras en todas las plataformas!🌐 🎮https://www.twitch.tv/rungekutta93 🎮https://kick.com/rungekutta93',
  ['!horarios']: '🎮Mi horario de streams🎮 🗓️ Todos los días a las 10:30 PM ❌ Los jueves se descansa',
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

export const NEW_FOLLOWER_MESSAGE = `🎉 ¡Muchas gracias @${STRING_PARAM}1 por seguirme! 🙏✨ ¡Bienvenido/a a la comunidad! 🎮🚀`;
export const NEW_SUB_MESSAGE = `🎉 ¡Muchísimas gracias @${STRING_PARAM}1 por suscribirte! 🙏✨ ¡Bienvenido/a a la comunidad de subs! 🎮🚀 ¡Ahora eres parte de la familia! 💜`;
export const BITS_MESSAGE = `🎉 ¡Muchísimas gracias @${STRING_PARAM}1 por esos ${STRING_PARAM}2 bits! 💎✨`;

export const FOLLOW_SPAM_MESSAGES = [
  '🎮 ¡Gracias por estar aquí! 🔔 Sígueme para no perderte nada. 💜 Si te gusta el contenido, suscríbete y apóyame. 🔥 ¡También sígueme en Kick! https://kick.com/rungekutta93',
  '🎮 ¡Bienvenido al stream! 🔔 No olvides seguirme para estar al tanto de futuras transmisiones. 💜 ¿Te gusta el contenido? ¡Suscríbete y sé parte de esta comunidad! 🔥 También estoy en Kick: https://kick.com/rungekutta93.',
  '🔥 ¡Gracias por acompañarme! 💜 Tu apoyo es increíble. Dale a seguir y suscríbete si disfrutas del contenido. 🎮 ¿Sabías que también estoy en Kick? Sígueme por allá: https://kick.com/rungekutta93.',
  '🔔 ¡No te pierdas nada! 🎮 Dale follow y acompáñame en todas mis transmisiones. 💜 Si te gusta el contenido, tu suscripción hace la diferencia. 🔥 Estoy en Kick también: https://kick.com/rungekutta93.',
];

export const PRIME_SPAM_MESSAGES = [
  '💜 ¿Tienes Amazon Prime? 🎁 ¡Con Prime Gaming puedes suscribirte GRATIS a este canal cada mes! ✨ Aprovecha tu suscripción Prime para apoyar el contenido que te gusta.',
  '📦 ¿Eres usuario de Amazon Prime? 💜 ¡Prime Gaming te da una sub mensual GRATIS! ✨ Úsala aquí y sé parte de esta increíble comunidad.',
  '🎮 ¿Conoces Prime Gaming? 💜 Si tienes Amazon Prime, puedes suscribirte GRATIS a tu canal favorito. 🔥 ¡Apoya este canal con tu suscripción Prime y sé un crack!',
  '✨ ¡Saca el máximo provecho de Amazon Prime! 📦 Recuerda que Prime Gaming incluye una sub GRATIS cada mes. 💜 Si disfrutas del contenido, considera usarla aquí. ¡Es muy fácil!',
  '💡 ¿Sabías esto sobre Amazon Prime? 🎁 Con Prime Gaming tienes una sub mensual GRATIS en Twitch. 💜 ¿Qué esperas? ¡Apóyame y forma parte de esta comunidad!',
];

export const ACTION_NOT_ALLOWED = 'No puedes realizar esa acción';

export const CHANNEL_INFO_ACTION_GAME_NOT_AVAILABLE = 'Juego no encontrado';
export const CHANNEL_INFO_ACTION_SUCCESS = 'Información del canal actualizada';
export const CHANNEL_INFO_ACTION_ERROR = 'No se pudo cambiar la información del canal';
