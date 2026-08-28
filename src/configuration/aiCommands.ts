import {
  BROADCASTER_MESSAGES_CONFIG,
  BAN_KEY,
  ADD_MANUALLY_TO_PLAYERS_QUEUE_KEY,
  ADD_TO_PLAYERS_QUEUE_KEY,
  ADD_TO_PLAYERS_QUEUE_KEY_ALIAS,
  AI_COMMAND_DESCRIPTION_ADD,
  AI_COMMAND_DESCRIPTION_DELETE,
  AI_COMMAND_DESCRIPTION_GAME,
  AI_COMMAND_DESCRIPTION_GAME_ALIAS,
  AI_COMMAND_DESCRIPTION_JOIN,
  AI_COMMAND_DESCRIPTION_KICK,
  AI_COMMAND_DESCRIPTION_LEAVE,
  AI_COMMAND_DESCRIPTION_MOVE,
  AI_COMMAND_DESCRIPTION_PLAYERS,
  AI_COMMAND_DESCRIPTION_TIMEOUT,
  AI_COMMAND_DESCRIPTION_TTS,
  AI_COMMAND_DESCRIPTION_BAN,
  AI_COMMAND_DESCRIPTION_START_STREAM,
  AI_QUEUE_PRIORITY_BENEFITS,
  CHANGE_CHANNEL_INFORMATION_KEY,
  CHANGE_CHANNEL_INFORMATION_KEY_2,
  DELETE_PLAYER_FROM_QUEUE_KEY,
  KICK_KEY,
  LEAVE_PLAYERS_QUEUE_KEY,
  MESSAGES_CONFIG,
  MODS_ACTIONS_CONFIG,
  MOVE_PLAYER_FROM_QUEUE_KEY,
  PLAYERS_LIST_ALIAS_KEY,
  PLAYERS_LIST_KEY,
  START_STREAM_KEY,
  TTS_KEY,
  TIMEOUT_KEY,
  USERS_ACTIONS_CONFIG,
  VIP_ACTIONS_CONFIG,
} from './chat';
import gameQueue from '../services/GameQueue';

const COMMAND_DESCRIPTIONS: Record<string, string> = {
  [CHANGE_CHANNEL_INFORMATION_KEY]: AI_COMMAND_DESCRIPTION_GAME,
  [CHANGE_CHANNEL_INFORMATION_KEY_2]: AI_COMMAND_DESCRIPTION_GAME_ALIAS,
  [TTS_KEY]: AI_COMMAND_DESCRIPTION_TTS,
  [TIMEOUT_KEY]: AI_COMMAND_DESCRIPTION_TIMEOUT,
  [BAN_KEY]: AI_COMMAND_DESCRIPTION_BAN,
  [START_STREAM_KEY]: AI_COMMAND_DESCRIPTION_START_STREAM,
  [KICK_KEY]: AI_COMMAND_DESCRIPTION_KICK,
  [ADD_TO_PLAYERS_QUEUE_KEY]: `${AI_COMMAND_DESCRIPTION_JOIN}. ${AI_QUEUE_PRIORITY_BENEFITS}`,
  [ADD_TO_PLAYERS_QUEUE_KEY_ALIAS]: `${AI_COMMAND_DESCRIPTION_JOIN}. ${AI_QUEUE_PRIORITY_BENEFITS}`,
  [LEAVE_PLAYERS_QUEUE_KEY]: AI_COMMAND_DESCRIPTION_LEAVE,
  [PLAYERS_LIST_KEY]: `${AI_COMMAND_DESCRIPTION_PLAYERS}. ${AI_QUEUE_PRIORITY_BENEFITS}`,
  [PLAYERS_LIST_ALIAS_KEY]: `${AI_COMMAND_DESCRIPTION_PLAYERS}. ${AI_QUEUE_PRIORITY_BENEFITS}`,
  [ADD_MANUALLY_TO_PLAYERS_QUEUE_KEY]: AI_COMMAND_DESCRIPTION_ADD,
  [MOVE_PLAYER_FROM_QUEUE_KEY]: AI_COMMAND_DESCRIPTION_MOVE,
  [DELETE_PLAYER_FROM_QUEUE_KEY]: AI_COMMAND_DESCRIPTION_DELETE,
};

const addCommands = (commands: Map<string, string>, values: string[], permission: string) => {
  for (const command of values) {
    if (!commands.has(command)) commands.set(command, permission);
  }
};

const formatCommandForChat = (command: string) => `(${command})`;

export const formatKnownCommandsForChat = (text: string, commands: Iterable<string>) => {
  const commandNames = [...commands]
    .sort((firstCommand, secondCommand) => secondCommand.length - firstCommand.length)
    .map((command) => command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  if (!commandNames) return text;

  return text.replace(new RegExp(`(?<!\\()(${commandNames})(?![\\w-])`, 'gi'), '($1)');
};

export const getAiCommandsGuide = () => {
  const commands = new Map<string, string>();
  const priorityBenefits = gameQueue.getPriorityBenefitsDescription();

  addCommands(commands, Object.keys(MESSAGES_CONFIG), 'todos');
  addCommands(commands, USERS_ACTIONS_CONFIG, 'todos');
  addCommands(commands, VIP_ACTIONS_CONFIG, 'VIP o superior');
  addCommands(commands, MODS_ACTIONS_CONFIG, 'moderador o broadcaster');
  addCommands(commands, BROADCASTER_MESSAGES_CONFIG, 'broadcaster');

  return [...commands.entries()]
    .sort(([firstCommand], [secondCommand]) => firstCommand.localeCompare(secondCommand))
    .map(([command, permission]) => formatKnownCommandsForChat(`- ${formatCommandForChat(command)}: ${(COMMAND_DESCRIPTIONS[command] || 'sin argumentos especiales').replace(AI_QUEUE_PRIORITY_BENEFITS, priorityBenefits)}; permiso: ${permission}`, commands.keys()))
    .join('\n');
};

