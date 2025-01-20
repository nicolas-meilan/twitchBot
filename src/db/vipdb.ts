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
      [account, requesterUsername, timestamp]
    );
  });
};

export const revokeVipRequest = (account: string, requesterUsername: string) => {
  db.serialize(() => {
    db.run(
      `UPDATE vip_requests 
         SET is_vip = false 
         WHERE account = ? AND requester_username = ?`,
      [account, requesterUsername]
    );
  });
};
