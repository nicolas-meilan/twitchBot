import db from './index';

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      iv_access_token TEXT NOT NULL,
      iv_refresh_token TEXT NOT NULL,
      UNIQUE(account)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_account ON oauth_tokens(account)
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS vip_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account TEXT NOT NULL,
      vip_user_id TEXT NOT NULL,
      vip_username TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      is_vip BOOLEAN NOT NULL,
      FOREIGN KEY (account) REFERENCES oauth_tokens(account),
      UNIQUE(account, vip_user_id)
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_account ON vip_status(account)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_vip_user_id ON vip_status(vip_user_id)
  `);
});
