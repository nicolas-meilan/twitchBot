import db from './index';

export type TwitchUser = {
  id: number;
  twitchId: string;
  username: string;
};

const run = (query: string, params: unknown[] = []): Promise<void> => new Promise((resolve, reject) => {
  db.run(query, params, (error) => {
    if (error) {
      reject(error);
      return;
    }

    resolve();
  });
});

const get = <T>(query: string, params: unknown[] = []): Promise<T | undefined> => new Promise((resolve, reject) => {
  db.get<T>(query, params, (error, row) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(row);
  });
});

const mapUser = (row: { id: number; twitch_id: string; username: string } | undefined): TwitchUser | undefined => (
  row && { id: row.id, twitchId: row.twitch_id, username: row.username }
);

export const getUserByTwitchId = async (twitchId: string): Promise<TwitchUser | undefined> => mapUser(
  await get<{ id: number; twitch_id: string; username: string }>(
    'SELECT id, twitch_id, username FROM "user" WHERE twitch_id = ?',
    [twitchId],
  ),
);

export const getUserByUsername = async (username: string): Promise<TwitchUser | undefined> => mapUser(
  await get<{ id: number; twitch_id: string; username: string }>(
    'SELECT id, twitch_id, username FROM "user" WHERE username = ? COLLATE NOCASE',
    [username.trim()],
  ),
);

export const ensureUser = async (twitchId: string, username: string): Promise<TwitchUser> => {
  const normalizedUsername = username.trim().toLowerCase();
  if (!twitchId.trim() || !normalizedUsername) {
    throw new Error('A Twitch user ID and username are required.');
  }

  await run(`
    INSERT INTO "user" (twitch_id, username) VALUES (?, ?)
    ON CONFLICT(twitch_id) DO UPDATE SET username = excluded.username
  `, [twitchId.trim(), normalizedUsername]);

  const user = await getUserByTwitchId(twitchId.trim());
  if (!user) throw new Error('Twitch user could not be loaded after saving.');
  return user;
};
