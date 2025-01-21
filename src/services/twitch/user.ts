import axios from 'axios';
import logger from '../../utils/logger';
import { BASE_URL } from '../../configuration/constants';

const CLIENT_ID = process.env.CLIENT_ID || '';

type User = {
  id: string;
  login: string;
  display_name: string;
};

export const getUserIdByUsername = async (
  accessToken: string,
  username: string,
): Promise<string | null> => {
  try {
    logger.info(`Fetching user ID for username: ${username}...`);
    const response = await axios.get<{ data: User[] }>(
      `${BASE_URL}/helix/users`,
      {
        params: { login: username },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': CLIENT_ID,
        },
      },
    );

    const user = response.data.data[0];
    if (!user) {
      logger.warn(`No user found with username: ${username}`);
      return null;
    }

    logger.info(`User ID for username ${username}: ${user.id}`);
    return user.id;
  } catch (error) {
    logger.error(`Error fetching user ID for username: ${username}`);
    throw error;
  }
};
