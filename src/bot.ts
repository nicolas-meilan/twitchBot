import tmi from 'tmi.js';

import getTokens from './services/auth';
import connectToChat, { OnNewMessage } from './services/chat';
import { MESSAGES_CONFIG, VALORANT_RANK_COMMAND_KEY } from './configuration/chat';
import logger from './utils/logger';
import { fetchCurrentRank } from './services/valorant';

const BOT_USERNAME = process.env.BOT_USERNAME || '';
const ACCOUNT_CHAT_USERNAME = process.env.ACCOUNT_CHAT_USERNAME || '';
const COMMANDS_KEY = '!comandos';
const JOINER = ', ';

const messageHandler = (chat: tmi.Client): OnNewMessage => async ({ channel, message }) => {
  const formattedMessage = message.toLowerCase().trim();

  const currentMessageResponse = MESSAGES_CONFIG[formattedMessage] || '';
  const formattedResponse = currentMessageResponse.trim();

  if (formattedMessage === COMMANDS_KEY) {
    chat.say(channel, Object.keys(MESSAGES_CONFIG).join(JOINER));
    return;
  }

  if (!formattedResponse) return;

  const valorantRankNeeded = formattedResponse.includes(VALORANT_RANK_COMMAND_KEY);
  let responseToSend = formattedResponse;

  if (valorantRankNeeded) {
    try {
      const valorantRank = await fetchCurrentRank();
      responseToSend = responseToSend.replace(VALORANT_RANK_COMMAND_KEY, valorantRank);
    } catch (error) {
      logger.error('Error fetching valorant data');
      return;
    }
  }

  logger.info(`rungekutta93bot: ${responseToSend}`);
  chat.say(channel, responseToSend);
};

const startBot = async () => {
  const token = await getTokens();

  const chat = await connectToChat(BOT_USERNAME, token.access_token, ACCOUNT_CHAT_USERNAME, (params) => {
    messageHandler(chat)(params);
  });
};

export default startBot;
