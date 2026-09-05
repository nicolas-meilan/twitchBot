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
  [VALORANT_NICK_KEY]: noArguments('mostrar el nombre de usuario de Valorant del streamer'), 
  [VALORANT_ID_KEY]: noArguments('mostrar el nombre de usuario de Valorant del streamer'), 
  [PLATFORMS_KEY]: noArguments('mostrar los enlaces de las plataformas del streamer'), 
  [SOCIAL_NETWORKS_KEY]: noArguments('mostrar los enlaces de las redes sociales del streamer'), 
  [DISCORD_KEY]: noArguments('mostrar el enlace del Discord'), 
  [DISCORD_ALIAS_KEY]: noArguments('mostrar el enlace del Discord'), 
  [KICK_KEY]: noArguments('mostrar el enlace del canal de Kick'), 
  [YOUTUBE_KEY]: noArguments('mostrar el enlace de YouTube'), 
  [TIKTOK_KEY]: noArguments('mostrar el enlace de TikTok'), 
  [STEAM_KEY]: noArguments('mostrar el código de amigo de Steam'), 
  [SCHEDULE_KEY]: noArguments('mostrar los horarios habituales de stream'), 
  [LAUGHTER_KEY]: noArguments('enviar un mensaje de humor al chat'), 
  [APOLOGY_KEY]: noArguments('enviar un mensaje de disculpas al chat'), 
  [VALORANT_RANK_KEY]: withArguments('mostrar el rango actual de Valorant. Si se indica un usuario de LATAM, consultar ese usuario. Si no se indica usuario, consultar al streamer.', `${VALORANT_RANK_KEY} [usuario#tag]`), 
  [VALORANT_RANK_ALIAS_KEY]: withArguments('mostrar el rango actual de Valorant. Si se indica un usuario de LATAM, consultar ese usuario. Si no se indica usuario, consultar al streamer.', `${VALORANT_RANK_ALIAS_KEY} [usuario#tag]`), 
  [VALORANT_ELO_KEY]: withArguments('mostrar el rango actual de Valorant. Si se indica un usuario de LATAM, consultar ese usuario. Si no se indica usuario, consultar al streamer.', `${VALORANT_ELO_KEY} [usuario#tag]`), 
  [VALORANT_RANK_ALIAS_2_KEY]: withArguments('mostrar el rango actual de Valorant. Si se indica un usuario de LATAM, consultar ese usuario. Si no se indica usuario, consultar al streamer.', `${VALORANT_RANK_ALIAS_2_KEY} [usuario#tag]`), 
  [VALORANT_KEY]: withArguments('mostrar el rango actual de Valorant. Si se indica un usuario de LATAM, consultar ese usuario. Si no se indica usuario, consultar al streamer.', `${VALORANT_KEY} [usuario#tag]`), 
  [VALORANT_ID_ALIAS_KEY]: withArguments('mostrar el rango actual de Valorant. Si se indica un usuario de LATAM, consultar ese usuario. Si no se indica usuario, consultar al streamer.', `${VALORANT_ID_ALIAS_KEY} [usuario#tag]`), 
  [CROSSHAIR_KEY]: noArguments('mostrar la configuración de la mira del streamer'), 
  [LAST_RANKED_KEY]: withArguments('mostrar el resultado de la última partida ranked. Si se indica un usuario de LATAM, consultar ese usuario. Si no se indica usuario, consultar al streamer.', `${LAST_RANKED_KEY} [usuario#tag]`), 
  [LAST_RANKED_ALIAS_KEY]: withArguments('mostrar el resultado de la última partida ranked. Si se indica un usuario de LATAM, consultar ese usuario. Si no se indica usuario, consultar al streamer.', `${LAST_RANKED_ALIAS_KEY} [usuario#tag]`), 
  [LAST_RANKED_2_KEY]: withArguments('mostrar el resultado de la última partida ranked. Si se indica un usuario de LATAM, consultar ese usuario. Si no se indica usuario, consultar al streamer.', `${LAST_RANKED_2_KEY} [usuario#tag]`), 
  [COMMANDS_KEY]: noArguments('mostrar los comandos disponibles para todos los usuarios'), 
  [MOD_COMMANDS_KEY]: noArguments('mostrar los comandos disponibles para moderadores'), 
  [VIP_COMMANDS_KEY]: noArguments('mostrar los comandos disponibles para VIPs'), 
  [PLAYERS_LIST_KEY]: noArguments(`mostrar la lista de jugadores y sus prioridades. Beneficio de la lista: ${PLAYERS_QUEUE_PRIORITY_BENEFITS}`), 
  [PLAYERS_LIST_ALIAS_KEY]: noArguments(`mostrar la lista de jugadores y sus prioridades. Beneficio de la lista: ${PLAYERS_QUEUE_PRIORITY_BENEFITS}`), 
  [HOW_TO_PLAY_KEY]: noArguments(`mostrar cómo unirse a la partida. ${PLAYERS_QUEUE_PRIORITY_BENEFITS}`), 
  [JOKE_KEY]: noArguments('mostrar un chiste'), 
  [JOKE_ALIAS_KEY]: noArguments('mostrar un chiste'), 
  [FRIDGE_KEY]: withArguments('decir un chiste pasado de tono, sobre una heladera y carne con un nombre o nick', `${FRIDGE_KEY} usuario`), 
  [COMPUTER_KEY]: noArguments('mostrar las especificaciones de la computadora del streamer'), 
  [COMPUTER_ALIAS_KEY]: noArguments('mostrar las especificaciones de la computadora del streamer'), 
  [HELP_COMMAND]: withArguments('explicar el uso de un comando específico', `${HELP_COMMAND} !comando`), 
  [CREATE_CLIP_KEY]: noArguments('crear un clip del directo'), 
  [ADD_TO_PLAYERS_QUEUE_KEY]: noArguments(`sumar al usuario que lo solicita a la lista para jugar. ${PLAYERS_QUEUE_PRIORITY_BENEFITS}`), 
  [ADD_TO_PLAYERS_QUEUE_KEY_ALIAS]: noArguments(`sumar al usuario que lo solicita a la lista para jugar. ${PLAYERS_QUEUE_PRIORITY_BENEFITS}`), 
  [LEAVE_PLAYERS_QUEUE_KEY]: noArguments('sacar al usuario que lo solicita de la lista para jugar'), 
  [LOTTERY_COMMAND]: noArguments('participar del sorteo'), 
  [LOTTERY_STATUS_COMMAND]: noArguments('consultar si el usuario participa del sorteo'), 
  [LOTTERY_LIST_COMMAND]: noArguments('mostrar la cantidad de participantes del sorteo'), 
  [TTS_KEY]: withArguments('convertir un texto puntual a voz', `${TTS_KEY} texto`), 
  [FULL_TTS_ON_KEY]: noArguments('activar el modo TTS completo de la IA. Es diferente de !tts: hace que todas las respuestas de la IA salgan por voz sin límite de caracteres'), 
  [FULL_TTS_OFF_KEY]: noArguments('desactivar el modo TTS completo de la IA'), 
  [VALORANT_RANDOM_AGENT_KEY]: noArguments('elegir un agente aleatorio de Valorant'), 
  [CHANGE_CHANNEL_INFORMATION_KEY]: withArguments('cambiar la información del stream. La categoría y el título son obligatorios. Los tags son opcionales. El valor debe tener exactamente el formato CATEGORIA / TITULO / TAG1,TAG2,TAGX. Nunca usar solamente el título. Nunca poner los tags dentro del título. Si falta la categoría o el título, no ejecutar el comando.', `${CHANGE_CHANNEL_INFORMATION_KEY} CATEGORIA / TITULO / TAG1,TAG2,TAGX`), 
  [CHANGE_CHANNEL_INFORMATION_KEY_2]: withArguments('cambiar la información del stream. La categoría y el título son obligatorios. Los tags son opcionales. El valor debe tener exactamente el formato CATEGORIA / TITULO / TAG1,TAG2,TAGX. Nunca usar solamente el título. Nunca poner los tags dentro del título. Si falta la categoría o el título, no ejecutar el comando.', `${CHANGE_CHANNEL_INFORMATION_KEY_2} CATEGORIA / TITULO / TAG1,TAG2,TAGX`), 
  [TIMEOUT_KEY]: withArguments('silenciar temporalmente a un usuario. El usuario es obligatorio y la duración es opcional', `${TIMEOUT_KEY} usuario [duración]`), 
  [BAN_KEY]: withArguments('bloquear permanentemente a un usuario', `${BAN_KEY} usuario`), 
  [MOST_POPULAR_CLIP_KEY]: noArguments('mostrar el clip más popular del canal'), 
  [MOVE_PLAYER_FROM_QUEUE_KEY]: withArguments('mover un usuario dentro de la lista de jugadores', `${MOVE_PLAYER_FROM_QUEUE_KEY} usuario`), 
  [DELETE_PLAYER_FROM_QUEUE_KEY]: withArguments('quitar un usuario de la lista de jugadores', `${DELETE_PLAYER_FROM_QUEUE_KEY} usuario`), 
  [ADD_MANUALLY_TO_PLAYERS_QUEUE_KEY]: withArguments('agregar manualmente un usuario a la lista de jugadores. El indicador prioritario es opcional', `${ADD_MANUALLY_TO_PLAYERS_QUEUE_KEY} usuario [prioritario]`), 
  [CLEAN_PLAYERS_QUEUE_KEY]: noArguments('vaciar completamente la lista de jugadores'), 
  [PLAYERS_QUEUE_ON]: noArguments('abrir o activar la lista de jugadores'), 
  [PLAYERS_QUEUE_OFF]: noArguments('cerrar o desactivar la lista de jugadores'), 
  [LOTTERY_START_COMMAND]: noArguments('iniciar el sorteo'), 
  [LOTTERY_CLEAN_COMMAND]: noArguments('limpiar todos los participantes del sorteo'), 
  [LOTTERY_REMOVE_COMMAND]: withArguments('quitar un usuario específico del sorteo', `${LOTTERY_REMOVE_COMMAND} usuario`), 
  [LOTTERY_PAUSE_COMMAND]: noArguments('pausar el sorteo actual'), 
  [LOTTERY_RESUME_COMMAND]: noArguments('reanudar el sorteo pausado'), 
  [START_STREAM_KEY]: withArguments(`iniciar el directo con ${BASE_STREAM_START_TIME_MIN} minutos de demora o indicar manualmente la cantidad de minutos`, `${START_STREAM_KEY} [minutos]`), 
  [VIP_KEY]: withArguments('solicitar VIP para un usuario específico', `${VIP_KEY} usuario`), 
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
