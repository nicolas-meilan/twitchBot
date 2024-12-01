import axios from "axios";

const API_RANK_URL = 'https://api.henrikdev.xyz/valorant/v1/mmr/latam/rungekutta93/RK93?season=e9a3';
const VALORANT_API_KEY = process.env.VALORANT_API_KEY || '';


export type ValorantData = {
  currenttierpatched: string;
  ranking_in_tier: number;
  mmr_change_to_last_game: number;
  elo: number;
};

export const fetchCurrentRank = async (): Promise<ValorantData> => {
  const response = await axios.get<{
    data: ValorantData;
  }>(API_RANK_URL, {
    headers: {
      'Authorization': VALORANT_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  });

  return response.data.data;
};
