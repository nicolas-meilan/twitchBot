import db from './index';

export const storeVipRequest = (account: string, vipUserId: string, vipUsername: string) => {
  const timestamp = Date.now();

  db.serialize(() => {
    db.run(
      `INSERT INTO vip_status (account, vip_user_id, vip_username, timestamp, is_vip) 
         VALUES (?, ?, ?, ?, true) 
         ON CONFLICT(account, vip_user_id) DO UPDATE SET 
           timestamp = excluded.timestamp, 
           is_vip = true, 
           vip_username = excluded.vip_username`,
      [account.toLowerCase(), vipUserId, vipUsername.toLowerCase(), timestamp]
    );
  });
};

export const revokeVipRequest = (account: string, vipUserId: string) => {
  db.serialize(() => {
    db.run(
      `UPDATE vip_status 
         SET is_vip = false 
         WHERE account = ? AND vip_user_id = ?`,
      [account.toLowerCase(), vipUserId]
    );
  });
};

export const getExpiredVipRequests = (account: string, expirationTime: number): Promise<{ vip_user_id: string, vip_username: string }[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT vip_user_id, vip_username 
       FROM vip_status 
       WHERE account = ? AND is_vip = true AND timestamp < ?`,
      [account.toLowerCase(), expirationTime],
      (err, rows: { vip_user_id: string, vip_username: string }[]) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      }
    );
  });
};
