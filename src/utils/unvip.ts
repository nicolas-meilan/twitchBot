import {
  revokeVipRequest,
  getExpiredVipRequests,
} from '../db/vipdb';
import { getBroadcastTokens } from '../services/twitch/auth';
import { removeVip } from '../services/twitch/vip';
import logger from './logger';
import { delay } from './system';

const VIP_TIME = 14 * 24 * 60 * 60 * 1000; // 2 weeks
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const REQUEST_INTERVAL = 1000;

export const unvipExpiredRequests = (account: string) => {
  const checkAndUnvip = async () => {
    try {
      const currentTime = Date.now();
      const expirationTime = currentTime - VIP_TIME;

      const tokens = await getBroadcastTokens({ avoidLogin: true });
      if (!tokens) throw new Error();

      const usersToUnvip = await getExpiredVipRequests(account, expirationTime);
      for (const { vip_user_id } of usersToUnvip) {
        await removeVip(tokens.access_token, vip_user_id);
        revokeVipRequest(account, vip_user_id);

        logger.info(`unvip ${vip_user_id}`);
        await delay(REQUEST_INTERVAL);
      }
    } catch {
      logger.error('Error unvip users');
    }
  };

  checkAndUnvip();

  setInterval(checkAndUnvip, CHECK_INTERVAL);
};
