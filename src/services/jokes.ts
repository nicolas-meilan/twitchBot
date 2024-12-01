import axios from "axios";

const JOKES_URL = 'https://v2.jokeapi.dev/joke/Any?lang=es';

type Joke = {
  type: 'twopart' | 'single',
  setup?: string,
  delivery?: string,
  joke?: string,
};

export const fetchJokes = async (): Promise<string> => {
  const response = await axios.get<Joke>(JOKES_URL);

  const joke = response.data.joke
    ? response.data.joke
    : `${response.data.setup} ➡️ ${response.data.delivery} 🤣`;

  return joke;
};
