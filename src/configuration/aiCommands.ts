import { PLAYERS_QUEUE_PRIORITY_BENEFITS } from './chat';
import gameQueue from '../services/GameQueue';
import { getCommandDefinitions, getCommandDescription } from './commandDescriptions';

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
  const priorityBenefits = gameQueue.getPriorityBenefitsDescription();
  const commands = getCommandDefinitions();

  return [...commands.entries()]
    .sort(([firstCommand], [secondCommand]) => firstCommand.localeCompare(secondCommand))
    .map(([command, permission]) => {
      const { description, usage } = getCommandDescription(command);
      const details = `${description}; uso: ${usage}`.replace(PLAYERS_QUEUE_PRIORITY_BENEFITS, priorityBenefits);
      return formatKnownCommandsForChat(`- ${formatCommandForChat(command)}: ${details}; permiso: ${permission}`, commands.keys());
    })
    .join('\n');
};
