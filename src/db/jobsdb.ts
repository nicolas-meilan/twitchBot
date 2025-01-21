import db from './index';
import logger from '../utils/logger';

const CLEANUP_INTERVAL = 14 * 24 * 60 * 60 * 1000; // 2 weeks

const cleanupNonVipRequests = () => {
  try {
    db.serialize(() => {
      db.run(`
        DELETE FROM vip_status
        WHERE is_vip = 0
      `);
    });
  
    logger.info('All non-VIP requests have been deleted.');
  } catch {
    logger.info('Error deleting non-VIP requests.');
  }
};

cleanupNonVipRequests();

setInterval(cleanupNonVipRequests, CLEANUP_INTERVAL);
