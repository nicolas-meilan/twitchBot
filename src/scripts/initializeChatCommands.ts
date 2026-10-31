import dotenv from 'dotenv';
dotenv.config();

import db from '../db';
import { initializeDatabase } from '../db/schema';
import { initializeChatCommands } from '../db/chatCommands';
import logger from '../utils/logger';

const initialize = async () => {
  try {
    const username = process.argv[2]?.trim().toLowerCase();
    if (!username || !/^[a-z0-9_]{1,25}$/.test(username)) {
      throw new Error('Usage: yarn initializeChatCommands <twitch-username>');
    }
    process.env.BROADCAST_USERNAME = username;

    await initializeDatabase();
    const { initializeBroadcastSession } = await import('../services/twitch/auth');
    await initializeBroadcastSession();
    await initializeChatCommands();
    logger.info('Chat command database initialized.');
  } finally {
    await new Promise<void>((resolve, reject) => {
      db.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
};

initialize().catch((error: unknown) => {
  logger.error('Failed to initialize chat command database:', error);
  process.exitCode = 1;
});
