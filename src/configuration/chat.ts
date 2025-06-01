export const KEY_DELIMITER = '__';
export const STRING_PARAM = '__PARAM__';

export const COMMANDS_SEPARATOR = ' 💻 ';
export const COMMANDS_RESPONSE_KEY = `${KEY_DELIMITER}COMMANDS${KEY_DELIMITER}`;
export const MOD_COMMANDS_RESPONSE_KEY = `${KEY_DELIMITER}MOD_COMMANDS${KEY_DELIMITER}`;
export const VIP_COMMANDS_RESPONSE_KEY = `${KEY_DELIMITER}VIP_COMMANDS${KEY_DELIMITER}`;

export const VALORANT_RANK_RESPONSE_KEY = `${KEY_DELIMITER}VALORANT_RANK${KEY_DELIMITER}`;
export const VALORANT_LAST_RANKED_RESPONSE_KEY = `${KEY_DELIMITER}VALORANT_LAST_RANKED${KEY_DELIMITER}`;
export const JOKES_KEY = `${KEY_DELIMITER}JOKES${KEY_DELIMITER}`;
export const PLAYERS_KEY = `${KEY_DELIMITER}PLAYERS${KEY_DELIMITER}`;

export const RESPONSES_KEYS = [
  VALORANT_RANK_RESPONSE_KEY,
  VALORANT_LAST_RANKED_RESPONSE_KEY,
  COMMANDS_RESPONSE_KEY,
  MOD_COMMANDS_RESPONSE_KEY,
  VIP_COMMANDS_RESPONSE_KEY,
  JOKES_KEY,
  PLAYERS_KEY,
];

export const COMMAND_DELIMITER = '/';

export const START_STREAM_KEY = '!online';
export const VIP_KEY = '!vip';

export const BROADCASTER_MESSAGES_CONFIG = [
  START_STREAM_KEY,
  VIP_KEY,
];

export const CHANGE_CHANNEL_INFORMATION_KEY = '!categoria';
export const MOST_POPULAR_CLIP_KEY = '!topclip';
export const TTS_KEY = '!tts';
export const VALORANT_RANDOM_AGENT_KEY = '!agenterandom';
export const CREATE_CLIP_KEY = '!clip';
export const ADD_TO_PLAYERS_QUEUE_KEY = '!unirme';
export const ADD_TO_PLAYERS_QUEUE_KEY_ALIAS = '!unirse';
export const MOVE_PLAYER_FROM_QUEUE_KEY = '!mover';
export const DELETE_PLAYER_FROM_QUEUE_KEY = '!borrar';
export const ADD_MANUALLY_TO_PLAYERS_QUEUE_KEY = '!agregar';
export const LEAVE_PLAYERS_QUEUE_KEY = '!salir';
export const CLEAN_PLAYERS_QUEUE_KEY = '!limpiar';
export const PLAYERS_QUEUE_ON = '!listaon';
export const PLAYERS_QUEUE_OFF = '!listaoff';

export const LOTTERY_COMMAND = '!sorteo';
export const LOTTERY_STATUS_COMMAND = '!estoy';
export const LOTTERY_LIST_COMMAND = '!listasorteo';
export const LOTTERY_START_COMMAND = '!sortear';
export const LOTTERY_CLEAN_COMMAND = '!limpiarsorteo';
export const LOTTERY_REMOVE_COMMAND = '!borrardelsorteo';
export const LOTTERY_PAUSE_COMMAND = '!sorteooff';
export const LOTTERY_RESUME_COMMAND = '!sorteoon';

export const USERS_ACTIONS_CONFIG = [
  CREATE_CLIP_KEY,
  ADD_TO_PLAYERS_QUEUE_KEY,
  ADD_TO_PLAYERS_QUEUE_KEY_ALIAS,
  LEAVE_PLAYERS_QUEUE_KEY,
  LOTTERY_COMMAND,
  LOTTERY_STATUS_COMMAND,
  LOTTERY_LIST_COMMAND,
];

export const VIP_ACTIONS_CONFIG = [
  TTS_KEY,
  VALORANT_RANDOM_AGENT_KEY,
];

export const MODS_ACTIONS_CONFIG = [
  CHANGE_CHANNEL_INFORMATION_KEY,
  TTS_KEY,
  MOST_POPULAR_CLIP_KEY,
  VALORANT_RANDOM_AGENT_KEY,
  MOVE_PLAYER_FROM_QUEUE_KEY,
  DELETE_PLAYER_FROM_QUEUE_KEY,
  ADD_MANUALLY_TO_PLAYERS_QUEUE_KEY,
  CLEAN_PLAYERS_QUEUE_KEY,
  PLAYERS_QUEUE_ON,
  PLAYERS_QUEUE_OFF,
  LOTTERY_START_COMMAND,
  LOTTERY_CLEAN_COMMAND,
  LOTTERY_REMOVE_COMMAND,
  LOTTERY_PAUSE_COMMAND,
  LOTTERY_RESUME_COMMAND,
];

export const MESSAGES_CONFIG: {
    [message: string]: string;
} = {
  ['!nickvalo']: '🎮 rungekutta93#RK93',
  ['!valorantid']: '🎮 rungekutta93#RK93',
  ['!plataformas']: '🌐 ¡Seguí mis aventuras en todas las plataformas! 🌐 🎮 https://www.twitch.tv/rungekutta93 🎮 https://kick.com/rungekutta93 🎮 https://youtube.com/@rungekutta93 🎮 https://tiktok.com/@rungekutta93 💬 https://discord.gg/bHePmGSXVm',
  ['!redes']: '🌐 ¡Seguí mis aventuras en todas las plataformas! 🌐 🎮 https://www.twitch.tv/rungekutta93 🎮 https://kick.com/rungekutta93 🎮 https://youtube.com/@rungekutta93 🎮 https://tiktok.com/@rungekutta93 💬 https://discord.gg/bHePmGSXVm',
  ['!discord']: '🎙️ ¡Sumate al Discord de la comunidad! Charlas, memes y partidas se arman acá 👉 https://discord.gg/bHePmGSXVm 🍻 ¡No te quedes afuera, che!',
  ['!ds']: '🎙️ ¡Sumate al Discord de la comunidad! Charlas, memes y partidas se arman acá 👉 https://discord.gg/bHePmGSXVm 🍻 ¡No te quedes afuera, che!',
  ['!kick']: '🚀 ¡Seguime también en Kick! Pasate a la verde para más streams copados 👉 https://kick.com/rungekutta93 🎮 ¡Nos vemos ahí, papá!',
  ['!youtube']: '📺 ¡No te pierdas mis videos en YouTube! Suscribite para contenido épico y más diversión 👉 https://youtube.com/@rungekutta93 🎮 ¡Dale al botón rojo, papá! 🚀🔥',
  ['!tiktok']: '🎥✨ ¡Prendo en TikTok también! 👉 https://tiktok.com/@rungekutta93 🎮🔥 ¡Te espero ahí!',
  ['!horarios']: '🎮 Mi horario de streams 🎮 🗓️ Generalmente estoy en vivo a las 6:00 PM y a veces también a las 10:30 PM. Todo sujeto a mi disponibilidad, siempre en horario de Argentina 🇦🇷. ¡Activá las notis para no perderte nada!',
  ['!risas']: '😂 ¡Se descontroló el chat! Jajaja, qué nivel de risas, gente. 🤣 ¡Los quiero ver a todos spameando el jajajaja! 😂🔥',
  ['!perdon']: '😅 ¡Uh, me mandé una! Perdón, gente. 🙏 Espero que me perdonen... o no. 😂💜',
  ['!rangovalorant']: `🎮 rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!rango']: `🎮 rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!elo']: `🎮 rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!valorantrango']: `🎮 rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!valorant']: `🎮 rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!id']: `🎮 rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!mira']: `Ahí tenés, la mira mágica papá 😎🎯: 0;p;0;s;1;P;c;1;u;DFFDD0FF;o;0.456;0t;1;0l;3;0o;1;0a;1;0f;0;1b;0;A;c;1;o;1;d;1;0b;0;1b;0;S;s;0.8;o;1`,
  ['!ultimarankedvalo']: VALORANT_LAST_RANKED_RESPONSE_KEY,
  ['!ultimarankedvalorant']: VALORANT_LAST_RANKED_RESPONSE_KEY,
  ['!ultimapartida']: VALORANT_LAST_RANKED_RESPONSE_KEY,
  ['!comandos']: `Lista de comandos:${COMMANDS_SEPARATOR}${COMMANDS_RESPONSE_KEY}`,
  ['!comandosmod']: `Lista de comandos para mods:${COMMANDS_SEPARATOR}${MOD_COMMANDS_RESPONSE_KEY}`,
  ['!comandosvip']: `Lista de comandos VIP:${COMMANDS_SEPARATOR}${VIP_COMMANDS_RESPONSE_KEY}`,
  ['!jugadores']: `🎯 Jugadores listos para la acción: ${PLAYERS_KEY}`,
  ['!lista']: `🎯 Jugadores listos para la acción: ${PLAYERS_KEY}`,
  ['!comojugar']: 'Para unirte a la partida, usá 🖥️ !unirme | Para ver los jugadores, poné 🖥️ !jugadores | Si no podés seguir, tirá 🖥️ !salir para dejar espacio a otro. 🏆 Subs y VIPs tienen tiempo de ventaja. ¡No te quedes afuera! 👾',
  ['!chiste']: `🤡 ${JOKES_KEY}`,
  ['!chistes']: `🤡 ${JOKES_KEY}`,
};

export const NEW_FOLLOWER_MESSAGE = `🎉 ¡Mil Gracias @${STRING_PARAM}1, por la buena onda y el follow! 🙌✨ ¡Bienvenido/a a la comunidad! 🎮🚀 ¡Se vienen cosas piolas!`;

export const NEW_SUB_MESSAGE = `🎉 ¡Mil gracias @${STRING_PARAM}1 por esa suscripción! 🙌✨ ¡Bienvenido/a a la banda de subs! 🎮🚀 ¡Ahora sos parte de la familia! 💜 ¡Alta facha!`;
export const NEW_GIFT_SUB_MESSAGE = `🎁 ¡@${STRING_PARAM}1 le regaló una sub a @${STRING_PARAM}2! 🙌✨ ¡Bienvenido/a a la banda de subs, @${STRING_PARAM}2! 🎮🚀 ¡Gracias por el aguante, @${STRING_PARAM}1! 💜 ¡Alta facha los dos!`;
export const NEW_COMMUNITY_GIFT_MESSAGE = `🎁 ¡@${STRING_PARAM}1 regaló ${STRING_PARAM}2 sub(s) a la comunidad! 🙌✨ ¡Un capo/capa total! 🎮🚀 ¡Gracias por el aguante y por sumar más gente a la banda de subs! 💜 ¡Alta facha!`;

export const BITS_MESSAGE = `🎉 ¡Mil Gracias @${STRING_PARAM}1 por tirar esos ${STRING_PARAM}2 bits! 💎✨ ¡Se re valora, amigo/a! 🔥`;

export const RAID_MESSAGE = `🚀 ¡Tremenda raid de @${STRING_PARAM}1! 🙌🔥 Bienvenidos a todos los ${STRING_PARAM}2 que vienen con la manada 🐺. Soy RungeKutta93, hacemos streams chill 😄 ¡También en TikTok! 👉 https://tiktok.com/@rungekutta93 | Kick 👉 https://kick.com/rungekutta93 | YouTube 👉 https://youtube.com/@rungekutta93 | Discord 👉 https://discord.gg/bHePmGSXVm 💜 Si tenés Prime, suscribite gratis y apoyá el canal. 🚀🔥`;
export const RAID_FOLLOW_MESSAGE = `🔥 ¡No olviden seguir a @${STRING_PARAM} en su canal! 👉 https://www.twitch.tv/${STRING_PARAM} 💜 ¡Gracias por la raid! 🙌`;

export const FOLLOW_SPAM_MESSAGES = [
  '🎮 ¡Gracias por coparte con el stream! 🔔 Mandale follow así no te perdés nada. 💜 Si te pinta, suscribite y bancá el canal. 🔥 También estoy en TikTok, Kick y YouTube: tiktok.com/@rungekutta93 | kick.com/rungekutta93 | youtube.com/@rungekutta93',
  '🎮 ¡Bienvenido/a al directo! 🔔 Tirame un follow para no perderte lo que se viene. 💜 ¿Te gusta la onda? Suscribite y formá parte. 🔥 Además, estoy en TikTok, Kick y YouTube: tiktok.com/@rungekutta93 | kick.com/rungekutta93 | youtube.com/@rungekutta93',
  '🔥 ¡Gracias por sumarte al stream! 💜 Tu apoyo vale un montón. Dale follow y, si te copa, suscribite. 🎮 ¿Sabías que también hago contenido en TikTok, Kick y YouTube? ¡Seguime!: tiktok.com/@rungekutta93 | kick.com/rungekutta93 | youtube.com/@rungekutta93',
  '🔔 ¡No te colgués! 🎮 Mandale follow para no perderte los streams. 💜 Si te gusta el contenido, suscribite y bancá el canal. 🔥 También hago streams en TikTok y estoy en Kick y YouTube: tiktok.com/@rungekutta93 | kick.com/rungekutta93 | youtube.com/@rungekutta93',
];

export const PRIME_SPAM_MESSAGES = [
  '💜 ¿Tenés Amazon Prime? 🎁 ¡Con Prime Gaming te podés suscribir GRATIS a este canal todos los meses! ✨ ¡Aprovechá y bancá el contenido que te copa!',
  '📦 ¿Sos Prime? 💜 ¡Prime Gaming te da una sub gratis al mes! ✨ Mandala acá y sumate a la banda. ¡Es un golazo!',
  '🎮 ¿Conocés Prime Gaming? 💜 Si tenés Amazon Prime, tenés una sub mensual GRATIS. 🔥 Usala acá y bancá el stream. ¡Sos crack!',
  '✨ ¡Aprovechá Amazon Prime a full! 📦 Prime Gaming te regala una sub GRATIS todos los meses. 💜 Si te copa el stream, usala acá y formá parte. ¡Es fácil y gratis!',
  '💡 ¿Sabías que con Amazon Prime tenés una sub GRATIS? 🎁 Usala con Prime Gaming y bancá el contenido. 💜 ¡Sumate a la comunidad!',
];

export const ACTION_NOT_ALLOWED = 'No podés hacer eso, papá';

export const TTS_MOD_SENDER = 'Un moderador';
export const TTS_MESSAGE = `${STRING_PARAM}1 dijo: ${STRING_PARAM}2`;

export const CHANNEL_INFO_ACTION_GAME_NOT_AVAILABLE = 'El juego no está disponible';
export const CHANNEL_INFO_ACTION_SUCCESS = '¡Información del canal actualizada con éxito!';
export const CHANNEL_INFO_ACTION_ERROR = 'No pudimos actualizar la info del canal';

export const CLIP_ACTION_ERROR = 'Error con el clip';
export const PROCESSING_CLIP_ERROR = '⏳ Estamos procesando el clip, bancanos un toque...';
export const CLIP_ACTION_SUCCESS = `🎥 ¡Acá tenés el clip, papá! 👉 ${STRING_PARAM}`;
export const CLIP_ACTION_SUCCESS_EDIT_AVAILABLE = `🎥 ¡Acá tenés el clip, papá! 👉 ${STRING_PARAM}1 | 📝 Editá el clip acá: ${STRING_PARAM}2`;

export const START_ACTION_ERROR = `¡Eh, che! Ya estás online, no hace falta que lo digas de nuevo. 😎`;
export const START_ACTION_SUCCESS = `¡Faltan solo ${STRING_PARAM} minutos para arrancar! 🎮⏰ ¡Prepará el mate y ponete cómodo que se viene lo mejor! 🚀`;
export const STREAM_START_ALERT_LONG = `¡Falta poquito, ya estamos a full! 😎💥 ¡El stream está por arrancar, no te lo podés perder! 🔥`;
export const STREAM_START_ALERT_SHORT = '¡Ya está por arrancar, no te lo pierdas! 🚀🔥';

export const VIP_REQUEST_ACTION_SUCCESS = `🎉 ¡Felicitaciones @${STRING_PARAM}, ya sos VIP del canal! 🌟`;
export const VIP_REQUEST_ACTION_ERROR = `😔 @${STRING_PARAM}, hubo un problema al procesar tu solicitud de VIP. Por favor, solicitá el reembolso de tus RungeCoins. 💔`;

export const VALORANT_RANDOM_AGENT_ACTION = '🎰 ¡Girando, girando! 🔥 ¿Quién sale esta vez? 👀 ¡A meterle con todo! 💪🎮';

export const SACRIFICE_REASON = '🕯️🍀';
export const SACRIFICE_SUCCESS = `🕯️ @${STRING_PARAM}1 acaba de sacrificarse ${STRING_PARAM}2 por la victoria 🍀`;
export const SACRIFICE_ERROR = `⛔ No se pudo sacrificar a @${STRING_PARAM} ... es demasiado poderoso/a 🧙‍♂️`;

export const PLAYERS_QUEUE_SUCCESS_MESSAGE = `🔥 ¡La lista de cracks! 🔥: ${STRING_PARAM}`;
export const PLAYERS_QUEUE_CLEAN_SUCCESS_MESSAGE = '🎮 ¡La fila está vacía, todo en orden! 💥 Preparados para la próxima ronda. 🚀';
export const PLAYERS_QUEUE_NO_FOLLOWER = `🕹️ @${STRING_PARAM} Opa, primero tirate el follow así te sumás a la lista 😉. ¡Dale que es un clic nomás!`;
export const PLAYERS_QUEUE_ON_MESSAGE = '🟢 ¡La lista está abierta! Ya podés sumarte con !unirme. 🚀';
export const PLAYERS_QUEUE_OFF_MESSAGE = '🔴 La lista está cerrada por ahora. Solo se agregan jugadores manualmente. ⏸️';

export const LOTTERY_JOIN_SUCCESS = '🎉 @__PARAM__, ya estás participando del sorteo, mucha suerte papá!';
export const LOTTERY_ALREADY_JOINED = '👀 @__PARAM__, ya estabas anotado en el sorteo, tranqui que no te lo perdés.';
export const LOTTERY_STATUS_JOINED = '✅ @__PARAM__, estás inscripto en el sorteo, ¡que la suerte te acompañe!';
export const LOTTERY_STATUS_NOT_JOINED = '❌ @__PARAM__, no estás inscripto en el sorteo. Usá !sorteo para sumarte.';
export const LOTTERY_LIST = '🎲 Hay __PARAM__ personas participando del sorteo. ¡Mucha suerte a todos!';
export const LOTTERY_START_SUCCESS = '🎉 ¡El sorteo arrancó! En unos segundos te digo quién ganó...';
export const LOTTERY_START_WINNER = '🎉 El ganador es: @__PARAM__ ¡Felicitaciones!';
export const LOTTERY_CLEAN_SUCCESS = '🧹 El sorteo fue limpiado, todos pueden anotarse de nuevo.';
export const LOTTERY_REMOVE_SUCCESS = '🗑️ @__PARAM__ fue eliminado del sorteo.';
export const LOTTERY_REMOVE_FAIL = '❌ No se encontró a @__PARAM__ en el sorteo.';
export const LOTTERY_PAUSED = '🔴 El sorteo fue pausado, nadie puede anotarse por ahora. ⏸️';
export const LOTTERY_RESUMED = '🟢 El sorteo fue reanudado, ya pueden anotarse de nuevo. ▶️';
export const LOTTERY_NO_USERS = '⚠️ No hay usuarios anotados en el sorteo.';
export const LOTTERY_ONLY_SUBS = '⛔ Solo los suscriptores pueden participar en el sorteo. Si te copa, suscribite y probá suerte!';

export const REWARD_CLAIMED = `💰 ${STRING_PARAM}1 canjeó: ${STRING_PARAM}2`;
