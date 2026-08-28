import axios from "axios";

const DEFAULT_VALORANT_USERNAME = 'rungekutta93';
const DEFAULT_VALORANT_TAG = 'RK93';
const DEFAULT_VALORANT_REGION = 'latam';
const VALORANT_API_KEY = process.env.VALORANT_API_KEY || '';

export type ValorantData = {
  currenttierpatched: string;
  ranking_in_tier: number;
  mmr_change_to_last_game: number;
  elo: number;
};

export const parseValorantPlayer = (value?: string) => {
  const rawValue = (value || '').trim().replace(/^@/, '').replace(/\s+/g, '');
  const [username, tag] = rawValue.split('#');

  return {
    username: username || DEFAULT_VALORANT_USERNAME,
    tag: tag || DEFAULT_VALORANT_TAG,
    label: `${username || DEFAULT_VALORANT_USERNAME}#${tag || DEFAULT_VALORANT_TAG}`,
  };
};

export const getValorantRankUrl = (value?: string) => {
  const { username, tag } = parseValorantPlayer(value);
  return `https://api.henrikdev.xyz/valorant/v1/mmr/${DEFAULT_VALORANT_REGION}/${username}/${tag}?season=e9a3`;
};

export const fetchCurrentRank = async (value?: string): Promise<ValorantData> => {
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
};
