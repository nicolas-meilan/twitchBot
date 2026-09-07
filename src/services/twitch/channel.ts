import axios from 'axios';
import { BASE_URL } from '../../configuration/constants';
import { Game } from '../../configuration/games';
import logger from '../../utils/logger';

const BROADCAST_ACCOUNT_ID = process.env.BROADCAST_ACCOUNT_ID || '';
const CLIENT_ID = process.env.CLIENT_ID || '';

const updateChannelInfoUrl = `${BASE_URL}/helix/channels?broadcaster_id=${BROADCAST_ACCOUNT_ID}`;
const searchGameIdUrl = `${BASE_URL}/helix/search/categories`;

const MAX_TITLE_LENGTH = 140;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 25;

type BaseGame = {
  id: string;
  name: string;
};

const sanitizeTitle = (title: string): string => {
  if (!title) return '';

  return title
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TITLE_LENGTH)
    .trim();
};

const sanitizeTag = (tag: string): string => {
  if (!tag) return '';

  return tag
    .trim()
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, MAX_TAG_LENGTH);
};

const sanitizeTags = (tags: string[]): string[] => {
  if (!Array.isArray(tags)) return [];

  const sanitizedTags = tags
    .map(sanitizeTag)
    .filter(Boolean);

  const uniqueTags = sanitizedTags.filter(
    (tag, index, array) =>
      array.findIndex(
        existingTag => existingTag.toLowerCase() === tag.toLowerCase(),
      ) === index,
  );

  return uniqueTags.slice(0, MAX_TAGS);
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

  } catch (error) {
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
    const sanitizedTitle = sanitizeTitle(game.title);
    const sanitizedTags = sanitizeTags(game.tags);

    const channelInfo = {
      broadcaster_language: 'es',
      title: sanitizedTitle,
      game_id: game.gameId,
      tags: sanitizedTags,
    };

    logger.info('Sending new channel information ...');

    await axios.patch(
      updateChannelInfoUrl,
      channelInfo,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': CLIENT_ID,
          'Content-Type': 'application/json',
        },
      },
    );

    logger.info('Channel information changed successfully');

  } catch (error) {
    if (axios.isAxiosError(error) && error?.response?.status === 401) {
      onAccessTokenExpired?.();

      return;
    }

    if (axios.isAxiosError(error)) {
      logger.error(
        `Error changing channel information: ${error.response?.status} ${JSON.stringify(error.response?.data)}`,
      );
    } else {
      logger.error('Error changing channel information');
    }

    throw new Error('Error changing channel information');
  }
};
