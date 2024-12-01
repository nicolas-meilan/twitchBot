import tmi from 'tmi.js';

import getTokens from './services/auth';
import connectToChat, { OnNewMessage } from './services/chat';
import {
  MESSAGES_CONFIG,
  RESPONSES_KEYS,
  VALORANT_RANK_RESPONSE_KEY,
  KEY_DELIMITER,
  COMMANDS_RESPONSE_KEY,
  JOKES_KEY,
  VALORANT_LAST_RANKED_RESPONSE_KEY,
} from './configuration/chat';
import logger from './utils/logger';
import { fetchCurrentRank } from './services/valorant';
import { fetchJokes } from './services/jokes';

const BOT_USERNAME = process.env.BOT_USERNAME || '';
const ACCOUNT_CHAT_USERNAME = process.env.ACCOUNT_CHAT_USERNAME || '';

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
      [COMMANDS_RESPONSE_KEY]: async () => Object.keys(MESSAGES_CONFIG).sort().join(', '),
    };

    const keyValue = await (keysConfig[formattedKey]!)();

    return message.replace(formattedKey, keyValue);
  } catch {
    logger.error(`Error processing the message: ${message}`);
  }
};

const messageHandler = (chat: tmi.Client): OnNewMessage => async ({ channel, message }) => {
  const formattedMessage = message.toLowerCase().trim();

  const currentMessageResponse = MESSAGES_CONFIG[formattedMessage] || '';
  const formattedResponse = await responsesKeysHandler(currentMessageResponse.trim());

  if (!formattedResponse) return;

  logger.info(`rungekutta93bot: ${formattedResponse}`);
  chat.say(channel, formattedResponse);
};

const startBot = async () => {
  const token = await getTokens();

  const chat = await connectToChat(BOT_USERNAME, token.access_token, ACCOUNT_CHAT_USERNAME, (params) => {
    messageHandler(chat)(params);
  });
};

export default startBot;
