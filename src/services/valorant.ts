import axios from "axios";

export const DEFAULT_VALORANT_USERNAME = 'rungekutta93';
export const DEFAULT_VALORANT_TAG = 'RK93';

const DEFAULT_VALORANT_REGION = 'latam';
const VALORANT_API_KEY = process.env.VALORANT_API_KEY || '';
const VALID_VALORANT_TAG_REGEX = /^[A-Za-z0-9]{1,5}$/;

export type ValorantData = {
  currenttierpatched: string;
  ranking_in_tier: number;
  mmr_change_to_last_game: number;
  elo: number;
};

const sanitizeValorantUsername = (value?: string) => {
  const sanitized = (value || '').trim().toLowerCase().replace(/^@/, '').replace(/[\p{Cf}\p{Mn}]/gu, '');
  return sanitized || DEFAULT_VALORANT_USERNAME;
};

const sanitizeValorantTag = (value?: string) => {
  const sanitized = (value || '').trim().toLowerCase().replace(/[^A-Za-z0-9]/g, '').slice(0, 5);
  return sanitized || DEFAULT_VALORANT_TAG;
};

export const parseValorantPlayer = (value?: string) => {
  const rawValue = (value || '').trim().replace(/^@/, '');
  const [usernamePart, tagPart] = rawValue.split('#');
  const username = sanitizeValorantUsername(usernamePart);
  const tag = sanitizeValorantTag(tagPart);
  const isValidTag = VALID_VALORANT_TAG_REGEX.test(tag);

  return {
    username,
    tag,
    isValidTag,
    label: `${username}#${tag}`,
  };
};

export const getValorantRankUrl = (value?: string) => {
  const { username, tag, isValidTag } = parseValorantPlayer(value);

  if (!isValidTag) {
    throw new Error('INVALID_VALORANT_TAG');
  }

  return `https://api.henrikdev.xyz/valorant/v1/mmr/${DEFAULT_VALORANT_REGION}/${username}/${tag}?season=e9a3`;
};

export const fetchCurrentRank = async (value?: string): Promise<ValorantData> => {
  try {
    const response = await axios.get<{
      data: ValorantData;
    }>(getValorantRankUrl(value), {
      headers: {
        'Authorization': VALORANT_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });

    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error('VALORANT_USER_NOT_FOUND');
    }

    if (error instanceof Error && error.message === 'INVALID_VALORANT_TAG') {
      throw error;
    }

    throw error;
  }
};
