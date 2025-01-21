import db from './index';

export const storeVipRequest = (account: string, requesterUsername: string) => {
  const timestamp = Date.now();

  db.serialize(() => {
    db.run(
      `INSERT INTO vip_requests (account, requester_username, timestamp, is_vip) 
         VALUES (?, ?, ?, true) 
         ON CONFLICT(account, requester_username) DO UPDATE SET 
           timestamp = excluded.timestamp, 
           is_vip = true`,
      [account.toLowerCase(), requesterUsername, timestamp]
    );
  });
};

export const revokeVipRequest = (account: string, requesterUsername: string) => {
  db.serialize(() => {
    db.run(
      `UPDATE vip_requests 
         SET is_vip = false 
         WHERE account = ? AND requester_username = ?`,
      [account.toLowerCase(), requesterUsername]
    );
  });
};

export const getExpiredVipRequests = (account: string, expirationTime: number): Promise<{ requester_username: string }[]> => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT requester_username 
       FROM vip_requests 
       WHERE account = ? AND is_vip = true AND timestamp < ?`,
      [account.toLowerCase(), expirationTime],
      (err, rows: { requester_username: string }[]) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      }
    );
  });
};
