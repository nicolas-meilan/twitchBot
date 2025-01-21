import db from '../db';
import {
  revokeVipRequest,
  getExpiredVipRequests,
} from '../db/vipdb';
import logger from './logger';

const VIP_TIME = 14 * 24 * 60 * 60 * 1000; // 2 weeks
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export const unvipExpiredRequests = (account: string, chat: any) => {
  const checkAndUnvip = () => {
    try {
      const currentTime = Date.now();
      const expirationTime = currentTime - VIP_TIME;

      db.serialize(async () => {
        const usersToUnvip = await getExpiredVipRequests(account, expirationTime);
        usersToUnvip.forEach(({ requester_username }) => {
          chat.say(account, `/unvip ${requester_username}`);
          revokeVipRequest(account, requester_username);

          logger.info(`/unvip ${requester_username}`);
        });
      });
    } catch {
      logger.error('Error unvip users');
    }
  };

  checkAndUnvip();

  setInterval(checkAndUnvip, CHECK_INTERVAL);
};
