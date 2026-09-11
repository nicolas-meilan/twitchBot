// import { getBotTokens } from "../twitch/auth";

import { DEFAULT_VALORANT_REGION, DEFAULT_VALORANT_TAG, DEFAULT_VALORANT_USERNAME } from "../valorant";

const VALORANT_API_KEY = process.env.VALORANT_API_KEY || '';

export type AiExternalEndpoint = {
  endpoint: string;
  description: string;
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
  maxResponseLength: 40000,
  description: `Todo tipo de datos de Valorant, historial extendido de partidas y rangos, análisis de partidas, perfiles de jugadores, datos de agentes, mapas, metadatos, etc.`,
  extraInformation: `
- Rutas:
  - Prioriza siempre las rutas /v1.
  - Prioriza siempre rutas "by name".
  - Prioriza siempre las rutas con menos parametros.
  - Para jugadores, usa {name}/{tag}.
  - Si tienes name#tag, debes usar name/tag y rutas "by name", evita usar # en las rutas.

- Valores
  - El param opcional "mode" o "gameMode", si no se especifica que values puede tener, no usarlo.

- Valores por defecto:
  - Si no especifican el {affinity} de la ruta o el param, usa "${DEFAULT_VALORANT_REGION}".
  - Si no especifican el {platform} de la ruta o el param, usa "pc".
  - Si el streamer te hace la consulta y no te dice el name y tag, que puede venir como name#tag, usá en la ruta, o como param: {name} "${DEFAULT_VALORANT_USERNAME}", {tag} "${DEFAULT_VALORANT_TAG}",

- Listados
  - Los listados vienen ordenados del mas reciente al mas antiguo, si te piden datos sobre eventos recientes no uses los endpoints Stored, y si el dato es sobre el evento más reciente, partida o lo que fuese, usa como param: size=1.

- Datos históricos:
  - Si piden datos históricos, máximos, mínimos, récords o valores que puedan ser de fechas muy viejas, prioriza los endpoints Stored y sin el param size o size=0.
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
    description: string;
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
