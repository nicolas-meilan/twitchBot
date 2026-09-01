import { BASE_STREAM_START_TIME_MIN } from './botEvents';
import {
  ADD_MANUALLY_TO_PLAYERS_QUEUE_KEY,
  ADD_TO_PLAYERS_QUEUE_KEY,
  ADD_TO_PLAYERS_QUEUE_KEY_ALIAS,
  APOLOGY_KEY,
  BAN_KEY,
  BROADCASTER_MESSAGES_CONFIG,
  CHANGE_CHANNEL_INFORMATION_KEY,
  CHANGE_CHANNEL_INFORMATION_KEY_2,
  CLEAN_PLAYERS_QUEUE_KEY,
  CREATE_CLIP_KEY,
  COMPUTER_ALIAS_KEY,
  COMPUTER_KEY,
  COMMANDS_KEY,
  DELETE_PLAYER_FROM_QUEUE_KEY,
  DISCORD_ALIAS_KEY,
  DISCORD_KEY,
  HELP_COMMAND,
  HOW_TO_PLAY_KEY,
  PLAYERS_QUEUE_PRIORITY_BENEFITS,
  KICK_KEY,
  JOKE_ALIAS_KEY,
  JOKE_KEY,
  FRIDGE_KEY,
  LEAVE_PLAYERS_QUEUE_KEY,
  LOTTERY_CLEAN_COMMAND,
  LOTTERY_COMMAND,
  LOTTERY_LIST_COMMAND,
  LOTTERY_PAUSE_COMMAND,
  LOTTERY_REMOVE_COMMAND,
  LOTTERY_RESUME_COMMAND,
  LOTTERY_START_COMMAND,
  LOTTERY_STATUS_COMMAND,
  LAST_GAME_KEY,
  LAST_RANKED_ALIAS_KEY,
  LAST_RANKED_KEY,
  MESSAGES_CONFIG,
  MODS_ACTIONS_CONFIG,
  MOD_COMMANDS_KEY,
  MOST_POPULAR_CLIP_KEY,
  MOVE_PLAYER_FROM_QUEUE_KEY,
  PLAYERS_LIST_ALIAS_KEY,
  PLAYERS_LIST_KEY,
  PLAYERS_QUEUE_OFF,
  PLAYERS_QUEUE_ON,
  PLATFORMS_KEY,
  SCHEDULE_KEY,
  SOCIAL_NETWORKS_KEY,
  START_STREAM_KEY,
  STEAM_KEY,
  TIMEOUT_KEY,
  TTS_KEY,
  FULL_TTS_ON_KEY,
  FULL_TTS_OFF_KEY,
  USERS_ACTIONS_CONFIG,
  VALORANT_ELO_KEY,
  VALORANT_ID_ALIAS_KEY,
  VALORANT_ID_KEY,
  VALORANT_KEY,
  VALORANT_NICK_KEY,
  VALORANT_RANK_ALIAS_2_KEY,
  VALORANT_RANK_ALIAS_KEY,
  VALORANT_RANK_KEY,
  VALORANT_RANDOM_AGENT_KEY,
  VIP_ACTIONS_CONFIG,
  VIP_KEY,
  VIP_COMMANDS_KEY,
  YOUTUBE_KEY,
  TIKTOK_KEY,
  LAUGHTER_KEY,
  CROSSHAIR_KEY,
  LAST_RANKED_2_KEY,
} from './chat';

export type CommandDescription = {
  description: string;
  usage: string;
};

const noArguments = (description: string): CommandDescription => ({
  description,
  usage: 'sin atributos',
});

const withArguments = (description: string, usage: string): CommandDescription => ({ description, usage });

export const COMMAND_DESCRIPTIONS: Record<string, CommandDescription> = {
  [VALORANT_NICK_KEY]: noArguments('mostrar el nombre de usuario de Valorant'),
  [VALORANT_ID_KEY]: noArguments('mostrar el nombre de usuario de Valorant'),
  [PLATFORMS_KEY]: noArguments('mostrar los enlaces de las plataformas'),
  [SOCIAL_NETWORKS_KEY]: noArguments('mostrar los enlaces de redes sociales'),
  [DISCORD_KEY]: noArguments('mostrar el enlace del Discord'),
  [DISCORD_ALIAS_KEY]: noArguments('mostrar el enlace del Discord'),
  [KICK_KEY]: noArguments('mostrar el enlace del canal de Kick'),
  [YOUTUBE_KEY]: noArguments('mostrar el enlace de YouTube'),
  [TIKTOK_KEY]: noArguments('mostrar el enlace de TikTok'),
  [STEAM_KEY]: noArguments('mostrar el código de amigo de Steam'),
  [SCHEDULE_KEY]: noArguments('mostrar los horarios habituales de stream'),
  [LAUGHTER_KEY]: noArguments('enviar un mensaje de humor al chat'),
  [APOLOGY_KEY]: noArguments('enviar un mensaje de disculpas al chat'),
  [VALORANT_RANK_KEY]: withArguments('mostrar el rango actual de Valorant para un usuario de LATAM o para el streamer si no se pasa valor', `${VALORANT_RANK_KEY} [usuario#tag]`),
  [VALORANT_RANK_ALIAS_KEY]: withArguments('mostrar el rango actual de Valorant para un usuario de LATAM o para el streamer si no se pasa valor', `${VALORANT_RANK_ALIAS_KEY} [usuario#tag]`),
  [VALORANT_ELO_KEY]: withArguments('mostrar el rango actual de Valorant para un usuario de LATAM o para el streamer si no se pasa valor', `${VALORANT_ELO_KEY} [usuario#tag]`),
  [VALORANT_RANK_ALIAS_2_KEY]: withArguments('mostrar el rango actual de Valorant para un usuario de LATAM o para el streamer si no se pasa valor', `${VALORANT_RANK_ALIAS_2_KEY} [usuario#tag]`),
  [VALORANT_KEY]: withArguments('mostrar el rango actual de Valorant para un usuario de LATAM o para el streamer si no se pasa valor', `${VALORANT_KEY} [usuario#tag]`),
  [VALORANT_ID_ALIAS_KEY]: withArguments('mostrar el rango actual de Valorant para un usuario de LATAM o para el streamer si no se pasa valor', `${VALORANT_ID_ALIAS_KEY} [usuario#tag]`),
  [CROSSHAIR_KEY]: noArguments('mostrar la configuración de la mira'),
  [LAST_RANKED_KEY]: withArguments('mostrar el resultado de la última partida ranked de un usuario de LATAM o del streamer si no se pasa valor', `${LAST_RANKED_KEY} [usuario#tag]`),
  [LAST_RANKED_ALIAS_KEY]: withArguments('mostrar el resultado de la última partida ranked de un usuario de LATAM o del streamer si no se pasa valor', `${LAST_RANKED_ALIAS_KEY} [usuario#tag]`),
  [LAST_RANKED_2_KEY]: withArguments('mostrar el resultado de la última partida ranked de un usuario de LATAM o del streamer si no se pasa valor', `${LAST_RANKED_2_KEY} [usuario#tag]`),
  [COMMANDS_KEY]: noArguments('mostrar los comandos disponibles para todos'),
  [MOD_COMMANDS_KEY]: noArguments('mostrar los comandos de moderadores'),
  [VIP_COMMANDS_KEY]: noArguments('mostrar los comandos de VIPs'),
  [PLAYERS_LIST_KEY]: noArguments(`mostrar la lista de jugadores y sus prioridades. Beneficio de la lista: ${PLAYERS_QUEUE_PRIORITY_BENEFITS}`),
  [PLAYERS_LIST_ALIAS_KEY]: noArguments(`mostrar la lista de jugadores y sus prioridades. Beneficio de la lista: ${PLAYERS_QUEUE_PRIORITY_BENEFITS}`),
  [HOW_TO_PLAY_KEY]: noArguments(`mostrar cómo unirse a la partida. ${PLAYERS_QUEUE_PRIORITY_BENEFITS}`),
  [JOKE_KEY]: noArguments('mostrar un chiste'),
  [JOKE_ALIAS_KEY]: noArguments('mostrar un chiste'),
  [FRIDGE_KEY]: withArguments('decir un chiste pasado de tono, sobre una heladera y carne con un nombre o nick', `${FRIDGE_KEY} usuario`),
  [COMPUTER_KEY]: noArguments('mostrar las especificaciones de la computadora'),
  [COMPUTER_ALIAS_KEY]: noArguments('mostrar las especificaciones de la computadora'),
  [HELP_COMMAND]: withArguments('explicar el uso de un comando', `${HELP_COMMAND} !comando`),
  [CREATE_CLIP_KEY]: noArguments('crear un clip del directo'),
  [ADD_TO_PLAYERS_QUEUE_KEY]: noArguments(`sumar al usuario que lo pide a la lista para jugar. ${PLAYERS_QUEUE_PRIORITY_BENEFITS}`),
  [ADD_TO_PLAYERS_QUEUE_KEY_ALIAS]: noArguments(`sumar al usuario que lo pide a la lista para jugar. ${PLAYERS_QUEUE_PRIORITY_BENEFITS}`),
  [LEAVE_PLAYERS_QUEUE_KEY]: noArguments('sacar al usuario que lo pide de la lista para jugar'),
  [LOTTERY_COMMAND]: noArguments('participar del sorteo'),
  [LOTTERY_STATUS_COMMAND]: noArguments('consultar si el usuario participa del sorteo'),
  [LOTTERY_LIST_COMMAND]: noArguments('mostrar la cantidad de participantes del sorteo'),
  [TTS_KEY]: withArguments('enviar un texto a voz puntual', `${TTS_KEY} texto`),
  [FULL_TTS_ON_KEY]: noArguments('activar el modo TTS completo de la IA; distinto de !tts porque hace que todas las respuestas de la IA salgan por voz sin límite de caracteres'),
  [FULL_TTS_OFF_KEY]: noArguments('desactivar el modo TTS completo de la IA; distinto de !tts porque hace que todas las respuestas de la IA salgan por voz sin límite de caracteres'),
  [VALORANT_RANDOM_AGENT_KEY]: noArguments('elegir un agente aleatorio de Valorant'),
  [CHANGE_CHANNEL_INFORMATION_KEY]: withArguments('cambiar la categoría y opcionalmente el título', `${CHANGE_CHANNEL_INFORMATION_KEY} juego / título`),
  [CHANGE_CHANNEL_INFORMATION_KEY_2]: withArguments('cambiar la categoría y opcionalmente el título', `${CHANGE_CHANNEL_INFORMATION_KEY_2} juego / título`),
  [TIMEOUT_KEY]: withArguments('silenciar a un usuario', `${TIMEOUT_KEY} usuario [duración]`),
  [BAN_KEY]: withArguments('bloquear permanentemente a un usuario', `${BAN_KEY} usuario`),
  [MOST_POPULAR_CLIP_KEY]: noArguments('mostrar el clip más popular'),
  [MOVE_PLAYER_FROM_QUEUE_KEY]: withArguments('mover un usuario de la lista', `${MOVE_PLAYER_FROM_QUEUE_KEY} usuario`),
  [DELETE_PLAYER_FROM_QUEUE_KEY]: withArguments('quitar un usuario de la lista', `${DELETE_PLAYER_FROM_QUEUE_KEY} usuario`),
  [ADD_MANUALLY_TO_PLAYERS_QUEUE_KEY]: withArguments('agregar manualmente un usuario a la lista', `${ADD_MANUALLY_TO_PLAYERS_QUEUE_KEY} usuario [prioritario]`),
  [CLEAN_PLAYERS_QUEUE_KEY]: noArguments('vaciar la lista de jugadores'),
  [PLAYERS_QUEUE_ON]: noArguments('abrir la lista de jugadores'),
  [PLAYERS_QUEUE_OFF]: noArguments('cerrar la lista de jugadores'),
  [LOTTERY_START_COMMAND]: noArguments('iniciar el sorteo'),
  [LOTTERY_CLEAN_COMMAND]: noArguments('limpiar los participantes del sorteo'),
  [LOTTERY_REMOVE_COMMAND]: withArguments('quitar un usuario del sorteo', `${LOTTERY_REMOVE_COMMAND} usuario`),
  [LOTTERY_PAUSE_COMMAND]: noArguments('pausar el sorteo'),
  [LOTTERY_RESUME_COMMAND]: noArguments('reanudar el sorteo'),
  [START_STREAM_KEY]: withArguments(`iniciar el directo con ${BASE_STREAM_START_TIME_MIN} minutos de demora o programarle el tiempo manual`, `${START_STREAM_KEY} [minutos]`),
  [VIP_KEY]: withArguments('solicitar VIP', `${VIP_KEY} usuario`),
};

const addCommands = (commands: Map<string, string>, values: string[], permission: string) => {
  for (const command of values) {
    if (!commands.has(command)) commands.set(command, permission);
  }
};

export const getCommandDefinitions = () => {
  const commands = new Map<string, string>();
  addCommands(commands, Object.keys(MESSAGES_CONFIG), 'todos');
  addCommands(commands, USERS_ACTIONS_CONFIG, 'todos');
  addCommands(commands, VIP_ACTIONS_CONFIG, 'VIP o superior');
  addCommands(commands, MODS_ACTIONS_CONFIG, 'moderador o broadcaster');
  addCommands(commands, BROADCASTER_MESSAGES_CONFIG, 'broadcaster');
  return commands;
};

export const getCommandDescription = (command: string): CommandDescription => COMMAND_DESCRIPTIONS[command] || noArguments('comando disponible');

export const getCommandHelp = (command: string) => {
  const requestedCommand = command.trim() || HELP_COMMAND;
  const normalizedCommand = requestedCommand.toLowerCase().startsWith('!') ? requestedCommand.toLowerCase() : `!${requestedCommand.toLowerCase()}`;
  const permission = getCommandDefinitions().get(normalizedCommand);
  if (!permission) return `No conozco el comando ${normalizedCommand}. Usá ${HELP_COMMAND} para consultar un comando válido.`;

  const { description, usage } = getCommandDescription(normalizedCommand);
  return `${normalizedCommand}: ${description}; uso: ${usage}; permiso: ${permission}.`;
};
