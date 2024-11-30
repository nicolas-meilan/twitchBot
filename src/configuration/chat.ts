
export const KEY_DELIMITER = '__';
export const VALORANT_RANK_RESPONSE_KEY = `${KEY_DELIMITER}VALORANT_RANK${KEY_DELIMITER}`;
export const COMMANDS_RESPONSE_KEY = `${KEY_DELIMITER}COMMANDS${KEY_DELIMITER}`;

export const RESPONSES_KEYS = [
  VALORANT_RANK_RESPONSE_KEY,
  COMMANDS_RESPONSE_KEY,
];

export const MESSAGES_CONFIG: {
    [message: string]: string;
} = {
  ['!nickvalo']: '🎮rungekutta93#RK93',
  ['!valorantid']: '🎮rungekutta93#RK93',
  ['!plataformas']: '🌐¡Sigue mis aventuras en todas las plataformas!🌐 🎮https://www.twitch.tv/rungekutta93 🎮https://kick.com/rungekutta93',
  ['!redes']: '🌐¡Sigue mis aventuras en todas las plataformas!🌐 🎮https://www.twitch.tv/rungekutta93 🎮https://kick.com/rungekutta93',
  ['!horarios']: '🎮Mi horario de streams🎮 🗓️ Todos los días a las 10:30 PM ❌ Los jueves se descansa',
  ['!rangovalorant']: `🎮rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!rango']: `🎮rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!elo']: `🎮rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!valorantrango']: `🎮rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!valorant']: `🎮rungekutta93#RK93 - ${VALORANT_RANK_RESPONSE_KEY}`,
  ['!comandos']: COMMANDS_RESPONSE_KEY,
};
