import axios from 'axios';
import logger from '../utils/logger';
import { BASE_URL } from '../configuration/constants';
import getTokens from './twitch/auth';

const ACCOUNT_TRACK_ID = process.env.ACCOUNT_TRACK_ID || '';
const CLIENT_ID = process.env.CLIENT_ID || '';

class Stream {
  static shared = new Stream();
  isOnline: boolean = false;

  private constructor() {}

  async initialize() {
    const tokens = await getTokens();
    if (!tokens) return;

    logger.info('Validating stream status...');
    try {
      const response = await axios.get<{
        data: { started_at: string }[];
      }>(`${BASE_URL}/helix/streams?user_id=${ACCOUNT_TRACK_ID}`, {
        headers: {
          'Client-ID': CLIENT_ID,
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      this.isOnline = !!response.data.data.length;
    } catch {
      logger.error('Error validating stream status');
    }
  }
}

export default Stream;
