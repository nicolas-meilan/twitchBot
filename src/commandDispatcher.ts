import tmi from 'tmi.js';

import logger from './utils/logger';

import { splitChatMessage } from './utils/chatMessage';

import { UserRole, userHasAccess } from './actions/userRoles';

import MOD_ACTIONS from './actions/modActions';

import USER_ACTIONS from './actions/userActions';

import VIP_ACTIONS from './actions/vipActions';

import BROADCASTER_ACTIONS from './actions/broadcasterActions';

import CHAT_KEY_ACTIONS from './actions/chatKeyActions';

import {
  ACTION_NOT_ALLOWED,
  BROADCASTER_MESSAGES_CONFIG,
  KEY_DELIMITER,
  MESSAGES_CONFIG,
  MODS_ACTIONS_CONFIG,
  RESPONSES_KEYS,
  USERS_ACTIONS_CONFIG,
  VIP_ACTIONS_CONFIG,
} from './configuration/chat';

export type ExecuteCommandParams = {
  chat: tmi.Client;
  channel: string;
  tags: tmi.ChatUserstate;
  command: string;
  value: string;
  ttsUser?: string;
};

export const getCommandRequiredRole = (command: string): UserRole | undefined => {
  if (VIP_ACTIONS_CONFIG.includes(command)) return UserRole.VIP;
  if (MODS_ACTIONS_CONFIG.includes(command)) return UserRole.MOD;
  if (BROADCASTER_MESSAGES_CONFIG.includes(command)) return UserRole.BROADCASTER;
  return undefined;
};

export const parseCommandMessage = (message: string): { command: string; value: string } => {
  const originalCommand = message.split(' ')[0]?.trim() || '';
  const command = originalCommand.toLowerCase();
  const value = message.replace(originalCommand, '').trim();

  return { command, value };
};

const resolveMessageResponse = async (message: string): Promise<string | undefined> => {
  try {
    if (!message) return;

    const key = message.split(KEY_DELIMITER)?.[1];
    const formattedKey = `${KEY_DELIMITER}${key}${KEY_DELIMITER}`;

    if (!RESPONSES_KEYS.includes(formattedKey)) return message;

    const keyValue = await (CHAT_KEY_ACTIONS[formattedKey]!)();

    return message.replace(formattedKey, keyValue);
  } catch {
    logger.error(`Error processing the message: ${message}`);
  }
};

export const executeCommand = async ({ chat, channel, tags, command, value, ttsUser }: ExecuteCommandParams): Promise<void> => {
  if (USERS_ACTIONS_CONFIG.includes(command)) {
    await USER_ACTIONS[command as keyof typeof USER_ACTIONS]({
      chat,
      value,
      username: tags.username,
      ttsUser,
      tags,
    });

    return;
  }

  if (VIP_ACTIONS_CONFIG.includes(command)) {
    if (!userHasAccess(tags, UserRole.VIP)) {
      chat.say(channel, ACTION_NOT_ALLOWED);
      logger.info(`BOT: ${ACTION_NOT_ALLOWED}`);
      return;
    }

    await VIP_ACTIONS[command as keyof typeof VIP_ACTIONS]({
      chat,
      value,
      username: tags.username,
      ttsUser,
      tags,
    });

    return;
  }

  if (MODS_ACTIONS_CONFIG.includes(command)) {
    if (!userHasAccess(tags, UserRole.MOD)) {
      chat.say(channel, ACTION_NOT_ALLOWED);
      logger.info(`BOT: ${ACTION_NOT_ALLOWED}`);
      return;
    }

    await MOD_ACTIONS[command as keyof typeof MOD_ACTIONS]({
      chat,
      value,
      username: tags.username,
      ttsUser,
      tags,
    });

    return;
  }

  if (BROADCASTER_MESSAGES_CONFIG.includes(command)) {
    if (!userHasAccess(tags, UserRole.BROADCASTER)) {
      chat.say(channel, ACTION_NOT_ALLOWED);
      logger.info(`BOT: ${ACTION_NOT_ALLOWED}`);
      return;
    }

    await BROADCASTER_ACTIONS[command as keyof typeof BROADCASTER_ACTIONS]({
      chat,
      value,
    });

    return;
  }

  const currentMessageResponse = MESSAGES_CONFIG[command] || '';
  const formattedResponse = await resolveMessageResponse(currentMessageResponse.trim());

  if (!formattedResponse) return;

  logger.info(`BOT: ${formattedResponse}`);

  for (const message of splitChatMessage(formattedResponse)) {
    chat.say(channel, message);
  }
};
