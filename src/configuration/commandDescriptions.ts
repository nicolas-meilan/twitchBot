import { DEFAULT_VALORANT_TAG, DEFAULT_VALORANT_USERNAME } from '../services/valorant';
import { BASE_STREAM_START_TIME_MIN } from './botEvents';
import {
  ADD_MANUALLY_TO_PLAYERS_QUEUE_KEY,
  ADD_COMMAND_KEY,
  REMOVE_COMMAND_KEY,
  ADD_TO_PLAYERS_QUEUE_KEY,
  ADD_TO_PLAYERS_QUEUE_KEY_ALIAS,
  BAN_KEY,
  AI_EXTERNAL_INFORMATION_OFF_KEY,
  AI_EXTERNAL_INFORMATION_ON_KEY,
  BOT_MESSAGES_CONFIG,
  BROADCASTER_MESSAGES_CONFIG,
  CHANGE_CHANNEL_INFORMATION_KEY,
  CHANGE_CHANNEL_INFORMATION_KEY_2,
  CLEAN_PLAYERS_QUEUE_KEY,
  COMMANDS_KEY,
  CREATE_CLIP_KEY,
  DELETE_PLAYER_FROM_QUEUE_KEY,
  HELP_COMMAND,
  JOKE_ALIAS_KEY,
  JOKE_KEY,
  MOD_COMMANDS_KEY,
  PLAYERS_LIST_ALIAS_KEY,
  PLAYERS_LIST_KEY,
  PLAYERS_QUEUE_PRIORITY_BENEFITS,
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
  MODS_ACTIONS_CONFIG,
  MOST_POPULAR_CLIP_KEY,
  MOVE_PLAYER_FROM_QUEUE_KEY,
  PLAYERS_QUEUE_OFF,
  PLAYERS_QUEUE_ON,
  START_STREAM_KEY,
  TIMEOUT_KEY,
  TTS_KEY,
  FULL_TTS_ON_KEY,
  FULL_TTS_OFF_KEY,
  USERS_ACTIONS_CONFIG,
  VALORANT_ELO_KEY,
  VALORANT_ID_ALIAS_KEY,
  VALORANT_KEY,
  VALORANT_RANK_ALIAS_2_KEY,
  VALORANT_RANK_ALIAS_KEY,
  VALORANT_RANK_KEY,
  VALORANT_RANDOM_AGENT_KEY,
  VIP_ACTIONS_CONFIG,
  VIP_COMMANDS_KEY,
  VIP_KEY,
  LAST_RANKED_2_KEY,
} from './chat';
import {
  getChatCommand,
  getChatCommandAliases,
  getConfiguredChatCommandOwnerTwitchId,
} from '../db/chatCommands';

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
  [VALORANT_RANK_KEY]: withArguments(`mostrar únicamente el rango ACTUAL de Valorant; no ofrece historial, evolución, rango mínimo, rango máximo ni estadísticas acumuladas. Acepta un usuario#tag de LATAM; si no se indica, consulta al streamer (por defecto: ${DEFAULT_VALORANT_USERNAME}#${DEFAULT_VALORANT_TAG})`, `${VALORANT_RANK_KEY} [usuario#tag]`),    
  [VALORANT_RANK_ALIAS_KEY]: withArguments(`mostrar únicamente el rango ACTUAL de Valorant; no ofrece historial, evolución, rango mínimo, rango máximo ni estadísticas acumuladas. Acepta un usuario#tag de LATAM; si no se indica, consulta al streamer (por defecto: ${DEFAULT_VALORANT_USERNAME}#${DEFAULT_VALORANT_TAG})`, `${VALORANT_RANK_ALIAS_KEY} [usuario#tag]`),    
  [VALORANT_ELO_KEY]: withArguments(`mostrar únicamente el rango ACTUAL de Valorant; no ofrece historial, evolución, rango mínimo, rango máximo ni estadísticas acumuladas. Acepta un usuario#tag de LATAM; si no se indica, consulta al streamer (por defecto: ${DEFAULT_VALORANT_USERNAME}#${DEFAULT_VALORANT_TAG})`, `${VALORANT_ELO_KEY} [usuario#tag]`),    
  [VALORANT_RANK_ALIAS_2_KEY]: withArguments(`mostrar únicamente el rango ACTUAL de Valorant; no ofrece historial, evolución, rango mínimo, rango máximo ni estadísticas acumuladas. Acepta un usuario#tag de LATAM; si no se indica, consulta al streamer (por defecto: ${DEFAULT_VALORANT_USERNAME}#${DEFAULT_VALORANT_TAG})`, `${VALORANT_RANK_ALIAS_2_KEY} [usuario#tag]`),    
  [VALORANT_KEY]: withArguments(`mostrar únicamente el rango ACTUAL de Valorant; no ofrece historial, evolución, rango mínimo, rango máximo ni estadísticas acumuladas. Acepta un usuario#tag de LATAM; si no se indica, consulta al streamer (por defecto: ${DEFAULT_VALORANT_USERNAME}#${DEFAULT_VALORANT_TAG})`, `${VALORANT_KEY} [usuario#tag]`),    
  [VALORANT_ID_ALIAS_KEY]: withArguments(`mostrar únicamente el rango ACTUAL de Valorant; no ofrece historial, evolución, rango mínimo, rango máximo ni estadísticas acumuladas. Acepta un usuario#tag de LATAM; si no se indica, consulta al streamer (por defecto: ${DEFAULT_VALORANT_USERNAME}#${DEFAULT_VALORANT_TAG})`, `${VALORANT_ID_ALIAS_KEY} [usuario#tag]`),    
  [LAST_RANKED_KEY]: withArguments(`mostrar únicamente el resultado de la última partida de Valorant (Busca la última Ranked); no ofrece historial ni estadísticas acumuladas. Acepta un usuario#tag de LATAM; si no se indica, consulta al streamer (por defecto: ${DEFAULT_VALORANT_USERNAME}#${DEFAULT_VALORANT_TAG})`, `${LAST_RANKED_KEY} [usuario#tag]`),    
  [LAST_RANKED_ALIAS_KEY]: withArguments(`mostrar únicamente el resultado de la última partida de Valorant (Busca la última Ranked); no ofrece historial ni estadísticas acumuladas. Acepta un usuario#tag de LATAM; si no se indica, consulta al streamer (por defecto: ${DEFAULT_VALORANT_USERNAME}#${DEFAULT_VALORANT_TAG})`, `${LAST_RANKED_ALIAS_KEY} [usuario#tag]`),  
  [LAST_RANKED_2_KEY]: withArguments(`mostrar únicamente el resultado de la última partida de Valorant (Busca la última Ranked); no ofrece historial ni estadísticas acumuladas. Acepta un usuario#tag de LATAM; si no se indica, consulta al streamer (por defecto: ${DEFAULT_VALORANT_USERNAME}#${DEFAULT_VALORANT_TAG})`, `${LAST_RANKED_2_KEY} [usuario#tag]`),  
  [LAST_GAME_KEY]: withArguments(`mostrar únicamente el resultado de la última partida de Valorant (Busca la última Ranked); no ofrece historial ni estadísticas acumuladas. Acepta un usuario#tag de LATAM; si no se indica, consulta al streamer (por defecto: ${DEFAULT_VALORANT_USERNAME}#${DEFAULT_VALORANT_TAG})`, `${LAST_GAME_KEY} [usuario#tag]`),  
  [FRIDGE_KEY]: withArguments('decir un chiste pasado de tono sobre una heladera y carne usando un username o nick', `${FRIDGE_KEY} usuario`),    
  [HELP_COMMAND]: withArguments('mostrar la descripción y forma de uso de un comando específico', `${HELP_COMMAND} !comando`),    
  [COMMANDS_KEY]: noArguments('mostrar los comandos disponibles para todos los usuarios'),
  [MOD_COMMANDS_KEY]: noArguments('mostrar los comandos disponibles para moderadores'),
  [VIP_COMMANDS_KEY]: noArguments('mostrar los comandos disponibles para VIPs'),
  [PLAYERS_LIST_KEY]: noArguments(`mostrar la lista de jugadores y sus prioridades. Beneficio de la lista: ${PLAYERS_QUEUE_PRIORITY_BENEFITS}`),
  [PLAYERS_LIST_ALIAS_KEY]: noArguments(`mostrar la lista de jugadores y sus prioridades. Beneficio de la lista: ${PLAYERS_QUEUE_PRIORITY_BENEFITS}`),
  [JOKE_KEY]: noArguments('mostrar un chiste'),
  [JOKE_ALIAS_KEY]: noArguments('mostrar un chiste'),
  [ADD_COMMAND_KEY]: withArguments(
    'agregar un comando de texto con uno o varios alias. Separá los alias y la respuesta con /; indicá la descripción con /description:',
    `${ADD_COMMAND_KEY} !comando [!alias ...] / respuesta /description: descripción`,
  ),
  [REMOVE_COMMAND_KEY]: withArguments(
    'eliminar un alias de comando de texto. Si era el último alias asociado a la respuesta, también se elimina esa respuesta',
    `${REMOVE_COMMAND_KEY} !alias`,
  ),
  [CREATE_CLIP_KEY]: noArguments('crear un clip del directo'),    
  [ADD_TO_PLAYERS_QUEUE_KEY]: noArguments(`sumar al usuario que lo solicita a la lista para jugar. Beneficio de la lista: ${PLAYERS_QUEUE_PRIORITY_BENEFITS}`),    
  [ADD_TO_PLAYERS_QUEUE_KEY_ALIAS]: noArguments(`sumar al usuario que lo solicita a la lista para jugar. Beneficio de la lista: ${PLAYERS_QUEUE_PRIORITY_BENEFITS}`),    
  [LEAVE_PLAYERS_QUEUE_KEY]: noArguments('sacar al usuario que lo solicita de la lista para jugar'),    
  [LOTTERY_COMMAND]: noArguments('participar del sorteo'),    
  [LOTTERY_STATUS_COMMAND]: noArguments('consultar si el usuario participa del sorteo'),    
  [LOTTERY_LIST_COMMAND]: noArguments('mostrar la cantidad de participantes del sorteo'),    
  [TTS_KEY]: withArguments('convertir un texto puntual a voz', `${TTS_KEY} texto`),    
  [FULL_TTS_ON_KEY]: noArguments('activar el modo TTS completo de la IA. Hace que todas las respuestas de la IA salgan por voz sin límite de caracteres'),    
  [FULL_TTS_OFF_KEY]: noArguments('desactivar el modo TTS completo de la IA'),    
  [AI_EXTERNAL_INFORMATION_ON_KEY]: noArguments('activar información externa / fuentes externas de la IA'),
  [AI_EXTERNAL_INFORMATION_OFF_KEY]: noArguments('desactivar información externa / fuentes externas de la IA'),
  [VALORANT_RANDOM_AGENT_KEY]: noArguments('elegir un agente aleatorio de Valorant'),    
  [CHANGE_CHANNEL_INFORMATION_KEY]: withArguments('cambiar la categoría, título y tags del stream. Categoría obligatoria en texto plano; título y tags opcionales. Si faltan, usa los valores por defecto. Máximo 140 caracteres en título y 10 tags de hasta 25 caracteres, separados por comas, sin # ni símbolos. El tag twitch esta prohibido..', `${CHANGE_CHANNEL_INFORMATION_KEY} [CATEGORIA] [/ TITULO] [/ TAG1,TAG2,TAGX]`),     
  [CHANGE_CHANNEL_INFORMATION_KEY_2]: withArguments('cambiar la categoría, título y tags del stream. Categoría obligatoria en texto plano; título y tags opcionales. Si faltan, usa los valores por defecto. Máximo 140 caracteres en título y 10 tags de hasta 25 caracteres, separados por comas, sin # ni símbolos. El tag twitch esta prohibido..', `${CHANGE_CHANNEL_INFORMATION_KEY_2} [CATEGORIA] [/ TITULO] [/ TAG1,TAG2,TAGX]`),   
  [TIMEOUT_KEY]: withArguments('silenciar temporalmente a un usuario. Acepta un usuario y una duración opcional', `${TIMEOUT_KEY} usuario [duración]`),    
  [BAN_KEY]: withArguments('bloquear permanentemente a un usuario', `${BAN_KEY} usuario`),    
  [MOST_POPULAR_CLIP_KEY]: noArguments('mostrar el clip más popular del canal'),    
  [MOVE_PLAYER_FROM_QUEUE_KEY]: withArguments('mover un usuario a otra posición dentro de la lista de jugadores', `${MOVE_PLAYER_FROM_QUEUE_KEY} usuario`),    
  [DELETE_PLAYER_FROM_QUEUE_KEY]: withArguments('quitar un usuario de la lista de jugadores', `${DELETE_PLAYER_FROM_QUEUE_KEY} usuario`),    
  [ADD_MANUALLY_TO_PLAYERS_QUEUE_KEY]: withArguments('agregar manualmente un usuario a la lista de jugadores. Acepta un indicador prioritario opcional', `${ADD_MANUALLY_TO_PLAYERS_QUEUE_KEY} usuario [prioritario]`),    
  [CLEAN_PLAYERS_QUEUE_KEY]: noArguments('vaciar completamente la lista de jugadores'),    
  [PLAYERS_QUEUE_ON]: noArguments('abrir o activar la lista de jugadores'),    
  [PLAYERS_QUEUE_OFF]: noArguments('cerrar o desactivar la lista de jugadores'),    
  [LOTTERY_START_COMMAND]: noArguments('iniciar el sorteo'),    
  [LOTTERY_CLEAN_COMMAND]: noArguments('limpiar todos los participantes del sorteo'),    
  [LOTTERY_REMOVE_COMMAND]: withArguments('quitar un usuario específico del sorteo', `${LOTTERY_REMOVE_COMMAND} usuario`),    
  [LOTTERY_PAUSE_COMMAND]: noArguments('pausar el sorteo actual'),    
  [LOTTERY_RESUME_COMMAND]: noArguments('reanudar el sorteo pausado'),    
  [START_STREAM_KEY]: withArguments(`iniciar el directo con ${BASE_STREAM_START_TIME_MIN} minutos de demora. Acepta una cantidad de minutos opcional`, `${START_STREAM_KEY} [minutos]`),    
  [VIP_KEY]: withArguments('solicitar VIP para un usuario específico', `${VIP_KEY} usuario`),    
};

const addCommands = (commands: Map<string, string>, values: string[], permission: string) => {
  for (const command of values) {
    if (!commands.has(command)) commands.set(command, permission);
  }
};

export const getCommandDefinitions = (userId = getConfiguredChatCommandOwnerTwitchId()) => {
  const commands = new Map<string, string>();
  addCommands(commands, getChatCommandAliases(userId), 'todos');
  addCommands(commands, USERS_ACTIONS_CONFIG, 'todos');
  addCommands(commands, VIP_ACTIONS_CONFIG, 'VIP o superior');
  addCommands(commands, MODS_ACTIONS_CONFIG, 'moderador o broadcaster');
  addCommands(commands, BOT_MESSAGES_CONFIG, 'bot o broadcaster');
  addCommands(commands, BROADCASTER_MESSAGES_CONFIG, 'broadcaster');
  return commands;
};

export const getCommandDescription = (
  command: string,
  userId = getConfiguredChatCommandOwnerTwitchId(),
): CommandDescription => {
  const chatCommand = getChatCommand(userId, command);
  if (chatCommand) {
    const description = {
      description: chatCommand.description,
      usage: chatCommand.aliases.map((alias) => `!${alias}`).join(' | '),
    };
    COMMAND_DESCRIPTIONS[command] = description;
    return description;
  }

  return COMMAND_DESCRIPTIONS[command] || noArguments('comando integrado');
};

export const getCommandHelp = (command: string) => {
  const requestedCommand = command.trim() || HELP_COMMAND;
  const normalizedCommand = requestedCommand.toLowerCase().startsWith('!') ? requestedCommand.toLowerCase() : `!${requestedCommand.toLowerCase()}`;
  const userId = getConfiguredChatCommandOwnerTwitchId();
  const permission = getCommandDefinitions(userId).get(normalizedCommand);
  if (!permission) return `No conozco el comando ${normalizedCommand}. Usá ${HELP_COMMAND} para consultar un comando válido.`;

  const { description, usage } = getCommandDescription(normalizedCommand, userId);
  return `${normalizedCommand}: ${description}; uso: ${usage}; permiso: ${permission}.`;
};
