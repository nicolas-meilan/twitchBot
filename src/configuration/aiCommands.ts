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
  CHANGE_CHANNEL_INFORMATION_KEY,
  CHANGE_CHANNEL_INFORMATION_KEY_2,
  DELETE_PLAYER_FROM_QUEUE_KEY,
  KICK_KEY,
  LEAVE_PLAYERS_QUEUE_KEY,
  MESSAGES_CONFIG,
  MODS_ACTIONS_CONFIG,
  MOVE_PLAYER_FROM_QUEUE_KEY,
  PLAYERS_QUEUE_OFF,
  PLAYERS_QUEUE_ON,
  TTS_KEY,
  TIMEOUT_KEY,
  USERS_ACTIONS_CONFIG,
  VIP_ACTIONS_CONFIG,
} from './chat';

const COMMAND_DESCRIPTIONS: Record<string, string> = {
  [CHANGE_CHANNEL_INFORMATION_KEY]: AI_COMMAND_DESCRIPTION_GAME,
  [CHANGE_CHANNEL_INFORMATION_KEY_2]: AI_COMMAND_DESCRIPTION_GAME_ALIAS,
  [TTS_KEY]: AI_COMMAND_DESCRIPTION_TTS,
  [TIMEOUT_KEY]: AI_COMMAND_DESCRIPTION_TIMEOUT,
  [BAN_KEY]: AI_COMMAND_DESCRIPTION_BAN,
  [KICK_KEY]: AI_COMMAND_DESCRIPTION_KICK,
  [ADD_TO_PLAYERS_QUEUE_KEY]: AI_COMMAND_DESCRIPTION_JOIN,
  [ADD_TO_PLAYERS_QUEUE_KEY_ALIAS]: AI_COMMAND_DESCRIPTION_JOIN,
  [LEAVE_PLAYERS_QUEUE_KEY]: AI_COMMAND_DESCRIPTION_LEAVE,
  [PLAYERS_QUEUE_ON]: AI_COMMAND_DESCRIPTION_PLAYERS,
  [PLAYERS_QUEUE_OFF]: AI_COMMAND_DESCRIPTION_PLAYERS,
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
const formatGuideTextForChat = (text: string) => text.replace(/(?<!\()!\s*([a-zA-Z][\w-]*)/g, '(!$1)');

export const getAiCommandsGuide = () => {
  const commands = new Map<string, string>();

  addCommands(commands, Object.keys(MESSAGES_CONFIG), 'todos');
  addCommands(commands, USERS_ACTIONS_CONFIG, 'todos');
  addCommands(commands, VIP_ACTIONS_CONFIG, 'VIP o superior');
  addCommands(commands, MODS_ACTIONS_CONFIG, 'moderador o broadcaster');
  addCommands(commands, BROADCASTER_MESSAGES_CONFIG, 'broadcaster');

  return [...commands.entries()]
    .sort(([firstCommand], [secondCommand]) => firstCommand.localeCompare(secondCommand))
    .map(([command, permission]) => formatGuideTextForChat(`- ${formatCommandForChat(command)}: ${COMMAND_DESCRIPTIONS[command] || 'sin argumentos especiales'}; permiso: ${permission}`))
    .join('\n');
};