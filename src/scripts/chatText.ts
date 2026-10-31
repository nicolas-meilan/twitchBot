import dotenv from 'dotenv';
dotenv.config();

import tmi from 'tmi.js';
import db from '../db';
import { initializeDatabase } from '../db/schema';

const BOT_USERNAME = process.env.BOT_USERNAME || '';

const sendChatText = async () => {
  try {
    const username = process.argv[2]?.trim().toLowerCase();
    const message = process.argv.slice(3).join(' ').trim();
    if (!username || !/^[a-z0-9_]{1,25}$/.test(username)) {
      throw new Error('Usage: yarn run chat-text <twitch-username> "message".');
    }
    if (!message) {
      throw new Error('Provide the message to send, for example: yarn run chat-text rungekutta93 "hello".');
    }
    if (!BOT_USERNAME) {
      throw new Error('BOT_USERNAME must be configured.');
    }

    process.env.BROADCAST_USERNAME = username;
    await initializeDatabase();

    const { getBotTokens } = await import('../services/twitch/auth');
    const tokens = await getBotTokens({ avoidLogin: true });
    if (!tokens) {
      throw new Error('Bot credentials are unavailable. Authorize the bot before using chat-text.');
    }

    const chat = new tmi.Client({
      identity: {
        username: BOT_USERNAME,
        password: `oauth:${tokens.access_token}`,
      },
      channels: [username],
    });

    let connected = false;
    try {
      await chat.connect();
      connected = true;
      await chat.say(username, message);
      console.info(`Message sent to #${username}.`);
    } finally {
      if (connected) {
        await chat.disconnect();
      }
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      db.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
};

sendChatText().catch((error: unknown) => {
  console.error('Failed to send Twitch chat message:', error);
  process.exitCode = 1;
});
