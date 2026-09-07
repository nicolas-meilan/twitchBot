import tmi from 'tmi.js';

import TwitchChatService, { OnNewMessage } from './services/twitch/TwitchChatService';
import connectToEvents from './services/twitch/events';
import logger from './utils/logger';
import { random } from './utils/numbers';
import Stream from './Stream';
import { unvipExpiredRequests } from './utils/unvip';

import { FOLLOW_SPAM_MESSAGES, PRIME_SPAM_MESSAGES } from './configuration/chat';

import { executeCommand, parseCommandMessage } from './commandDispatcher';
import { isAiMention, handleAiMention } from './services/aiService/aiService';

const BOT_USERNAME = process.env.BOT_USERNAME || '';
const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME || '';
const FOLLOW_RECURRENT_MESSAGE_TIME_MIN = Number(process.env.FOLLOW_RECURRENT_MESSAGE_TIME_MIN || '0');
const PRIME_RECURRENT_MESSAGE_TIME_MIN = Number(process.env.PRIME_RECURRENT_MESSAGE_TIME_MIN || '0');

let previousMessage = '';

const messageHandler = (chat: tmi.Client): OnNewMessage => async ({ channel, message, tags, ttsUser, self }) => {
  if (self || (tags.username || '').toLowerCase() === BOT_USERNAME.toLowerCase()) {
    return;
  }

  const formattedMessage = message.trim();
  previousMessage = formattedMessage;

  if (!formattedMessage.startsWith('!') && isAiMention(formattedMessage)) {
    await handleAiMention(chat, channel, tags, formattedMessage);
    return;
  }

  const { command, value } = parseCommandMessage(formattedMessage);

  await executeCommand({ chat, channel, tags, command, value, ttsUser });
};

const spamFollowMessage = () => {
  const time = FOLLOW_RECURRENT_MESSAGE_TIME_MIN * 60 * 1000;

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
  const time = PRIME_RECURRENT_MESSAGE_TIME_MIN * 60 * 1000;

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
