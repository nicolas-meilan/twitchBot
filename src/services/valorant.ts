import axios from "axios";

const API_RANK_URL = 'https://api.kyroskoh.xyz/valorant/v1/mmr/latam/rungekutta93/RK93';

export const fetchCurrentRank = async (): Promise<string> => {
  const response = await axios.get(API_RANK_URL);
  
  return response.data;
};
