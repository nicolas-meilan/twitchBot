import axios from 'axios';
import logger from '../../utils/logger';
import { BASE_URL } from '../../configuration/constants';

const BROADCAST_ACCOUNT_ID = process.env.BROADCAST_ACCOUNT_ID || '';
const CLIENT_ID = process.env.CLIENT_ID || '';

export const isUserNotVipError = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  const message = error.response?.data?.message ?? error.message ?? '';

  return status === 422 && typeof message === 'string' && message.includes('not a VIP');
};

export const giveVip = async (
  accessToken: string,
  userId: string,
): Promise<void> => {
  try {
    logger.info(`Giving VIP to user ${userId}...`);
    await axios.post(
      `${BASE_URL}/helix/channels/vips?broadcaster_id=${BROADCAST_ACCOUNT_ID}&user_id=${userId}`,
      null,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': CLIENT_ID,
        },
      },
    );

    logger.info('VIP granted successfully');
  } catch (error) {
    logger.error('Error granting VIP');
    throw error;
  }
};

export const removeVip = async (
  accessToken: string,
  userId: string,
): Promise<void> => {
  try {
    logger.info(`Removing VIP from user ${userId}...`);
    await axios.delete(
      `${BASE_URL}/helix/channels/vips?broadcaster_id=${BROADCAST_ACCOUNT_ID}&user_id=${userId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': CLIENT_ID,
        },
      },
    );

    logger.info('VIP removed successfully');
  } catch (error) {
    if (isUserNotVipError(error)) {
      logger.warn(`User ${userId} is not currently a VIP in the broadcaster channel. Treating as already removed.`);
      return;
    }

    logger.error('Error removing VIP');
    throw error;
  }
};
