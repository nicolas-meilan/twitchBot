import axios, { AxiosError } from 'axios';
import http from 'http';
import url from 'url';
import { BASE_URL } from '../configuration/constants';
import { openBrowser } from '../utils/system';
import { loadTokens, saveTokens, type Tokens } from '../utils/db';
import logger from '../utils/logger';

const CLIENT_ID = process.env.CLIENT_ID || '';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';

const TOKENS_GENERATION_ENDPOINT = '/oauth2/token';
const TOKEN_VALIDATION_ENDPOINT = '/oauth2/validate';

const LOGIN_REDIRECT_URI = 'http://localhost:3339';
const SCOPE = 'chat:read chat:edit';

const LOGIN_URL = `${BASE_URL}/oauth2/authorize?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(LOGIN_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPE)}`;

const dispatchLogin = () => {
  logger.info('Awaiting login...');
  openBrowser(LOGIN_URL);
};

const obtaionLoginCodeFromRedirect = () => new Promise<string>((resolve) => {
  const server = http.createServer(async (req, res) => {
    const queryObject = url.parse(req.url || '', true).query;

    if (queryObject.code) {
      res.end('<h1>Success, you can close the windows.</h1>');
      logger.info('Login success');
      server.close();
      resolve((queryObject?.code || '').toString());
    }
  });

  server.listen(3339);
});

const fetchTokens = async (code: string): Promise<Tokens> => {
  try {
    logger.info('Requesting new tokens...');
    const response = await axios.post<Tokens>(`${BASE_URL}${TOKENS_GENERATION_ENDPOINT}`, null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: LOGIN_REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: 'chat:read chat:edit',
        code,
      },
    });
    logger.info('Tokens retrieved successfully.');
    return response.data;
  } catch {
    logger.error('Error fetching tokens');
    throw new Error('Error fetching tokens');
  }
};

const validateAccessToken = async (accessToken: string): Promise<boolean> => {
  try {
    logger.info('Validating tokens...');
    await axios.get(`${BASE_URL}${TOKEN_VALIDATION_ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    logger.info('Tokens valids');
    return true;
  } catch {
    logger.error('Invalid tokens');
    return false;
  }
};

const refreshTokens = async (refreshToken: string) => {
  try {
    logger.info('Refreshing tokens...');
    const response = await axios.post<Tokens>(`${BASE_URL}${TOKENS_GENERATION_ENDPOINT}`, null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }
    });

    logger.info('Tokens retrieved successfully.');
    return response.data;
  } catch {
    logger.error('Error fetching tokens');
    throw new Error('Error fetching tokens');
  }
};

const login = async () => {
  dispatchLogin();
  const code = await obtaionLoginCodeFromRedirect();
  const tokens = await fetchTokens(code);
  saveTokens(tokens);

  return tokens;
};

const getTokens = async () => {
  const tokens = await loadTokens();

  if (tokens) {
    logger.info('Tokens loaded');
    const accessTokenValid = await validateAccessToken(tokens.access_token);
    if (accessTokenValid) return tokens;

    try {
      const newTokens = await refreshTokens(tokens.refresh_token);
      saveTokens(newTokens);

      return newTokens;
    } catch (error) {
      logger.info('Error obtaining tokens');
      const axiosError = error as AxiosError<{ error: string }>;
      if (axiosError.response && axiosError.response.data && axiosError.response.data.error === 'invalid_grant') {
        logger.info('Tokens expireds');
        return await login();
      }

      throw error;
    }
  }

  return await login();
};

export default getTokens;
