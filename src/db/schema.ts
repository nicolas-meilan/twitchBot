import db from './index';

const run = (query: string, params: unknown[] = []): Promise<void> => new Promise((resolve, reject) => {
  db.run(query, params, (error) => {
    if (error) {
      reject(error);
      return;
    }

    resolve();
  });
});

const createBaseTables = async (): Promise<void> => {
  await run(`
    CREATE TABLE IF NOT EXISTS "user" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      twitch_id TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS bot_tokens (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      iv_access_token TEXT NOT NULL,
      iv_refresh_token TEXT NOT NULL
    )
  `);
};

const createTables = async (): Promise<void> => {
  await run(`
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      user_id INTEGER PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      iv_access_token TEXT NOT NULL,
      iv_refresh_token TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS vip_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      vip_user_id TEXT NOT NULL,
      vip_username TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      is_vip BOOLEAN NOT NULL,
      expiration_timestamp INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
      UNIQUE(user_id, vip_user_id)
    )
  `);
  await run('CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_vip_status_user_id ON vip_status(user_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_vip_status_vip_user_id ON vip_status(vip_user_id)');
};

export const initializeDatabase = async (): Promise<void> => {
  await run('BEGIN IMMEDIATE');
  try {
    await createBaseTables();
    await createTables();
    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK');
    throw error;
  }
};
