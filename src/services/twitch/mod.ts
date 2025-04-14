import axios from 'axios';
import logger from '../../utils/logger';
import { BASE_URL } from '../../configuration/constants';

const BROADCAST_ACCOUNT_ID = process.env.BROADCAST_ACCOUNT_ID || '';
const BOT_ACCOUNT_ID = process.env.BOT_ACCOUNT_ID || '';
const CLIENT_ID = process.env.CLIENT_ID || '';

type BanOptions = {
  duration?: number;
  permanent?: boolean;
  reason?: string;
};

export const banUser = async (
  accessToken: string,
  userId: string,
  options: BanOptions,
): Promise<void> => {
  try {
    const { duration, permanent, reason } = options;
    const body = {
      data: {
        user_id: userId,
        reason: reason,
        duration: permanent ? undefined : duration,
      },
    };

    await axios.post(
      `${BASE_URL}/helix/moderation/bans`,
      body,
      {
        params: {
          broadcaster_id: BROADCAST_ACCOUNT_ID,
          moderator_id: BOT_ACCOUNT_ID,
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': CLIENT_ID,
          'Content-Type': 'application/json',
        },
      },
    );

    logger.info(
      `User ${userId} ${
        permanent ? 'permanently banned' : `temporarily banned for ${duration} seconds`
      }. Reason: ${reason || 'None'}`,
    );
  } catch (error) {
    logger.error(`Error banning user ${userId}`);
    throw error;
  }
};
