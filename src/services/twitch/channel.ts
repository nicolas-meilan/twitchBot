import axios from 'axios';
import { BASE_URL } from '../../configuration/constants';
import { Game } from '../../configuration/games';
import logger from '../../utils/logger';

const ACCOUNT_TRACK_ID = process.env.ACCOUNT_TRACK_ID || '';
const CLIENT_ID = process.env.CLIENT_ID || '';

const updateChannelInfoUrl = `${BASE_URL}/helix/channels?broadcaster_id=${ACCOUNT_TRACK_ID}`;

export const updateChannelInfo = async (accessToken: string, game: Game) => {
  try {
    logger.info('Sending new channel information ...');

    await axios.patch(
      updateChannelInfoUrl, {
        broadcaster_language: 'es',
        title: game.title,
        game_id: game.gameId,
        tags: game.tags,
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': CLIENT_ID,
          'Content-Type': 'application/json',
        },
      });

    logger.info('Channel information changed successfull');

  } catch {
    logger.error('Error changing channel information');
    throw new Error('Error changing channel information');
  }
};
