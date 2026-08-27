import {
  BROADCASTER_MESSAGES_CONFIG,
  CHANGE_CHANNEL_INFORMATION_KEY,
  CHANGE_CHANNEL_INFORMATION_KEY_2,
  MESSAGES_CONFIG,
  MODS_ACTIONS_CONFIG,
  USERS_ACTIONS_CONFIG,
  VIP_ACTIONS_CONFIG,
} from './chat';

const COMMAND_DESCRIPTIONS: Record<string, string> = {
  [CHANGE_CHANNEL_INFORMATION_KEY]: 'cambiar categoría y opcionalmente título: !categoria juego / título',
  [CHANGE_CHANNEL_INFORMATION_KEY_2]: 'cambiar categoría y opcionalmente título: !game juego / título',
  '!tts': 'enviar texto a voz: !tts texto',
  '!agregar': 'agregar manualmente un usuario a la lista: !agregar usuario',
  '!mover': 'mover un usuario de la lista: !mover usuario',
  '!borrar': 'quitar un usuario de la lista: !borrar usuario',
};

const addCommands = (commands: Map<string, string>, values: string[], permission: string) => {
  for (const command of values) {
    if (!commands.has(command)) commands.set(command, permission);
  }
};

export const getAiCommandsGuide = () => {
  const commands = new Map<string, string>();

  addCommands(commands, Object.keys(MESSAGES_CONFIG), 'todos');
  addCommands(commands, USERS_ACTIONS_CONFIG, 'todos');
  addCommands(commands, VIP_ACTIONS_CONFIG, 'VIP o superior');
  addCommands(commands, MODS_ACTIONS_CONFIG, 'moderador o broadcaster');
  addCommands(commands, BROADCASTER_MESSAGES_CONFIG, 'broadcaster');

  return [...commands.entries()]
    .sort(([firstCommand], [secondCommand]) => firstCommand.localeCompare(secondCommand))
    .map(([command, permission]) => `- ${command}: ${COMMAND_DESCRIPTIONS[command] || 'sin argumentos especiales'}; permiso: ${permission}`)
    .join('\n');
};