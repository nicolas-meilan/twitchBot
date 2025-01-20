import db from './index';

const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

const cleanupNonVipRequests = () => {
  db.serialize(() => {
    db.run(`
      DELETE FROM vip_requests
      WHERE is_vip = 0
    `);
  });

  console.log('All non-VIP requests have been deleted.');
};

setInterval(cleanupNonVipRequests, CLEANUP_INTERVAL);
