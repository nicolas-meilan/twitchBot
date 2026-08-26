import {
  revokeVipRequest,
  getExpiredVipRequests,
} from '../db/vipdb';
import { getBroadcastTokens } from '../services/twitch/auth';
import { isUserNotVipError, removeVip } from '../services/twitch/vip';
import logger from './logger';
import { delay } from './system';

const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const REQUEST_INTERVAL = 1000;

export const unvipExpiredRequests = (account: string) => {
  const checkAndUnvip = async () => {
    try {
      const tokens = await getBroadcastTokens({ avoidLogin: true });
      if (!tokens) throw new Error();

      const usersToUnvip = await getExpiredVipRequests(account);
      for (const { vip_user_id } of usersToUnvip) {
        try {
          await removeVip(tokens.access_token, vip_user_id);
        } catch (error) {
          if (!isUserNotVipError(error)) {
            throw error;
          }

          logger.warn(`VIP record for ${vip_user_id} was already removed on Twitch; clearing DB state.`);
        }

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
