import { getBotTokens } from "../twitch/auth";

const VALORANT_API_KEY = process.env.VALORANT_API_KEY || '';

export type AiExternalEndpoint = {
  endpoint: string;
  baseBody?: Record<string, unknown>;
  baseHeader?: Record<string, string>;
  openApi: string;
};

const CLIENT_ID = process.env.CLIENT_ID || '';

const valorantEndpoint: AiExternalEndpoint = {
  endpoint: 'https://api.henrikdev.xyz',
  baseHeader: {
    'Authorization': VALORANT_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  openApi: 'https://api.henrikdev.xyz/openapi.json',
};

const twitchEndpoint: AiExternalEndpoint = {
  endpoint: 'https://api.twitch.tv/helix',
  baseHeader: {
    'Client-Id': CLIENT_ID,
    'Content-Type': 'application/json',
  },
  openApi: 'https://twitch-api-swagger.surge.sh/openapi.json',
};

const getValorantEndpoint = async () => valorantEndpoint;

const getTwitchEndpoint = async (): Promise<AiExternalEndpoint> => {
  const token = await getBotTokens({ avoidLogin: true });

  return {
    ...twitchEndpoint,
    baseHeader: {
      ...twitchEndpoint.baseHeader,
      'Authorization': `Bearer ${token?.access_token}`,
    }
  };
};

export const AiExternalEndpointsGetters = {
  twitch: getTwitchEndpoint,
  valorant: getValorantEndpoint,
};

export const AiExternalEndpointDocumentation = {
  twitch: twitchEndpoint.openApi,
  valorant: valorantEndpoint.openApi,
};
