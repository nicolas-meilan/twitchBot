import axios, { AxiosError } from 'axios';
import http from 'http';
import url from 'url';
import { BASE_AUTH_URL } from '../../configuration/constants';
import { openBrowser } from '../../utils/system';
import { loadTokens, saveTokens, type Tokens } from '../../db/tokensdb';
import logger from '../../utils/logger';

export enum LoginType {
  BotUser = 'BOT_USER',
  BroadcastUser = 'BROADCAST_USER',
}

const CLIENT_ID = process.env.CLIENT_ID || '';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const LOGIN_REDIRECT_URI = process.env.LOGIN_REDIRECT_URI || '';
const ENVIRONMENT = process.env.ENVIRONMENT || '';
const LOGIN_PORT = process.env.LOGIN_PORT || '';

const TOKENS_GENERATION_ENDPOINT = '/oauth2/token';
const TOKEN_VALIDATION_ENDPOINT = '/oauth2/validate';

const LOCAL_ENVIRONMENT = 'local';

const SCOPES: Record<LoginType, string> = {
  [LoginType.BotUser]: 'chat:read chat:edit',
  [LoginType.BroadcastUser]: 'channel:manage:broadcast moderator:read:followers channel:read:subscriptions bits:read channel:read:redemptions clips:edit',
};

const buildLoginUrl = (type: LoginType) =>
  `${BASE_AUTH_URL}/oauth2/authorize?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(LOGIN_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES[type])}&state=${encodeURIComponent(type)}`;

const dispatchLogin = (type: LoginType) => {
  logger.info(`Awaiting login for ${type}...`);
  if (!ENVIRONMENT || ENVIRONMENT === LOCAL_ENVIRONMENT) {
    openBrowser(buildLoginUrl(type));
    return;
  }

  logger.info(`Please open the following URL in your browser to authorize the ${type}:`);
  logger.info(buildLoginUrl(type));
};

const obtainLoginCodeFromRedirect = () => new Promise<string>((resolve) => {
  const server = http.createServer(async (req, res) => {
    const queryObject = url.parse(req.url || '', true).query;

    if (queryObject.code) {
      res.end('<h1>Success, you can close this window.</h1>');
      logger.info('Login success');
      server.close();
      resolve((queryObject?.code || '').toString());
    }
  });

  server.listen(LOGIN_PORT);
});

const fetchTokens = async (code: string, type: LoginType): Promise<Tokens> => {
  try {
    logger.info(`Requesting new tokens for ${type}...`);
    const response = await axios.post<Tokens>(`${BASE_AUTH_URL}${TOKENS_GENERATION_ENDPOINT}`, null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: LOGIN_REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: SCOPES[type],
        code,
      },
    });
    logger.info(`Tokens retrieved successfully for ${type}.`);
    return response.data;
  } catch {
    logger.error(`Error fetching tokens for ${type}.`);
    throw new Error('Error fetching tokens');
  }
};

const validateAccessToken = async (accessToken: string): Promise<boolean> => {
  try {
    logger.info('Validating access token...');
    await axios.get(`${BASE_AUTH_URL}${TOKEN_VALIDATION_ENDPOINT}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    logger.info('Access token is valid.');
    return true;
  } catch {
    logger.error('Invalid access token.');
    return false;
  }
};

const refreshTokens = async (refreshToken: string, type: LoginType) => {
  try {
    logger.info(`Refreshing tokens for ${type}...`);
    const response = await axios.post<Tokens>(`${BASE_AUTH_URL}${TOKENS_GENERATION_ENDPOINT}`, null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
    });

    logger.info(`Tokens refreshed successfully for ${type}.`);

    const newTokens = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
    };

    saveTokens(type, newTokens);

    return newTokens;
  } catch {
    logger.error(`Error refreshing tokens for ${type}.`);
    throw new Error('Error refreshing tokens');
  }
};

const login = async (type: LoginType) => {
  dispatchLogin(type);
  const code = await obtainLoginCodeFromRedirect();
  const tokens = await fetchTokens(code, type);
  saveTokens(type, tokens);

  return tokens;
};

const getTokens = async (
  type: LoginType,
  {
    avoidLogin,
  }: {
    avoidLogin: boolean;
  } = {
    avoidLogin: false,
  }
) => {
  const tokens = await loadTokens(type);

  if (tokens) {
    logger.info(`Tokens loaded for ${type}.`);
    const accessTokenValid = await validateAccessToken(tokens.access_token);
    if (accessTokenValid) return tokens;

    try {
      const newTokens = await refreshTokens(tokens.refresh_token, type);

      return newTokens;
    } catch (error) {
      logger.info(`Error obtaining tokens for ${type}.`);
      const axiosError = error as AxiosError<{ error: string }>;
      if (axiosError.response && axiosError.response.data && axiosError.response.data.error === 'invalid_grant') {
        logger.info(`Tokens expired for ${type}.`);
        if (avoidLogin) return;

        return await login(type);
      }

      throw error;
    }
  }

  if (avoidLogin) return;

  return await login(type);
};

export const refreshBotTokens = (refreshToken: string) => refreshTokens(refreshToken, LoginType.BotUser);
export const refreshBroadcastTokens = (refreshToken: string) => refreshTokens(refreshToken, LoginType.BroadcastUser);

export const getBotTokens = (params?: { avoidLogin: boolean }) => getTokens(LoginType.BotUser, params);
export const getBroadcastTokens = (params?: { avoidLogin: boolean }) => getTokens(LoginType.BroadcastUser, params);
