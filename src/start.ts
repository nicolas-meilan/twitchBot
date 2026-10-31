import dotenv from 'dotenv';

dotenv.config();

const start = async (): Promise<void> => {
  const username = process.argv[2]?.trim().toLowerCase();
  if (!username) {
    throw new Error('Usage: yarn start <twitch-username>');
  }
  if (!/^[a-z0-9_]{1,25}$/.test(username)) {
    throw new Error('Twitch usernames must contain 1-25 letters, numbers, or underscores.');
  }

  process.env.BROADCAST_USERNAME = username;
  delete process.env.BROADCAST_ACCOUNT_ID;

  const { initializeDatabase } = await import('./db/schema');
  await initializeDatabase();

  const { initializeBroadcastSession } = await import('./services/twitch/auth');
  await initializeBroadcastSession();

  await import('./index');
};

start().catch((error: unknown) => {
  console.error('Application startup failed:', error);
  process.exitCode = 1;
});
