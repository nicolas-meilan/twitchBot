// import { getBotTokens } from "../twitch/auth";

const VALORANT_API_KEY = process.env.VALORANT_API_KEY || '';

export type AiExternalEndpoint = {
  endpoint: string;
  baseBody?: Record<string, unknown>;
  baseHeader?: Record<string, string>;
  documentation: string;
  extraInformation?: string;
  filterUrlsInResponse?: boolean;
  maxResponseLength?: number;
};

// const CLIENT_ID = process.env.CLIENT_ID || '';

const valorantEndpoint: AiExternalEndpoint = {
  endpoint: 'https://api.henrikdev.xyz',
  baseHeader: {
    'Authorization': VALORANT_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  documentation: 'https://api.henrikdev.xyz/openapi.json',
  filterUrlsInResponse: true,
  extraInformation: `
REGLAS OBLIGATORIAS PARA INFORMACIÓN EXTERNA DE VALORANT:

- Rutas:
  - Prioriza siempre las rutas /v1.
  - Para jugadores, usa {name}/{tag}.
  - No uses rutas con {puuid} si existe una alternativa con {name}/{tag}.

- Valores por defecto:
  - Si no especifican {affinity}, usa "latam".
  - Si no especifican {platform}, usa "pc".

- Datos históricos:
  - Si piden datos históricos, máximos, mínimos, récords o valores anteriores, prioriza los endpoints Stored.
  - Los endpoints Stored tienen un historial más amplio.
`,
};

// const twitchEndpoint: AiExternalEndpoint = {
//   endpoint: 'https://api.twitch.tv/helix',
//   baseHeader: {
//     'Client-Id': CLIENT_ID,
//     'Content-Type': 'application/json',
//   },
//   documentation: 'https://twitch-api-swagger.surge.sh/openapi.json',
// };

// const getTwitchEndpoint = async (): Promise<AiExternalEndpoint> => {
//   const token = await getBotTokens({ avoidLogin: true });

//   return {
//     ...twitchEndpoint,
//     baseHeader: {
//       ...twitchEndpoint.baseHeader,
//       'Authorization': `Bearer ${token?.access_token}`,
//     }
//   };
// };

const getValorantEndpoint = async () => valorantEndpoint;

export const AiExternalEndpoints: {
  [key: string]: {
    baseEndpoint: AiExternalEndpoint;
    endpointGetter: () => Promise<AiExternalEndpoint>;
    documentation: string;
    extraInformation?: string;
    filterUrlsInResponse?: boolean;
    maxResponseLength?: number;
  };
} = {
  valorant: {
    ...valorantEndpoint,
    baseEndpoint: valorantEndpoint,
    endpointGetter: getValorantEndpoint,
  },
  // twitch: {
  //   baseEndpoint: twitchEndpoint,
  //   endpointGetter: getTwitchEndpoint,
  //   documentation: twitchEndpoint.openApi,
  //   extraInformation: twitchEndpoint?.extraInformation,
  // },
};
