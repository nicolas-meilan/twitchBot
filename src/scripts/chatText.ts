import dotenv from 'dotenv';
dotenv.config();

import tmi from 'tmi.js';
import '../db/schema';
import { getBotTokens } from '../services/twitch/auth';

const BOT_USERNAME = process.env.BOT_USERNAME || '';
const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME || '';

const sendChatText = async () => {
  const message = process.argv.slice(2).join(' ').trim();
  if (!message) {
    throw new Error('Provide the message to send, for example: yarn run chat-text "hello".');
  }

  if (!BOT_USERNAME || !BROADCAST_USERNAME) {
    throw new Error('BOT_USERNAME and BROADCAST_USERNAME must be configured.');
  }

  const tokens = await getBotTokens({ avoidLogin: true });
  if (!tokens) {
    throw new Error('Bot credentials are unavailable. Authorize the bot before using chat-text.');
  }

  const chat = new tmi.Client({
    identity: {
      username: BOT_USERNAME,
      password: `oauth:${tokens.access_token}`,
    },
    channels: [BROADCAST_USERNAME],
  });

  let connected = false;
  try {
    await chat.connect();
    connected = true;
    await chat.say(BROADCAST_USERNAME, message);
    console.info(`Message sent to #${BROADCAST_USERNAME}.`);
  } finally {
    if (connected) {
      await chat.disconnect();
    }
  }
};

sendChatText().catch((error: unknown) => {
  console.error('Failed to send Twitch chat message:', error);
  process.exitCode = 1;
});
