import axios from 'axios';
import { BASE_URL } from '../../configuration/constants';
import { Game } from '../../configuration/games';
import logger from '../../utils/logger';

const BROADCAST_ACCOUNT_ID = process.env.BROADCAST_ACCOUNT_ID || '';
const CLIENT_ID = process.env.CLIENT_ID || '';

const updateChannelInfoUrl = `${BASE_URL}/helix/channels?broadcaster_id=${BROADCAST_ACCOUNT_ID}`;
const searchGameIdUrl = `${BASE_URL}/helix/search/categories`;

type BaseGame = {
  id: string;
  name: string;
};

export const getGameId = async (
  accessToken: string,
  gameName: string,
  onAccessTokenExpired?: () => Promise<BaseGame | null>,
) => {
  try {
    logger.info('Searching game category ...');
    const url = `${searchGameIdUrl}?query=${encodeURIComponent(gameName)}`;

    const response = await axios.get<{
      data: BaseGame[];
    }>(url, {
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const categories = response.data.data;

    if (!categories.length) {
      logger.error('Unavailable game category');
      return null;
    }

    const exactMatch = categories.find((cat: BaseGame) => 
      cat.name.toLowerCase().replace(/\s+/g, '') === gameName.toLowerCase().replace(/\s+/g, '')
    );
    
    if (exactMatch) {
      logger.info('Game category found');
      return exactMatch;
    }

    logger.info('Game category found');
    return categories[0];

  } catch (error){
    if (axios.isAxiosError(error)
      && error?.response?.status === 401) return await onAccessTokenExpired?.() || null;

    logger.error('Error Searching game category');
    throw new Error('Error Searching game category');
  }
};

export const updateChannelInfo = async (
  accessToken: string,
  game: Game,
  onAccessTokenExpired?: () => void,
) => {
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

  } catch (error) {
    if (axios.isAxiosError(error) && error?.response?.status === 401) {
      onAccessTokenExpired?.();

      return;
    }
    logger.error('Error changing channel information');
    throw new Error('Error changing channel information');
  }
};
