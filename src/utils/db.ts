import sqlite3 from 'sqlite3';

const DATABASE = './tokens.db';

export type Tokens = {
    access_token: string;
    refresh_token: string;
};

const db = new sqlite3.Database(DATABASE, (err) => {
    if (err) throw err;
});

db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS oauth_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL
      )
    `);
});

export const saveTokens = ({ access_token, refresh_token }: Tokens) => {
    const stmt = db.prepare('INSERT INTO oauth_tokens (access_token, refresh_token) VALUES (?, ?)');

    stmt.run(access_token, refresh_token);
    stmt.finalize();
};

export const loadTokens = () => new Promise<Tokens | undefined>((resolve, reject) => {
    db.get<Tokens>('SELECT access_token, refresh_token FROM oauth_tokens', (err, row) => {
        if (err) reject(err);

        resolve(row);
    });
});
