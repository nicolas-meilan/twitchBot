import db from './index';
import { getUserByUsername } from './users';

const getUserId = async (username: string): Promise<number> => {
  const user = await getUserByUsername(username);
  if (!user) throw new Error(`Twitch user "${username}" is not registered.`);
  return user.id;
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

export const storeVipRequest = async (
  username: string,
  vipUserId: string,
  vipUsername: string,
  expirationTimestamp: number,
): Promise<void> => {
  const userId = await getUserId(username);
  await run(`
    INSERT INTO vip_status (
      user_id, vip_user_id, vip_username, timestamp, expiration_timestamp, is_vip
    ) VALUES (?, ?, ?, ?, ?, true)
    ON CONFLICT(user_id, vip_user_id) DO UPDATE SET
      timestamp = excluded.timestamp,
      vip_username = excluded.vip_username,
      expiration_timestamp = excluded.expiration_timestamp,
      is_vip = true
  `, [userId, vipUserId, vipUsername.toLowerCase(), Date.now(), expirationTimestamp]);
};

export const revokeVipRequest = async (username: string, vipUserId: string): Promise<void> => {
  const userId = await getUserId(username);
  await run(
    'UPDATE vip_status SET is_vip = false WHERE user_id = ? AND vip_user_id = ?',
    [userId, vipUserId],
  );
};

export const getExpiredVipRequests = async (
  username: string,
): Promise<{ vip_user_id: string; vip_username: string }[]> => {
  const userId = await getUserId(username);
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT vip_user_id, vip_username
       FROM vip_status
       WHERE user_id = ? AND is_vip = true AND expiration_timestamp < ?`,
      [userId, Date.now()],
      (error, rows: { vip_user_id: string; vip_username: string }[]) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(rows);
      },
    );
  });
};
