import tmi from 'tmi.js';

import getTokens from './services/auth';
import connectToChat, { OnNewMessage } from './services/chat';
import { MESSAGES_CONFIG } from './configuration/chat';
import logger from './utils/logger';
import { delay } from './utils/system';

const BOT_USERNAME = process.env.BOT_USERNAME || '';
const ACCOUNT_CHAT_USERNAME = process.env.ACCOUNT_CHAT_USERNAME || '';
const DELAY_MESSAGE_TIME = 300;

const messageHandler = (chat: tmi.Client): OnNewMessage => ({ tags, channel, message }) => {
  const formattedMessage = message.toLowerCase().trim();

  const currentMessageResponse = MESSAGES_CONFIG[formattedMessage] || '';

  if (!currentMessageResponse) return;
  logger.info(`${tags.username}: ${formattedMessage}`);
  const responses = currentMessageResponse.split('\n');

  responses.reduce((promiseAcc, currentResponse) => (
    promiseAcc.then(async () => {
      const formattedResponse = currentResponse.trim();

      if (!formattedResponse) return;
      logger.info(`rungekutta93bot: ${formattedResponse}`);
      await chat.say(channel, formattedResponse);
      await delay(DELAY_MESSAGE_TIME);
    }).catch(() => {
      logger.error(`ERROR rungekutta93bot: ${currentResponse.trim()}`);
    })
  ), Promise.resolve());
};

const startBot = async () => {
  const token = await getTokens();

  const chat = await connectToChat(BOT_USERNAME, token.access_token, ACCOUNT_CHAT_USERNAME, (params) => {
    messageHandler(chat)(params);
  });
};

export default startBot;
