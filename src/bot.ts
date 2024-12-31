import tmi from 'tmi.js';

import connectToChat, { OnNewMessage } from './services/twitch/chat';
import connectToEvents from './services/twitch/events';
import logger from './utils/logger';
import { random } from './utils/numbers';
import Stream from './Stream';
import MOD_ACTIONS from './actions/modActions';
import CHAT_KEY_ACTIONS from './actions/chatKeyActions';

import {
  MESSAGES_CONFIG,
  RESPONSES_KEYS,
  KEY_DELIMITER,
  MODS_MESSAGES_CONFIG,
  ACTION_NOT_ALLOWED,
  FOLLOW_SPAM_MESSAGES,
  PRIME_SPAM_MESSAGES,
  BROADCASTER_MESSAGES_CONFIG,
} from './configuration/chat';
import BROADCASTER_ACTIONS from './actions/broadcasterActions';

const BOT_USERNAME = process.env.BOT_USERNAME || '';
const ACCOUNT_CHAT_USERNAME = process.env.ACCOUNT_CHAT_USERNAME || '';
const FOLLOW_RECURRENT_MESSAGE_TIME_MIN = Number(process.env.FOLLOW_RECURRENT_MESSAGE_TIME_MIN || '0');
const PRIME_RECURRENT_MESSAGE_TIME_MIN = Number(process.env.PRIME_RECURRENT_MESSAGE_TIME_MIN || '0');

let previousMessage = '';

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

const messageHandler = (chat: tmi.Client): OnNewMessage => async ({ channel, message, tags, self }) => {
  const formattedMessage = message.toLowerCase().trim();
  previousMessage = formattedMessage;

  const canDispatchModActions = !!tags.badges?.broadcaster || tags.mod;

  const command = formattedMessage.split(' ')[0]?.trim();
  if (BROADCASTER_MESSAGES_CONFIG.includes(command)) {
    if (!tags.badges?.broadcaster) {
      chat.say(channel, ACTION_NOT_ALLOWED);
      logger.info(`rungekutta93bot: ${ACTION_NOT_ALLOWED}`);
      return;
    };

    await BROADCASTER_ACTIONS[command as keyof typeof BROADCASTER_ACTIONS]({
      chat,
      value: formattedMessage.replace(command, '').trim(),
    });

    return;
  }
  if (MODS_MESSAGES_CONFIG.includes(command)) {
    if (!canDispatchModActions) {
      chat.say(channel, ACTION_NOT_ALLOWED);
      logger.info(`rungekutta93bot: ${ACTION_NOT_ALLOWED}`);
      return;
    }

    await MOD_ACTIONS[command as keyof typeof MOD_ACTIONS]({
      chat,
      value: formattedMessage.replace(command, '').trim(),
      username: tags.username,
    });

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
    if (!Stream.shared.isOnline) {
      previousMessage = '';
      return;
    }

    const followMessages = FOLLOW_SPAM_MESSAGES.map((current) => current.toLowerCase().trim());
    if (followMessages.includes(previousMessage)) return;

    const currentFollowerMessage = FOLLOW_SPAM_MESSAGES[random(0, FOLLOW_SPAM_MESSAGES.length)];
    logger.info(currentFollowerMessage);
    chat.say(ACCOUNT_CHAT_USERNAME, currentFollowerMessage);
  }, time);
};

const spamPrimeMessage = (chat: tmi.Client) => {
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
    chat.say(ACCOUNT_CHAT_USERNAME, currentPrimeMessage);
  }, time);
};

const startBot = async () => {
  const chat = await connectToChat(
    BOT_USERNAME,
    ACCOUNT_CHAT_USERNAME,
    (params) => {
      if (!chat) return;

      messageHandler(chat)(params);
    });

  if (!chat) return;

  spamFollowMessage(chat);
  spamPrimeMessage(chat);

  await connectToEvents(chat);
};

export default startBot;
