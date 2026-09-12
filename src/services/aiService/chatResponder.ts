import tmi from 'tmi.js';

import { isAiFullTtsEnabled } from '../../actions/modActions';
import { userHasAccess } from '../../actions/userRoles';
import { executeCommand, getCommandRequiredRole } from '../../commandDispatcher';
import {
  ACTION_NOT_ALLOWED,
  AI_COMMAND_ERROR_MESSAGE,
  BROADCASTER_MESSAGES_CONFIG,
  MESSAGES_CONFIG,
  MODS_ACTIONS_CONFIG,
  TTS_KEY,
  USERS_ACTIONS_CONFIG,
  VIP_ACTIONS_CONFIG,
} from '../../configuration/chat';
import { sendEventTTS } from '../botEvents';
import logger from '../../utils/logger';
import { formatKnownCommandsForChat, splitChatMessage } from '../../utils/chatMessage';

import {
  AI_CONTENT_TO_PROTECT_PATTERN,
  AI_EXTERNAL_FIELD_PATTERN,
  AI_PROTECTED_CONTENT_PATTERN,
  AI_PROTECTED_CONTENT_TOKEN,
  BOT_USERNAME,
  getAiAccessDeniedMessage,
  getAiCommandCompletedMessage,
  translateAiExternalField,
} from './aiConfig';
import { AiResult } from './types';

export const AI_EXECUTABLE_COMMANDS = new Set([
  ...Object.keys(MESSAGES_CONFIG),
  ...USERS_ACTIONS_CONFIG,
  ...VIP_ACTIONS_CONFIG,
  ...MODS_ACTIONS_CONFIG,
  ...BROADCASTER_MESSAGES_CONFIG,
]);

export const formatAiResponseForChat = (message: string): string => (
  formatKnownCommandsForChat(message, AI_EXECUTABLE_COMMANDS)
);

export const createMentionedChat = (chat: tmi.Client, username: string): tmi.Client => new Proxy(chat, {
  get: (target, property, receiver) => {
    if (property !== 'say') return Reflect.get(target, property, receiver);
    return (channel: string, message: string) => target.say(channel, `@${username}, ${formatAiResponseForChat(message)}`);
  },
});

export const sayAi = (chat: tmi.Client, channel: string, username: string, response: string): void => {
  const formattedResponse = formatAiResponseForChat(response);
  logger.info(`AI response: ${formattedResponse}`);
  chat.say(channel, `@${username}, ${formattedResponse}`);

  if (isAiFullTtsEnabled()) sendEventTTS(formattedResponse, BOT_USERNAME, true);
};

export const sendAiAnswer = (chat: tmi.Client, channel: string, username: string, answer: string): void => {
  const protectedContent: string[] = [];
  const translatedAnswer = answer
    .replace(AI_CONTENT_TO_PROTECT_PATTERN, (value) => {
      protectedContent.push(value);
      return `${AI_PROTECTED_CONTENT_TOKEN}${protectedContent.length - 1}__`;
    })
    .replace(AI_EXTERNAL_FIELD_PATTERN, translateAiExternalField)
    .replace(AI_PROTECTED_CONTENT_PATTERN, (_match, index) => protectedContent[Number(index)] || '');

  logger.info(`AI answer: ${translatedAnswer}`);
  for (const message of splitChatMessage(translatedAnswer)) sayAi(chat, channel, username, message);
};

export const executeAiCommand = async (
  chat: tmi.Client,
  mentionedChat: tmi.Client,
  channel: string,
  tags: tmi.ChatUserstate,
  username: string,
  result: AiResult,
): Promise<void> => {
  const command = result.command!.name;
  const value = result.command!.value;

  if (!AI_EXECUTABLE_COMMANDS.has(command) || !command.startsWith('!')) {
    sayAi(chat, channel, username, AI_COMMAND_ERROR_MESSAGE);
    return;
  }

  const requiredRole = getCommandRequiredRole(command);
  if (requiredRole && !userHasAccess(tags, requiredRole)) {
    sayAi(chat, channel, username, getAiAccessDeniedMessage(ACTION_NOT_ALLOWED, requiredRole, command));
    logger.info(`AI command rejected for permissions: ${command}`);
    return;
  }

  const isTts = command === TTS_KEY;
  if (!(isTts && isAiFullTtsEnabled())) {
    await executeCommand({
      chat: mentionedChat,
      channel,
      tags,
      command,
      value,
      ttsUser: isTts ? BOT_USERNAME : undefined,
    });
  }

  logger.info(`AI command processed: ${command}`);
  if (result.answer) {
    sendAiAnswer(chat, channel, username, result.answer);
  } else if (command !== '!game' && command !== '!categoria') {
    sayAi(chat, channel, username, getAiCommandCompletedMessage(command));
  }
};
