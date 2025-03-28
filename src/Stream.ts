import axios from 'axios';
import logger from './utils/logger';
import { BASE_URL } from './configuration/constants';
import { getBroadcastTokens, getBotTokens } from './services/twitch/auth';

const BROADCAST_ACCOUNT_ID = process.env.BROADCAST_ACCOUNT_ID || '';
const CLIENT_ID = process.env.CLIENT_ID || '';

class Stream {
  static shared = new Stream();
  static offlineImage = 'https://static-cdn.jtvnw.net/jtv_user_pictures/82ffab06-9c72-4a6f-b12c-101a0b2dec59-channel_offline_image-1920x1080.png';
  isOnline: boolean = false;

  private constructor() {}

  async fetchStreamOnline() {
    const tokens = await getBroadcastTokens({ avoidLogin: true });

    if (!tokens) return;

    logger.info('Validating stream status...');

    try {
      const response = await axios.get<{
        data: { started_at: string }[];
      }>(`${BASE_URL}/helix/streams?user_id=${BROADCAST_ACCOUNT_ID}`, {
        headers: {
          'Client-ID': CLIENT_ID,
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      this.isOnline = !!response.data.data.length;

      return this.isOnline;
    } catch {
      logger.error('Error validating stream status');
      throw new Error('Error validating stream status');
    }
  }

  async initialize() {
    try {
      await getBroadcastTokens();
      await getBotTokens();
      Stream.shared.fetchStreamOnline();
    } catch {/* empty */}
  }
}

export default Stream;
