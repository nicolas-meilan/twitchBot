import { COMMANDS_SEPARATOR } from '../configuration/chat';

const TWITCH_CHAT_MESSAGE_MAX_LENGTH = 400;

export const splitChatMessage = (message: string): string[] => {
  const commandParts = message.split(COMMANDS_SEPARATOR);
  if (commandParts.length === 1) return [message];

  const messages: string[] = [];
  let currentMessage = commandParts[0] || '';

  for (const commandPart of commandParts.slice(1)) {
    const nextMessage = currentMessage
      ? `${currentMessage}${COMMANDS_SEPARATOR}${commandPart}`
      : `${COMMANDS_SEPARATOR} ${commandPart}`;

    if ([...nextMessage].length <= TWITCH_CHAT_MESSAGE_MAX_LENGTH) {
      currentMessage = nextMessage;
      continue;
    }

    if (currentMessage) messages.push(currentMessage);
    currentMessage = `${COMMANDS_SEPARATOR} ${commandPart}`;
  }

  if (currentMessage) messages.push(currentMessage);
  return messages;
};

export const formatKnownCommandsForChat = (text: string, commands: Iterable<string>): string => {
  const commandNames = [...commands]
    .sort((firstCommand, secondCommand) => secondCommand.length - firstCommand.length)
    .map((command) => command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  if (!commandNames) return text;

  return text.replace(new RegExp(`(?<!\\()(${commandNames})(?![\\w-])`, 'gi'), '($1)');
};
