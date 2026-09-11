// import { getBotTokens } from "../twitch/auth";

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
  description: `Una base de datos integral sobre estadísticas de partidas, rangos competitivos, perfiles de jugadores, habilidades de agentes, mapas, metadatos, etc. Sobre Valorant.`,
  extraInformation: `
INFORMACIÓN EXTERNA DE VALORANT:

- Descripcion:
Buscar informacion detallada sobre valorant, o sobre un usuario de valorant.

- Rutas:
  - Prioriza siempre las rutas /v1.
  - Prioriza siempre rutas "by name".
  - Prioriza siempre las rutas con menos parametros.
  - Para jugadores, usa {name}/{tag}.
  - Si tienes name#tag, debes usar name/tag y rutas "by name", evita usar # en las rutas.

- Valores por defecto:
  - Si no especifican el {affinity} de la ruta, usa "latam".
  - Si no especifican el {platform} de la ruta, usa "pc".

- Datos históricos:
  - Si piden datos históricos, máximos, mínimos, récords o valores que puedan ser de fechas muy viejas, prioriza los endpoints Stored y sin el param size.
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
