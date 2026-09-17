import { PLAYERS_QUEUE_PRIORITY_BENEFITS } from '../../configuration/chat';

import { UserRole } from '../../actions/userRoles';

import gameQueue from '../../services/GameQueue';

import {
  getCommandDefinitions,
  getCommandDescription,
} from '../../configuration/commandDescriptions';

import { AiExternalEndpoints } from './aiExternalEndpoints';
import { AI_EXTERNAL_ACTIONS } from './types';

export const AI_URL = process.env.AI_URL!;
export const AI_MODEL = process.env.AI_MODEL!;
export const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS!);
export const AI_MEMORY_MESSAGES = Number(process.env.AI_MEMORY_MESSAGES!);
export const AI_LOG_TOKEN_USAGE = process.env.AI_LOG_TOKEN_USAGE === 'true';
export const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME!;
export const BOT_USERNAME = process.env.BOT_USERNAME!;

export const AI_MENTION = `@${BOT_USERNAME}`;
let aiExternalInformationEnabled = false;

export const setAiExternalInformationEnabled = (enabled: boolean): boolean => {
  aiExternalInformationEnabled = enabled;
  return aiExternalInformationEnabled;
};

export const isAiExternalInformationEnabled = (): boolean => aiExternalInformationEnabled;

export const AI_MAX_QUEUE_SIZE = 6;
export const AI_MAX_EXTERNAL_STEPS = 10;
export const AI_MAX_RESPONSE_FIELDS = 10;
export const AI_EXTERNAL_ENDPOINT_FIELD_TITLES = {
  METHOD: 'METHOD',
  PATH: 'PATH',
  SUMMARY: 'SUMMARY',
} as const;
export const AI_EXTERNAL_ENDPOINT_CATALOG_SEPARATOR = ' - ';
export const AI_EXTERNAL_WORKFLOW_STAGES = {
  INITIAL: 'initial',
  CATALOG: 'catalog',
  DETAIL: 'detail',
  PARAMS: 'params',
  RESULT: 'result',
} as const;
export type AiExternalWorkflowStage = typeof AI_EXTERNAL_WORKFLOW_STAGES[
  keyof typeof AI_EXTERNAL_WORKFLOW_STAGES
];

const END_LINE = '--------------------------------------------------------------------------';

export const AI_EXTERNAL_INFO_ERROR_MESSAGE = 'No pude obtener esa información.';
export const AI_EXTERNAL_INFO_NO_DATA_MESSAGE = 'No encontré datos para esa consulta.';
export const AI_EXTERNAL_CATALOG_REQUIRED_ERROR_MESSAGE = 'ERROR_REINTENTABLE: primero debés usar list_endpoints para recibir ENDPOINTS_LIST antes de solicitar DETAIL_ENDPOINT.';
export const AI_EXTERNAL_COMMAND_FORBIDDEN_ERROR_MESSAGE = 'ERROR_REINTENTABLE: durante el flujo de información externa no uses command. Devolvé externalInformation con la acción correspondiente a la etapa actual.';
export const AI_EXTERNAL_ACTION_STAGE_ERROR_MESSAGE = 'ERROR_REINTENTABLE: la acción no corresponde a la etapa actual del flujo externo. Usá exclusivamente la acción indicada por el prompt de la etapa y conservá la información ya obtenida.';
export const AI_DECISION_TYPES = {
  COMMAND: 'COMMAND',
  EXTERNAL_INFORMATION: 'EXTERNAL_INFORMATION',
  SMALL_CONVERSATION: 'SMALL_CONVERSATION',
} as const;
export const AI_EXTERNAL_FIELD_TRANSLATIONS: Record<string, string> = {
  path: 'ruta',
  query: 'consulta',
  body: 'cuerpo',
  method: 'método',
  route: 'ruta',
  responseFields: 'campos de respuesta',
};
export const AI_EXTERNAL_FIELD_PATTERN = new RegExp(
  `\\b(${Object.keys(AI_EXTERNAL_FIELD_TRANSLATIONS).join('|')})\\b`,
  'g',
);
export const AI_CONTENT_TO_PROTECT_PATTERN = /https?:\/\/\S+|`[^`]*`/g;
export const AI_PROTECTED_CONTENT_TOKEN = '__AI_PROTECTED_CONTENT_';
export const AI_PROTECTED_CONTENT_PATTERN = new RegExp(
  `${AI_PROTECTED_CONTENT_TOKEN}(\\d+)__`,
  'g',
);

export const translateAiExternalField = (field: string): string => field
  .split('.')
  .map((part) => AI_EXTERNAL_FIELD_TRANSLATIONS[part] || part)
  .join('.');

export const AI_EXTERNAL_CATALOG_DELIVERED_PROMPT = [
  'ESTADO DEL FLUJO EXTERNO',
  'El backend ya obtuvo y entregó ENDPOINTS_LIST.',
  'PRÓXIMO PASO OBLIGATORIO: get_endpoint_detail.',
  'Elegí una ruta del catálogo y devolvé exclusivamente el JSON correspondiente.',
].join('\n');
export const getAiExternalMissingRequestMessage = (action: string): string => (
  `ERROR: falta method o route para ${action}.`
);

export const getAiExternalRequiredDataMessage = (fields: string[]): string => (
  `ERROR_REINTENTABLE: faltan datos obligatorios para ejecutar la consulta: ${fields.map(translateAiExternalField).join(', ')}.\nNo ejecutes el endpoint ni inventes valores. Respondé al usuario pidiendo únicamente esos datos para poder continuar.`
);

export const getAiExternalEndpointErrorMessage = (font: string): string => (
  `ERROR: el endpoint "${font}" devolvió un error.`
);

export const getAiResponseFieldsMismatchMessage = (shapeHint?: string): string => (
  `ERROR_REINTENTABLE: ninguno de los campos indicados en "responseFields" existe en la respuesta real.\nEstructura real de la respuesta: ${shapeHint}\nGenerá un nuevo "responseFields" usando exactamente esos nombres y esa anidación, incluyendo claves contenedoras como "data" o "results" si están presentes.\nNo inventes nombres de campo que no aparezcan en esta estructura ni en DETAIL_ENDPOINT.`
);

export const getAiExternalRequestRetryMessage = (errorMessage: string): string => (
  `ERROR_REINTENTABLE: ${errorMessage}\nLa solicitud externa anterior falló porque la ruta utilizada no está documentada o no es válida.\nNO vuelvas a utilizar esa misma ruta.\nVolvé a revisar ENDPOINTS_LIST y, si corresponde, DETAIL_ENDPOINT antes de generar una nueva solicitud.\nGenerá una nueva externalInformation usando únicamente una ruta que esté documentada.`
);

export const getAiUnknownExternalActionMessage = (action: string): string => (
  `ERROR: acción desconocida "${action}".`
);

export const getAiRequiredRoleDescription = (role: UserRole): string => {
  if (role === UserRole.VIP) return 'VIP, moderador o broadcaster';
  if (role === UserRole.MOD) return 'moderador o broadcaster';
  return 'broadcaster';
};

export const getAiAccessDeniedMessage = (actionNotAllowed: string, role: UserRole, command: string): string => (
  `${actionNotAllowed}: necesitás ser ${getAiRequiredRoleDescription(role)} para usar ${command}.`
);

export const getAiCommandCompletedMessage = (command: string): string => `Listo, ejecuté ${command}.`;
export const AI_EXTERNAL_CONTEXT_FONT = '__FONT__';
export const AI_EXTERNAL_CONTEXT_TYPES = {
  ENDPOINTS_LIST: 'ENDPOINTS_LIST',
  DETAIL_ENDPOINT: 'DETAIL_ENDPOINT',
  REQUEST_RESULT: 'REQUEST_RESULT',
};
export const AI_EXTERNAL_CONTEXT_ENDPOINTS_LIST = `[${AI_EXTERNAL_CONTEXT_FONT}_${AI_EXTERNAL_CONTEXT_TYPES.ENDPOINTS_LIST}]`;
export const AI_EXTERNAL_CONTEXT_DETAIL_ENDPOINT = `[${AI_EXTERNAL_CONTEXT_FONT}_${AI_EXTERNAL_CONTEXT_TYPES.DETAIL_ENDPOINT}]`;
export const AI_EXTERNAL_CONTEXT_REQUEST_RESULT = `[${AI_EXTERNAL_CONTEXT_FONT}_${AI_EXTERNAL_CONTEXT_TYPES.REQUEST_RESULT}]`;

export const ADVANCED_SEARCH_COMMAND = '!busquedaAvanzada';

export type AiExternalContextType = typeof AI_EXTERNAL_CONTEXT_TYPES[
  keyof typeof AI_EXTERNAL_CONTEXT_TYPES
];

const getAiCommandsGuide = () => {
  const priorityBenefits = gameQueue.getPriorityBenefitsDescription();

  const commands = getCommandDefinitions();

  return [...commands.entries()]
    .sort(([firstCommand], [secondCommand]) => firstCommand.localeCompare(secondCommand))
    .map(([command, permission]) => {
      const { description, usage } = getCommandDescription(command);

      const details = `${description}; uso: ${usage}`
        .replace(PLAYERS_QUEUE_PRIORITY_BENEFITS, priorityBenefits);

      return `- (${command}): ${details}; permiso: ${permission}`;
    })
    .join('\n');
};

const getAiExternalFontsGuide = () => Object.entries(AiExternalEndpoints)
  .sort(([first], [second]) => first.localeCompare(second))
  .map(([name, configuration]) => [
    `Fuente Externa: ${name} - Descripción: ${configuration.description}`,
    configuration.extraInformation?.trim()
      ? `Reglas adicionales de ${name}:\n${configuration.extraInformation.trim()}`
      : '',
  ].filter(Boolean).join('\n'))
  .join('\n');

export const getAiExternalFontGuide = (font: string): string => {
  const configuration = AiExternalEndpoints[font];
  if (!configuration) return '';

  return [
    `REGLAS DE LA FUENTE EXTERNA: ${font}`,
    `Descripción: ${configuration.description}`,
    configuration.extraInformation?.trim() || '',
  ].filter(Boolean).join('\n');
};

const AI_IDENTITY_PROMPT = [
  `IDENTIDAD Y PERSONALIDAD`,
  `Sos ${BOT_USERNAME}, el asistente bot del canal de Twitch de ${BROADCAST_USERNAME}.`,
  `${BROADCAST_USERNAME} es el streamer/broadcaster, usá toda la información disponible que tengas sobre el cuando te consulte algo.`,
  `Hablás en español argentino (con voseo), siendo natural, divertido y resolutivo.`,
  `No sos el streamer, sos el bot. Mantené el contexto sin inventar nada que no se haya dicho.`,
].join('\n');

const AI_DECISION_PROMPT_WITH_EXTERNAL_INFORMATION = [
  `FLUJO DE DECISIÓN`,
  `Elegí una acción por mensaje respetando esta prioridad: 1. ${AI_DECISION_TYPES.COMMAND} sólo si un único comando cubre completamente todos los pedidos y datos solicitados; 2. ${AI_DECISION_TYPES.EXTERNAL_INFORMATION} si el comando no cubre aunque sea una parte del pedido o si la consulta requiere datos externos; 3. ${AI_DECISION_TYPES.SMALL_CONVERSATION}.`,
  `La prioridad no autoriza a usar un comando parcialmente útil. Si el mensaje combina una capacidad de comando con otra capacidad no descrita por ese comando, descartá el comando completo y aplicá ${AI_DECISION_TYPES.EXTERNAL_INFORMATION}.`,
  `Si crees no tener acceso a algún dato o información, probá las reglas ${AI_DECISION_TYPES.EXTERNAL_INFORMATION} en vez de ${AI_DECISION_TYPES.SMALL_CONVERSATION}.`,
].join('\n');

const AI_DECISION_PROMPT_WITHOUT_EXTERNAL_INFORMATION = [
  `FLUJO DE DECISIÓN`,
  `Elegí ${AI_DECISION_TYPES.COMMAND} sólo si un único comando cubre completamente todos los pedidos y datos solicitados; en cualquier otro caso elegí ${AI_DECISION_TYPES.SMALL_CONVERSATION}.`,
  `La información externa está desactivada: no uses externalInformation ni inventes datos.`,
].join('\n');

const AI_COMMAND_PROMPT = [
  `${AI_DECISION_TYPES.COMMAND}`,
  `Analizá si algún comando del listado [AVAILABLE_COMMANDS] soluciona el 100% del pedido basado únicamente en su descripción y uso.`,
  `El comando debe cubrir todas las entidades, períodos, cantidades, métricas, cálculos y restricciones solicitadas. Si falta una sola capacidad, NO USES EL COMANDO.`,
  `Aplicar el comando quiere decir devolver el campo "command" completo y mantener "externalInformation" en null.`,
  `No inventes ni asumas que el comando hace más de lo descrito.`,
  `[AVAILABLE_COMMANDS]`,
  `${getAiCommandsGuide()}`,
  END_LINE,
].join('\n');

const AI_EXTERNAL_DECISION_PROMPT = [
  `${AI_DECISION_TYPES.EXTERNAL_INFORMATION}`,
  `Revisá el listado [AVAILABLE_EXTERNAL_INFORMATION_SOURCES].`,
  `Si la descripción o nombre de la fuente externa coincide MÍNIMAMENTE con la consulta, elegí ${AI_DECISION_TYPES.EXTERNAL_INFORMATION} y usá action "${AI_EXTERNAL_ACTIONS.LIST_ENDPOINTS}".`,
  `Formato requerido: "externalInformation":{"action":"${AI_EXTERNAL_ACTIONS.LIST_ENDPOINTS}","font":"NOMBRE_FUENTE", "query":"consulta resuelta", "route": null, "responseFields": null, "method": null, "params": null, "body": null}.`,
  `La "query" debe sintetizar todo el pedido usando el mensaje actual y el historial relevante: entidad, usuario/tag, región, período, métrica y restricciones. No inventes datos faltantes.`,
].join('\n');

const AI_EXTERNAL_INFORMATION_SOURCES_PROMPT = [
  `[AVAILABLE_EXTERNAL_INFORMATION_SOURCES]`,
  `${getAiExternalFontsGuide()}`,
  END_LINE
].join('\n');

const AI_EXTERNAL_INFORMATION_PROMPTS = [
  AI_EXTERNAL_DECISION_PROMPT,
  AI_EXTERNAL_INFORMATION_SOURCES_PROMPT,
].join('\n');
const AI_NO_EXTERNAL_INFORMATION_PROMPTS = '';

const AI_SMALL_CONVERSATION_PROMPT = [
  `${AI_DECISION_TYPES.SMALL_CONVERSATION}`,
  `Usá ${AI_DECISION_TYPES.SMALL_CONVERSATION} SOLO si no aplica ${AI_DECISION_TYPES.COMMAND} ni ${AI_DECISION_TYPES.EXTERNAL_INFORMATION}.`,
  `Si es una consulta de datos y no sabés la respuesta, decí que no sabés. No asumas ni inventes.`,
  `PROHIBIDO USAR PARA DATOS: Si la consulta del usuario involucra una petición de información o ejecución de acción, JAMÁS inventes una respuesta conversacional.`,
].join('\n');

const AI_VERACITY_PROMPT = [
  `VERACIDAD ESTRICTA`,
  `Nunca inventes datos, comandos, rutas, parámetros, estadísticas ni resultados.`,
  `El historial de chat da contexto, pero NO es evidencia de datos factuales. Validá siempre con comandos o fuentes.`,
].join('\n');

const AI_OUTPUT_FORMAT_PROMPT = [
  `FORMATO DE SALIDA`,
  `Devolvé estrictamente el JSON requerido por el schema.`,
  `"command" y "externalInformation" son mutuamente excluyentes: nunca los devuelvas juntos; usá null en el campo que no corresponda.`,
  `"answer" debe ser texto limpio, sin formato markdown (sin negritas, cursivas ni encabezados).`,
].join('\n');

const AI_EXTERNAL_CATALOG_STAGE_PROMPT = [
  `ETAPA: OBTENER CATÁLOGO DE ENDPOINTS`,
  `Completá externalInformation con action "${AI_EXTERNAL_ACTIONS.LIST_ENDPOINTS}".`,
  `Usá el nombre de la fuente en font y la consulta resuelta en query.`,
  `Completá method, route, params, body y responseFields con null.`,
  `El backend devolverá ENDPOINTS_LIST para seleccionar el endpoint adecuado.`,
].join('\n');

const AI_EXTERNAL_INITIAL_STAGE_PROMPT = [
  `ETAPA: INICIAR INFORMACIÓN EXTERNA`,
  `Completá externalInformation con action "${AI_EXTERNAL_ACTIONS.LIST_ENDPOINTS}".`,
  `Usá el nombre de la fuente en font y sintetizá la consulta completa en query.`,
  `Completá method, route, params, body y responseFields con null.`,
  `El backend usará esta información para entregar ENDPOINTS_LIST.`,
].join('\n');

const AI_EXTERNAL_DETAIL_STAGE_PROMPT = [
  `ETAPA: OBTENER DETALLE DEL ENDPOINT`,
  `Completá externalInformation con action "${AI_EXTERNAL_ACTIONS.GET_ENDPOINT_DETAIL}".`,
  `Copiá method y route literalmente desde la entrada elegida de ENDPOINTS_LIST.`,
  `Usá la fuente correspondiente en font y conservá la consulta en query.`,
  `Completá params, body y responseFields con null.`,
  `El backend devolverá DETAIL_ENDPOINT con la documentación necesaria para ejecutar la solicitud.`,
].join('\n');

const AI_EXTERNAL_EXECUTION_STAGE_PROMPT = [
  `ETAPA: EJECUTAR SOLICITUD EXTERNA`,
  `Completá externalInformation con action "${AI_EXTERNAL_ACTIONS.EXECUTE_REQUEST}".`,
  `Copiá font, method y route desde DETAIL_ENDPOINT.`,
  `Completá params y body con los valores documentados y disponibles para la consulta.`,
  `No inventes parámetros ni identificadores. Completá responseFields con el conjunto mínimo de rutas completas que responde la consulta, sin campos adicionales ni duplicados.`,
  `Usá rutas completas con puntos, por ejemplo ["data.tier.name", "data.elo"]. Preferí pocos campos directamente relevantes.`,
  `Elegí los valores internos necesarios para responder y conservá todos los niveles desde la raíz.`,
  `En arrays, expresá la ruta mediante sus propiedades, por ejemplo "data.tier.name".`,
  `El backend devolverá REQUEST_RESULT con los datos reales para redactar la respuesta.`,
].join('\n');

const AI_EXTERNAL_PARAMS_STAGE_PROMPT = [
  `ETAPA: RESOLVER PARÁMETROS PREVIOS`,
  `Analizá DETAIL_ENDPOINT y el estado del flujo para decidir la próxima solicitud.`,
  `Si todos los parámetros de la consulta principal están disponibles, devolvé action "${AI_EXTERNAL_ACTIONS.EXECUTE_REQUEST}".`,
  `Si falta un parámetro, devolvé action "${AI_EXTERNAL_ACTIONS.OBTAIN_PARAMS}" y ejecutá un GET auxiliar documentado que permita obtenerlo.`,
  `Para "${AI_EXTERNAL_ACTIONS.OBTAIN_PARAMS}", usá method y route del endpoint auxiliar, params disponibles y responseFields sólo con los campos necesarios para resolver el parámetro.`,
  `responseFields siempre debe usar rutas completas desde la raíz documentada. Para arrays, omití el índice y usá las propiedades de cada elemento.`,
  `La respuesta del GET auxiliar contendrá sólo los campos indicados por responseFields para que puedas extraer el valor real.`,
  `No inventes parámetros, identificadores ni valores.`,
  `Con el resultado de este paso, continuá en esta etapa para completar los parámetros restantes o ejecutar la consulta principal.`,
].join('\n');

const AI_EXTERNAL_FINAL_STAGE_PROMPT = [
  `ETAPA: REDACTAR RESPUESTA FINAL`,
  `Si REQUEST_RESULT contiene todos los datos solicitados, completá answer usando únicamente esos datos.`,
  `Usá command: null y externalInformation: null.`,
  `Si los datos no alcanzan para responder, explicalo brevemente.`,
  `Las tablas con formato {"__ai_format":"table","columns":[...],"rows":[...]} representan filas cuyos valores corresponden por posición a columns.`,
].join('\n');

const createExternalStagePrompt = (stagePrompt: string): string => [
  AI_IDENTITY_PROMPT,
  stagePrompt,
  AI_VERACITY_PROMPT,
  AI_OUTPUT_FORMAT_PROMPT,
].join('\n');

export const AI_EXTERNAL_CATALOG_PROMPT = createExternalStagePrompt(AI_EXTERNAL_CATALOG_STAGE_PROMPT);
export const AI_EXTERNAL_INITIAL_PROMPT = createExternalStagePrompt(AI_EXTERNAL_INITIAL_STAGE_PROMPT);
export const AI_EXTERNAL_DETAIL_PROMPT = createExternalStagePrompt(AI_EXTERNAL_DETAIL_STAGE_PROMPT);
export const AI_EXTERNAL_PARAMS_PROMPT = createExternalStagePrompt(AI_EXTERNAL_PARAMS_STAGE_PROMPT);
export const AI_EXTERNAL_EXECUTION_PROMPT = createExternalStagePrompt(AI_EXTERNAL_EXECUTION_STAGE_PROMPT);
export const AI_EXTERNAL_FINAL_PROMPT = createExternalStagePrompt(AI_EXTERNAL_FINAL_STAGE_PROMPT);

export const getSystemPrompt = (): string => [
  AI_IDENTITY_PROMPT,
  isAiExternalInformationEnabled() ? AI_DECISION_PROMPT_WITH_EXTERNAL_INFORMATION : AI_DECISION_PROMPT_WITHOUT_EXTERNAL_INFORMATION,
  AI_COMMAND_PROMPT,
  isAiExternalInformationEnabled() ? AI_EXTERNAL_INFORMATION_PROMPTS : AI_NO_EXTERNAL_INFORMATION_PROMPTS,
  AI_SMALL_CONVERSATION_PROMPT,
  AI_VERACITY_PROMPT,
  AI_OUTPUT_FORMAT_PROMPT,
].filter(Boolean).join('\n');

export const STRICT_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'ai_response',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        command: {
          anyOf: [
            {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'string' },
              },
              required: ['name', 'value'],
              additionalProperties: false,
            },
            { type: 'null' },
          ],
        },
        externalInformation: {
          anyOf: [
            {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: Object.values(AI_EXTERNAL_ACTIONS),
                },
                font: { type: 'string' },
                query: { type: ['string', 'null'] },
                method: { type: ['string', 'null'] },
                route: { type: ['string', 'null'] },
                params: { type: ['object', 'null'] },
                body: { type: ['object', 'null'] },
                responseFields: {
                  type: ['array', 'null'],
                  maxItems: AI_MAX_RESPONSE_FIELDS,
                  items: { type: 'string' },
                },
              },
              required: [
                'action',
                'font',
                'query',
                'method',
                'route',
                'params',
                'body',
                'responseFields',
              ],
              additionalProperties: false,
            },
            { type: 'null' },
          ],
        },
        answer: {
          type: 'string',
        },
      },
      required: ['answer', 'command', 'externalInformation'],
      additionalProperties: false,
    },
  },
};
