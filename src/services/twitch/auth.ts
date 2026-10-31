import axios, { AxiosError } from 'axios';
import http from 'http';
import url from 'url';
import { BASE_AUTH_URL } from '../../configuration/constants';
import { openBrowser } from '../../utils/system';
import { loadTokens, saveTokens, type Tokens, type TwitchIdentity } from '../../db/tokensdb';
import logger from '../../utils/logger';

const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME?.trim().toLowerCase() || '';

type LoginType = 'BOT_USER' | typeof BROADCAST_USERNAME;
type ValidatedToken = TwitchIdentity & { expires_in: number };

export const LoginType = {
  BotUser: 'BOT_USER',
  BroadcastUser: BROADCAST_USERNAME,
};

const CLIENT_ID = process.env.CLIENT_ID || '';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const LOGIN_REDIRECT_URI = process.env.LOGIN_REDIRECT_URI || '';
const ENVIRONMENT = process.env.ENVIRONMENT || '';
const LOGIN_PORT = process.env.LOGIN_PORT || '';
const TOKENS_GENERATION_ENDPOINT = '/oauth2/token';
const TOKEN_VALIDATION_ENDPOINT = '/oauth2/validate';
const LOCAL_ENVIRONMENT = 'local';

const SCOPES: Record<LoginType, string> = {
  [LoginType.BotUser]: 'chat:read chat:edit clips:edit moderator:read:followers moderator:manage:banned_users',
  [LoginType.BroadcastUser]: 'channel:manage:broadcast moderator:read:followers channel:read:subscriptions bits:read channel:read:redemptions channel:manage:vips',
};

const buildLoginUrl = (type: LoginType) =>
  `${BASE_AUTH_URL}/oauth2/authorize?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(LOGIN_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES[type])}`;

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
      resolve(queryObject.code.toString());
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

const validateAccessToken = async (accessToken: string): Promise<TwitchIdentity | undefined> => {
  try {
    logger.info('Validating access token...');
    const response = await axios.get<ValidatedToken>(`${BASE_AUTH_URL}${TOKEN_VALIDATION_ENDPOINT}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const { user_id: userId, login } = response.data;
    if (!userId || !login) {
      throw new Error('Twitch returned an incomplete token identity.');
    }
    logger.info('Access token is valid.');
    return { user_id: userId, login: login.toLowerCase() };
  } catch {
    logger.info('Access token validation failed.');
    return undefined;
  }
};

const saveValidatedTokens = async (type: LoginType, tokens: Tokens): Promise<TwitchIdentity | undefined> => {
  if (type === LoginType.BotUser) {
    await saveTokens(type, tokens);
    return undefined;
  }

  const identity = await validateAccessToken(tokens.access_token);
  if (!identity) throw new Error('The broadcaster access token could not be validated.');
  if (identity.login !== type.toLowerCase()) {
    throw new Error(`The authorized Twitch account "${identity.login}" does not match "${type}".`);
  }
  await saveTokens(type, tokens, identity);
  process.env.BROADCAST_ACCOUNT_ID = identity.user_id;
  return identity;
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
    const newTokens = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
    };
    await saveValidatedTokens(type, newTokens);
    logger.info(`Tokens refreshed successfully for ${type}.`);
    return newTokens;
  } catch (error) {
    logger.error(`Error refreshing tokens for ${type}.`);
    throw error;
  }
};

const login = async (type: LoginType) => {
  dispatchLogin(type);
  const code = await obtainLoginCodeFromRedirect();
  const tokens = await fetchTokens(code, type);
  await saveValidatedTokens(type, tokens);
  return tokens;
};

const getTokens = async (
  type: LoginType,
  { avoidLogin }: { avoidLogin: boolean } = { avoidLogin: false },
) => {
  if (!type) throw new Error('A broadcaster username is required to load user tokens.');
  const tokens = await loadTokens(type);

  if (tokens) {
    logger.info(`Tokens loaded for ${type}.`);
    const identity = await validateAccessToken(tokens.access_token);
    if (identity) {
      if (type !== LoginType.BotUser) {
        if (identity.login !== type.toLowerCase()) {
          throw new Error(`The token belongs to "${identity.login}", not "${type}".`);
        }
        await saveTokens(type, tokens, identity);
        process.env.BROADCAST_ACCOUNT_ID = identity.user_id;
      }
      return tokens;
    }

    try {
      return await refreshTokens(tokens.refresh_token, type);
    } catch (error) {
      logger.info(`Unable to refresh tokens for ${type}.`);
      const axiosError = error as AxiosError<{ error: string }>;
      if (axiosError.response?.data?.error === 'invalid_grant') {
        logger.info(`Tokens expired for ${type}.`);
        if (avoidLogin) return undefined;
        return login(type);
      }
      throw error;
    }
  }

  if (avoidLogin) return undefined;
  return login(type);
};

export const refreshBotTokens = (refreshToken: string) => refreshTokens(refreshToken, LoginType.BotUser);
export const refreshBroadcastTokens = (refreshToken: string) => refreshTokens(refreshToken, LoginType.BroadcastUser);
export const getBotTokens = (params?: { avoidLogin: boolean }) => getTokens(LoginType.BotUser, params);
export const getBroadcastTokens = (params?: { avoidLogin: boolean }) => getTokens(LoginType.BroadcastUser, params);

export const initializeBroadcastSession = async (): Promise<void> => {
  if (!BROADCAST_USERNAME) throw new Error('Pass the Twitch username to the start command.');
  await getBroadcastTokens();
  if (!process.env.BROADCAST_ACCOUNT_ID) {
    throw new Error(`Could not resolve the Twitch account ID for "${BROADCAST_USERNAME}".`);
  }
};
