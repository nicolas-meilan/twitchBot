import axios from "axios";

const API_CHUCK_JOKES_URL = 'https://api.chucknorris.io/jokes/random';

export const fetchChuckJokes = async (): Promise<string> => {
  const response = await axios.get(API_CHUCK_JOKES_URL);
  
  return response.data;
};
