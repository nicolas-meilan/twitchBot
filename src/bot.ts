import tmi from 'tmi.js';

import getTokens from './services/twitch/auth';
import connectToChat, { OnNewMessage } from './services/twitch/chat';
import connectToEvents, { isOnline } from './services/twitch/events';
import { getGameId, updateChannelInfo } from './services/twitch/channel';

import { fetchCurrentRank } from './services/valorant';
import { fetchJokes } from './services/jokes';

import { BASE_TAGS, Game, GAMES } from './configuration/games';
import logger from './utils/logger';

import {
  MESSAGES_CONFIG,
  RESPONSES_KEYS,
  VALORANT_RANK_RESPONSE_KEY,
  KEY_DELIMITER,
  COMMANDS_RESPONSE_KEY,
  JOKES_KEY,
  VALORANT_LAST_RANKED_RESPONSE_KEY,
  NEW_FOLLOWER_MESSAGE,
  STRING_PARAM,
  NEW_SUB_MESSAGE,
  BITS_MESSAGE,
  ACTION_MESSAGES_CONFIG,
  CHANGE_CHANNEL_INFORMATION_KEY,
  CHANNEL_INFO_ACTION_GAME_NOT_AVAILABLE,
  CHANNEL_INFO_ACTION_SUCCESS,
  CHANNEL_INFO_ACTION_ERROR,
  ACTION_NOT_ALLOWED,
  COMMAND_DELIMITER,
  MOD_COMMANDS_RESPONSE_KEY,
  COMMANDS_SEPARATOR,
  FOLLOW_SPAM_MESSAGES,
  PRIME_SPAM_MESSAGES,
} from './configuration/chat';
import { random } from './utils/numbers';

const BOT_USERNAME = process.env.BOT_USERNAME || '';
const ACCOUNT_CHAT_USERNAME = process.env.ACCOUNT_CHAT_USERNAME || '';
const FOLLOW_RECURRENT_MESSAGE_TIME_MIN = Number(process.env.FOLLOW_RECURRENT_MESSAGE_TIME_MIN || '0');
const PRIME_RECURRENT_MESSAGE_TIME_MIN = Number(process.env.PRIME_RECURRENT_MESSAGE_TIME_MIN || '0');

let previousMessage = '';

const messageActionsHandler = async (chat: tmi.Client, message: string) => {
  const actionsConfig = {
    [CHANGE_CHANNEL_INFORMATION_KEY]: async (actionValue: string) => {
      const token = await getTokens({ avoidLogin: true });
      if (!token || !token.access_token) return;

      let gameData: Game | undefined = GAMES[actionValue];

      if (!gameData) {
        try {
          const [
            gameName,
            gameTitle,
            gameTags,
          ] = actionValue.split(COMMAND_DELIMITER);

          const game = await getGameId(token.access_token, gameName.trim());

          if (!game) {
            chat.say(ACCOUNT_CHAT_USERNAME, CHANNEL_INFO_ACTION_GAME_NOT_AVAILABLE);
            return;
          }

          gameData = Object.values(GAMES).find(({ gameId }) => game.id === gameId);

          if (!gameData) {
            const extraTags = gameTags?.trim()
              ? gameTags?.split(' ')
                .filter((currentTag) => currentTag)
                .map((currentTag) => currentTag.trim())
              : [gameName.split(' ').join('')];

            gameData = {
              title: (gameTitle || game.name).trim(),
              gameId: game.id,
              tags: [...BASE_TAGS, ...extraTags],
            }; 
          }
        } catch {
          chat.say(ACCOUNT_CHAT_USERNAME, CHANNEL_INFO_ACTION_GAME_NOT_AVAILABLE);
          return;
        } 
      }

      try {
        await updateChannelInfo(token.access_token, gameData);
        chat.say(ACCOUNT_CHAT_USERNAME, CHANNEL_INFO_ACTION_SUCCESS);
      } catch {
        chat.say(ACCOUNT_CHAT_USERNAME, CHANNEL_INFO_ACTION_ERROR);
      }
    },
  };

  const command = message.split(' ')[0];

  await actionsConfig[command as keyof typeof actionsConfig](message.replace(command, '').trim());
};

const responsesKeysHandler = async (message: string): Promise<string | undefined> => {
  try {
    if (!message) return;

    const key = message.split(KEY_DELIMITER)?.[1];
    const formattedKey = `${KEY_DELIMITER}${key}${KEY_DELIMITER}`;

    if (!RESPONSES_KEYS.includes(formattedKey)) return message;

    const keysConfig: {
      [key: string]: () => Promise<string>
    } = {
      [VALORANT_RANK_RESPONSE_KEY]: async () => {
        const valorantInfo = await fetchCurrentRank();

        return valorantInfo.currenttierpatched;
      },
      [VALORANT_LAST_RANKED_RESPONSE_KEY]: async () => {
        const valorantInfo = await fetchCurrentRank();

        const isPositive = valorantInfo.mmr_change_to_last_game >= 0;
        return `${isPositive ? 'Gané' : 'Perdí'} ${Math.abs(valorantInfo.mmr_change_to_last_game)} puntos ${isPositive ? '🏆' : '😭'}`;
      },
      [JOKES_KEY]: fetchJokes,
      [COMMANDS_RESPONSE_KEY]: async () => Object.keys(MESSAGES_CONFIG).sort().join(COMMANDS_SEPARATOR),
      [MOD_COMMANDS_RESPONSE_KEY]: async () => ACTION_MESSAGES_CONFIG.sort().join(COMMANDS_SEPARATOR),
    };

    const keyValue = await (keysConfig[formattedKey]!)();

    return message.replace(formattedKey, keyValue);
  } catch {
    logger.error(`Error processing the message: ${message}`);
  }
};

const messageHandler = (chat: tmi.Client): OnNewMessage => async ({ channel, message, tags, self }) => {
  const formattedMessage = message.toLowerCase().trim();
  previousMessage = formattedMessage;

  const canDispatchActions = !!tags.badges?.broadcaster || tags.mod;

  // message action structure: '!command VALUE'
  if (ACTION_MESSAGES_CONFIG.includes(formattedMessage.split(' ')[0])) {
    if (!canDispatchActions) {
      chat.say(channel, ACTION_NOT_ALLOWED);
      logger.info(`rungekutta93bot: ${ACTION_NOT_ALLOWED}`);
      return;
    }
    messageActionsHandler(chat, formattedMessage);
  
    return;
  }

  if (self) return;

  const currentMessageResponse = MESSAGES_CONFIG[formattedMessage] || '';
  const formattedResponse = await responsesKeysHandler(currentMessageResponse.trim());

  if (!formattedResponse) return;

  logger.info(`rungekutta93bot: ${formattedResponse}`);
  chat.say(channel, formattedResponse);
};

const spamFollowMessage = (chat: tmi.Client) => {
  const time = FOLLOW_RECURRENT_MESSAGE_TIME_MIN * 60 * 1000; // ms

  setInterval(() => {
    if (!isOnline) {
      previousMessage = '';
      return;
    }

    const followMessages = FOLLOW_SPAM_MESSAGES.map((current) => current.toLowerCase().trim());
    if (followMessages.includes(previousMessage)) return;

    logger.info(FOLLOW_SPAM_MESSAGES);
    chat.say(ACCOUNT_CHAT_USERNAME, FOLLOW_SPAM_MESSAGES[random(0, FOLLOW_SPAM_MESSAGES.length)]);
  }, time);
};

const spamPrimeMessage = (chat: tmi.Client) => {
  const time = PRIME_RECURRENT_MESSAGE_TIME_MIN * 60 * 1000; // ms

  setInterval(() => {
    if (!isOnline) {
      previousMessage = '';
      return;
    }

    const primeMessages = PRIME_SPAM_MESSAGES.map((current) => current.toLowerCase().trim());
    if (primeMessages.includes(previousMessage)) return;

    logger.info(PRIME_SPAM_MESSAGES);
    chat.say(ACCOUNT_CHAT_USERNAME, PRIME_SPAM_MESSAGES[random(0, PRIME_SPAM_MESSAGES.length)]);
  }, time);
};

const onNewFollower = (chat: tmi.Client) => async (newFollower?: string) => {
  if (!newFollower) return;

  const chatMessage = NEW_FOLLOWER_MESSAGE.replace(`${STRING_PARAM}1`, newFollower);
  logger.info(chatMessage);
  chat.say(ACCOUNT_CHAT_USERNAME, chatMessage);
};

const onNewSub = (chat: tmi.Client) => async (user?: string) => {
  if (!user) return;

  const chatMessage = NEW_SUB_MESSAGE.replace(`${STRING_PARAM}1`, user);
  logger.info(chatMessage);
  chat.say(ACCOUNT_CHAT_USERNAME, chatMessage);
};

const onBits = (chat: tmi.Client) => async (user?: string, bits?: number) => {
  if (!user || !bits) return;

  const chatMessage = BITS_MESSAGE.replace(`${STRING_PARAM}1`, user).replace(`${STRING_PARAM}2`, bits.toString());
  logger.info(chatMessage);
  chat.say(ACCOUNT_CHAT_USERNAME, chatMessage);
};

const startBot = async () => {
  await getTokens();

  const chat = await connectToChat(BOT_USERNAME, ACCOUNT_CHAT_USERNAME, (params) => {
    if (!chat) return;

    messageHandler(chat)(params);
  });

  if (!chat) return;

  await connectToEvents(onNewFollower(chat), onNewSub(chat), onBits(chat));

  spamFollowMessage(chat);
  spamPrimeMessage(chat);
};

export default startBot;
