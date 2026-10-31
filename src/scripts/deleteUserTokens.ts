import dotenv from 'dotenv';
dotenv.config();

import db from '../db';
import { initializeDatabase } from '../db/schema';
import { deleteTokens } from '../db/tokensdb';

const deleteUserTokens = async () => {
  try {
    const username = process.argv[2]?.trim().toLowerCase();
    if (!username || !/^[a-z0-9_]{1,25}$/.test(username)) {
      throw new Error('Usage: yarn deleteUserTokens <twitch-username>');
    }
    process.env.BROADCAST_USERNAME = username;

    await initializeDatabase();
    const { LoginType } = await import('../services/twitch/auth');
    await Promise.all([
      deleteTokens(LoginType.BotUser),
      deleteTokens(LoginType.BroadcastUser),
    ]);
  } finally {
    await new Promise<void>((resolve, reject) => {
      db.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
};

deleteUserTokens().catch((error: unknown) => {
  console.error('Failed to delete Twitch tokens:', error);
  process.exitCode = 1;
});
