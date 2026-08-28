import tmi from 'tmi.js';

import TwitchChatService, { OnNewMessage } from './services/twitch/TwitchChatService';
import connectToEvents from './services/twitch/events';
import logger from './utils/logger';
import { random } from './utils/numbers';
import Stream from './Stream';
import MOD_ACTIONS from './actions/modActions';
import CHAT_KEY_ACTIONS from './actions/chatKeyActions';
import { UserRole, userHasAccess } from './actions/userRoles';
import { unvipExpiredRequests } from './utils/unvip';

import {
  MESSAGES_CONFIG,
  RESPONSES_KEYS,
  KEY_DELIMITER,
  MODS_ACTIONS_CONFIG,
  ACTION_NOT_ALLOWED,
  FOLLOW_SPAM_MESSAGES,
  PRIME_SPAM_MESSAGES,
  BROADCASTER_MESSAGES_CONFIG,
  USERS_ACTIONS_CONFIG,
  VIP_ACTIONS_CONFIG,
  COMMANDS_SEPARATOR,
  AI_COMMAND_ERROR_MESSAGE,
  AI_NO_RESPONSE_MESSAGE,
  STRING_PARAM,
  VALORANT_ELO_KEY,
  VALORANT_ID_ALIAS_KEY,
  VALORANT_KEY,
  VALORANT_LAST_RANKED_RESPONSE_KEY,
  VALORANT_RANK_ALIAS_2_KEY,
  VALORANT_RANK_ALIAS_KEY,
  VALORANT_RANK_KEY,
  VALORANT_RANK_RESPONSE_KEY,
  LAST_GAME_KEY,
  LAST_RANKED_ALIAS_KEY,
  LAST_RANKED_KEY,
  VALORANT_INVALID_TAG_MESSAGE,
  VALORANT_LOOKUP_ERROR_MESSAGE,
  VALORANT_USER_NOT_FOUND_MESSAGE,
} from './configuration/chat';
import BROADCASTER_ACTIONS from './actions/broadcasterActions';
import USER_ACTIONS from './actions/userActions';
import VIP_ACTIONS from './actions/vipActions';
import { askAi, isAiMention } from './services/aiService';
import { formatKnownCommandsForChat } from './configuration/aiCommands';

const BOT_USERNAME = process.env.BOT_USERNAME || '';
const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME || '';
const FOLLOW_RECURRENT_MESSAGE_TIME_MIN = Number(process.env.FOLLOW_RECURRENT_MESSAGE_TIME_MIN || '0');
const PRIME_RECURRENT_MESSAGE_TIME_MIN = Number(process.env.PRIME_RECURRENT_MESSAGE_TIME_MIN || '0');
const TWITCH_CHAT_MESSAGE_MAX_LENGTH = 400;

let previousMessage = '';

const AI_EXECUTABLE_COMMANDS = new Set([
  ...Object.keys(MESSAGES_CONFIG),
  ...USERS_ACTIONS_CONFIG,
  ...VIP_ACTIONS_CONFIG,
  ...MODS_ACTIONS_CONFIG,
  ...BROADCASTER_MESSAGES_CONFIG,
]);

const getAiCommandRequiredRole = (command: string): UserRole | undefined => {
  if (VIP_ACTIONS_CONFIG.includes(command)) return UserRole.VIP;
  if (MODS_ACTIONS_CONFIG.includes(command)) return UserRole.MOD;
  if (BROADCASTER_MESSAGES_CONFIG.includes(command)) return UserRole.BROADCASTER;
  return undefined;
};

const splitChatMessage = (message: string): string[] => {
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

const formatAiResponseForChat = (message: string) => formatKnownCommandsForChat(message, AI_EXECUTABLE_COMMANDS);

const VALORANT_COMMANDS = new Set([
  VALORANT_RANK_KEY,
  VALORANT_RANK_ALIAS_KEY,
  VALORANT_ELO_KEY,
  VALORANT_RANK_ALIAS_2_KEY,
  VALORANT_KEY,
  VALORANT_ID_ALIAS_KEY,
  LAST_RANKED_KEY,
  LAST_RANKED_ALIAS_KEY,
  LAST_GAME_KEY,
]);

const getValorantCommandResponse = async (command: string, value?: string): Promise<string | undefined> => {
  const playerValue = value?.trim();
  const { label: playerLabel, isValidTag } = (await import('./services/valorant')).parseValorantPlayer(playerValue);

  if (!isValidTag) {
    return VALORANT_INVALID_TAG_MESSAGE;
  }

  try {
    if ([VALORANT_RANK_KEY, VALORANT_RANK_ALIAS_KEY, VALORANT_ELO_KEY, VALORANT_RANK_ALIAS_2_KEY, VALORANT_KEY, VALORANT_ID_ALIAS_KEY].includes(command)) {
      const data = await CHAT_KEY_ACTIONS[VALORANT_RANK_RESPONSE_KEY](playerValue);
      return `🎮 ${playerLabel} - ${data}`;
    }

    if ([LAST_RANKED_KEY, LAST_RANKED_ALIAS_KEY, LAST_GAME_KEY].includes(command)) {
      const data = await CHAT_KEY_ACTIONS[VALORANT_LAST_RANKED_RESPONSE_KEY](playerValue);
      return `🎮 ${playerLabel} - ${data}`;
    }

    return undefined;
  } catch (error) {
    if (error instanceof Error && error.message === 'VALORANT_USER_NOT_FOUND') {
      return VALORANT_USER_NOT_FOUND_MESSAGE.replace(STRING_PARAM, playerLabel);
    }

    logger.error(`Error querying Valorant rank for ${playerLabel}: ${error}`);
    return VALORANT_LOOKUP_ERROR_MESSAGE.replace(STRING_PARAM, playerLabel);
  }
};

const createMentionedChat = (chat: tmi.Client, username: string): tmi.Client => new Proxy(chat, {
  get: (target, property, receiver) => {
    if (property !== 'say') return Reflect.get(target, property, receiver);

    return (channel: string, message: string) => target.say(channel, `@${username}, ${formatAiResponseForChat(message)}`);
  },
});

const responsesKeysHandler = async (message: string): Promise<string | undefined> => {
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

const messageHandler = (chat: tmi.Client): OnNewMessage => async ({ channel, message, tags, ttsUser }) => {
  const formattedMessage = message.trim();
  previousMessage = formattedMessage;

  if (!formattedMessage.startsWith('!') && isAiMention(formattedMessage)) {
    const username = tags.username || 'chat';
    const mentionedChat = createMentionedChat(chat, username);
    const sayAi = (response: string) => chat.say(channel, `@${username}, ${formatAiResponseForChat(response)}`);
    const result = await askAi(channel, username, formattedMessage);
    if (!result) {
      sayAi(AI_NO_RESPONSE_MESSAGE);
      return;
    }

    if (result?.command) {
      const command = result.command.name;
      const commandValue = result.command.value;

      if (!AI_EXECUTABLE_COMMANDS.has(command) || !command.startsWith('!')) {
        sayAi(AI_COMMAND_ERROR_MESSAGE);
        return;
      }

      const requiredRole = getAiCommandRequiredRole(command);
      if (requiredRole && !userHasAccess(tags, requiredRole)) {
        const roleDescription = requiredRole === UserRole.VIP
          ? 'VIP, moderador o broadcaster'
          : requiredRole === UserRole.MOD
            ? 'moderador o broadcaster'
            : 'broadcaster';
        sayAi(`${ACTION_NOT_ALLOWED}: necesitás ser ${roleDescription} para usar ${command}.`);
        logger.info(`AI command rejected for permissions: ${command}`);
        return;
      }

      const commandMessage = `${command} ${commandValue}`;
      await messageHandler(mentionedChat)({
        channel,
        tags,
        message: commandMessage,
        self: false,
        ttsUser: command === '!tts' ? BOT_USERNAME : undefined,
      });
      logger.info(`AI command processed: ${command}`);

      if (result.answer) {
        for (const responseMessage of splitChatMessage(result.answer)) {
          sayAi(responseMessage);
        }
      } else if (command !== '!game' && command !== '!categoria') {
        sayAi(`Listo, ejecuté ${command}.`);
      }
      return;
    }
    if (result.answer && !result.command) {
      logger.info(`AI: ${result.answer}`);
      for (const responseMessage of splitChatMessage(result.answer)) {
        sayAi(responseMessage);
      }
    } else if (!result.command) {
      sayAi(AI_NO_RESPONSE_MESSAGE);
    }
    return;
  }

  const originalCommand = formattedMessage.split(' ')[0]?.trim();
  const command = originalCommand.toLowerCase();

  if (USERS_ACTIONS_CONFIG.includes(command)) {
    await USER_ACTIONS[command as keyof typeof USER_ACTIONS]({
      chat,
      value: formattedMessage.replace(originalCommand, '').trim(),
      username: tags.username,
      ttsUser,
      tags: tags,
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
      value: formattedMessage.replace(originalCommand, '').trim(),
      username: tags.username,
      ttsUser,
      tags: tags,
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
      value: formattedMessage.replace(originalCommand, '').trim(),
      username: tags.username,
      ttsUser,
      tags: tags,
    });

    return;
  }

  if (BROADCASTER_MESSAGES_CONFIG.includes(command)) {
    if (!userHasAccess(tags, UserRole.BROADCASTER)) {
      chat.say(channel, ACTION_NOT_ALLOWED);
      logger.info(`BOT: ${ACTION_NOT_ALLOWED}`);
      return;
    };

    await BROADCASTER_ACTIONS[command as keyof typeof BROADCASTER_ACTIONS]({
      chat,
      value: formattedMessage.replace(originalCommand, '').trim(),
    });

    return;
  }

  if (VALORANT_COMMANDS.has(command)) {
    const value = formattedMessage.replace(originalCommand, '').trim();
    const response = await getValorantCommandResponse(command, value);

    if (!response) return;

    logger.info(`BOT: ${response}`);
    for (const message of splitChatMessage(response)) {
      chat.say(channel, message);
    }
    return;
  }

  const currentMessageResponse = MESSAGES_CONFIG[command] || '';
  const formattedResponse = await responsesKeysHandler(currentMessageResponse.trim());

  if (!formattedResponse) return;

  logger.info(`BOT: ${formattedResponse}`);
  for (const message of splitChatMessage(formattedResponse)) {
    chat.say(channel, message);
  }
};

const spamFollowMessage = () => {
  const time = FOLLOW_RECURRENT_MESSAGE_TIME_MIN * 60 * 1000; // ms

  setInterval(() => {
    if (!Stream.shared.isOnline) {
      previousMessage = '';
      return;
    }

    const followMessages = FOLLOW_SPAM_MESSAGES.map((current) => current.toLowerCase().trim());
    if (followMessages.includes(previousMessage)) return;

    const currentFollowerMessage = FOLLOW_SPAM_MESSAGES[random(0, FOLLOW_SPAM_MESSAGES.length)];
    logger.info(currentFollowerMessage);
    TwitchChatService.chat.say(BROADCAST_USERNAME, currentFollowerMessage);
  }, time);
};

const spamPrimeMessage = () => {
  const time = PRIME_RECURRENT_MESSAGE_TIME_MIN * 60 * 1000; // ms

  setInterval(() => {
    if (!Stream.shared.isOnline) {
      previousMessage = '';
      return;
    }

    const primeMessages = PRIME_SPAM_MESSAGES.map((current) => current.toLowerCase().trim());
    if (primeMessages.includes(previousMessage)) return;

    const currentPrimeMessage = PRIME_SPAM_MESSAGES[random(0, PRIME_SPAM_MESSAGES.length)];
    logger.info(currentPrimeMessage);
    TwitchChatService.chat.say(BROADCAST_USERNAME, currentPrimeMessage);
  }, time);
};

const startBot = async () => {
  unvipExpiredRequests(BROADCAST_USERNAME);

  await TwitchChatService.initialize(
    BOT_USERNAME,
    BROADCAST_USERNAME,
    (params) => messageHandler(TwitchChatService.chat)(params),
  );

  spamFollowMessage();
  spamPrimeMessage();

  await connectToEvents();
};

export default startBot;
