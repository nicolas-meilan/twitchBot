import tmi from 'tmi.js';

import getTokens from './services/auth';
import connectToChat, { OnNewMessage } from './services/chat';
import { MESSAGES_CONFIG } from './configuration/chat';
import logger from './utils/logger';

const BOT_USERNAME = process.env.BOT_USERNAME || '';
const ACCOUNT_CHAT_USERNAME = process.env.ACCOUNT_CHAT_USERNAME || '';

const messageHandler = (chat: tmi.Client): OnNewMessage => ({ tags, channel, message }) => {
  const formattedMessage = message.toLowerCase().trim();

  const currentMessageResponse = MESSAGES_CONFIG[formattedMessage] || '';
  const formattedResponse = currentMessageResponse.trim();

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
