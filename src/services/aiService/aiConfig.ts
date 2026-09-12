import { PLAYERS_QUEUE_PRIORITY_BENEFITS } from '../../configuration/chat';

import gameQueue from '../../services/GameQueue';

import {
  getCommandDefinitions,
  getCommandDescription,
} from '../../configuration/commandDescriptions';

import { AiExternalEndpoints } from './aiExternalEndpoints';

export const AI_URL = process.env.AI_URL!;
export const AI_MODEL = process.env.AI_MODEL!;
export const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS!);
export const AI_MEMORY_MESSAGES = Number(process.env.AI_MEMORY_MESSAGES!);
export const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME!;
export const BOT_USERNAME = process.env.BOT_USERNAME!;

export const AI_MENTION = `@${BOT_USERNAME}`;
export const AI_MAX_QUEUE_SIZE = 6;
export const AI_MAX_EXTERNAL_STEPS = 7;

const END_LINE = '--------------------------------------------------------------------------';

export const AI_EXTERNAL_INFO_ERROR_MESSAGE = 'No pude obtener esa información.';
export const AI_EXTERNAL_INFO_NO_DATA_MESSAGE = 'No encontré datos para esa consulta.';
export const AI_EXTERNAL_CONTEXT_FONT = '__FONT__';
export const AI_EXTERNAL_CONTEXT_ENDPOINTS_LIST = `[${AI_EXTERNAL_CONTEXT_FONT}_ENDPOINTS_LIST]`;
export const AI_EXTERNAL_CONTEXT_DETAIL_ENDPOINT = `[${AI_EXTERNAL_CONTEXT_FONT}_DETAIL_ENDPOINT]`;
export const AI_EXTERNAL_CONTEXT_REQUEST_RESULT = `[${AI_EXTERNAL_CONTEXT_FONT}_REQUEST_RESULT]`;

export const ADVANCED_SEARCH_COMMAND = '!busquedaAvanzada';

export const AI_EXTERNAL_CONTEXT_TYPES = {
  ENDPOINTS_LIST: 'ENDPOINTS_LIST',
  DETAIL_ENDPOINT: 'DETAIL_ENDPOINT',
  REQUEST_RESULT: 'REQUEST_RESULT',
} as const;

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
  .map(([name, configuration]) => `Fuente Externa: ${name} - Descripción: ${configuration.description}`)
  .join('\n');

const replaceExternalContextFont = (value: string, endpoint: string) => value
  .replace(
    new RegExp(AI_EXTERNAL_CONTEXT_FONT, 'g'),
    endpoint.toUpperCase(),
  );

const AI_IDENTITY_PROMPT = [
  `IDENTIDAD Y PERSONALIDAD`,
  `Sos ${BOT_USERNAME}, el asistente bot del canal de Twitch de ${BROADCAST_USERNAME}.`,
  `${BROADCAST_USERNAME} es el streamer/broadcaster, usá toda la información disponible que tengas sobre el cuando te consulte algo.`,
  `Hablás en español argentino (con voseo), siendo natural, divertido y resolutivo.`,
  `No sos el streamer, sos el bot. Mantené el contexto sin inventar nada que no se haya dicho.`,
].join('\n');

const AI_DECISION_PROMPT = [
  `FLUJO DE DECISIÓN`,
  `Elegí una acción por mensaje respetando esta prioridad: 1. COMMAND > 2. EXTERNAL_INFORMATION > 3. SMALL_CONVERSATION.`,
  `Si crees no tener acceso a algún dato/información, probá las reglas EXTERNAL_INFORMATION envez de SMALL_CONVERSATION`,
].join('\n');

const AI_COMMANDS_PROMPT = [
  `COMMAND`,
  `Analizá si algún comando del listado [AVAILABLE_COMMANDS] soluciona el 100% del pedido basado en su descripción.`,
  `Si el usuario pide información extra que el comando no tiene, NO USES EL COMANDO, pasa directamente a EXTERNAL_INFORMATION`,
  `Aplicar el comando quiere decir devolver el JSON con "command" completo (ej: {"command":{"name":"!comando","value":"args"}, "answer": "Ejecuté (!comando)", "externalInformation": null}).`,
  `No inventes ni asumas que el comando hace más de lo descrito.`,
  `[AVAILABLE_COMMANDS]`,
  `${getAiCommandsGuide()}`,
  END_LINE,
].join('\n');

const AI_EXTERNAL_DECISION_PROMPT = [
  `EXTERNAL_INFORMATION`,
  `Revisá el listado [AVAILABLE_EXTERNAL_INFORMATION_SOURCES].`,
  `Si la descripción o nombre de la fuente externa coincide MÍNIMAMENTE con la consulta, elegí EXTERNAL_INFORMATION (usando action "get_system_prompt").`,
  `Formato requerido: "externalInformation":{"action":"get_system_prompt","font":"NOMBRE_FUENTE", "route": null, "responseFields": null, "method": null, "params": null, "body": null}.`,
].join('\n');

const AI_EXTERNAL_INFORMATION_SOURCES_PROMPT = [
  `[AVAILABLE_EXTERNAL_INFORMATION_SOURCES]`,
  `${getAiExternalFontsGuide()}`,
  END_LINE
].join('\n');

const AI_SMALL_CONVERSATION_PROMPT = [
  `SMALL_CONVERSATION`,
  `Usá SMALL_CONVERSATION SOLO si no aplica COMMAND ni EXTERNAL_INFORMATION.`,
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
  `"command" y "externalInformation" son mutuamente excluyentes (uno siempre debe ser null).`,
  `"answer" debe ser texto limpio, sin formato markdown (sin negritas, cursivas ni encabezados).`,
].join('\n');

export const AI_EXTERNAL_INFORMATION_PROMPT = [
  `Tu única función es ejecutar el flujo EXTERNAL_INFORMATION para obtener datos reales.`,

  `FLUJO OBLIGATORIO (3 PASOS SECUENCIALES)`,
  `No saltees ni inviertas etapas. Está estrictamente prohibido inventar o asumir rutas, métodos, parámetros, body, campos o resultados.`,

  `Paso 1: ${replaceExternalContextFont(AI_EXTERNAL_CONTEXT_ENDPOINTS_LIST, 'FUENTE')}`,
  `- Objetivo: Solicitar el listado de rutas disponibles para analizar sus descripciones y evaluar cuál es la correcta para la consulta del usuario.`,
  `- Acción: Usá "list_endpoints" (el nombre de la fuente va en "font").`,
  `- Restricción: method, route, params, body y responseFields DEBEN ser null.`,

  `Paso 2: ${replaceExternalContextFont(AI_EXTERNAL_CONTEXT_DETAIL_ENDPOINT, 'FUENTE')}`,
  `- Objetivo: Seleccionar la ruta que mejor responda a la consulta y obtener su documentación técnica.`,
  `- Acción: Usá "get_endpoint_detail".`,
  `- Regla de ruta: Usá la ruta EXACTA y completa elegida del catálogo del Paso 1 (no inventes, no la recortes).`,
  `- Restricción: method, params, body y responseFields DEBEN ser null.`,

  `Paso 3: ${replaceExternalContextFont(AI_EXTERNAL_CONTEXT_REQUEST_RESULT, 'FUENTE')}`,
  `- Objetivo: Ejecutar la petición documentada.`,
  `- Acción: Usá "execute_request" respetando estrictamente el método, ruta, params (JSON) y body (JSON) de la documentación obtenida en el Paso 2.`,
  `- Restricción: responseFields NO debe ser null.`,

  `REGLAS PARA "responseFields" (Paso 3):`,
  `- Análisis previo obligatorio: Analizá en detalle la estructura de los objetos JSON de respuesta provistos en la documentación del Paso 2 antes de definir los campos.`,
  `- Formato estricto: Debe ser un array de strings con la ruta de puntos completa (Ej: ["object.subobject.attr1"]). Nunca separes los niveles en elementos independientes del array (Prohibido: ["object", "subobject", "attr1"]).`,
  `- Solicitá siempre el valor más interno necesario para responder (evitá pedir objetos padres completos, IDs o atributos irrelevantes. Ej positivo: "object.subobject.attr1", "object.attr2". Ej negativo: "object").`,
  `- Mantené la ruta estructural completa desde la raíz. Nunca omitas niveles intermedios (Ej positivo: "object.subobject.attr1". Ej negativo: "subobject.attr1", "attr1").`,
  `- Tratá los arrays como objetos: no uses índices numéricos, corchetes "[]" ni "*" (Ej: "array.object.attr1" o "array.attr").`,
  `- No ignores Arrays, el Array padre, ni objetos Padre`,

  `Paso 4: RESPUESTA FINAL`,
  `Al recibir el resultado obtenido en el Paso 3, formulá tu "answer" basándote ÚNICAMENTE en esos datos reales. Si el resultado no tiene datos suficientes, indicalo. Nunca inventes información para completar la respuesta.`,
].join('\n');

export const SYSTEM_PROMPT = [
  AI_IDENTITY_PROMPT,
  AI_DECISION_PROMPT,
  AI_COMMANDS_PROMPT,
  AI_EXTERNAL_DECISION_PROMPT,
  AI_EXTERNAL_INFORMATION_SOURCES_PROMPT,
  AI_SMALL_CONVERSATION_PROMPT,
  AI_VERACITY_PROMPT,
  AI_OUTPUT_FORMAT_PROMPT,
].join('\n');

export const EXTERNAL_INFORMATION_SYSTEM_PROMPT = [
  AI_IDENTITY_PROMPT,
  AI_EXTERNAL_INFORMATION_PROMPT,
  AI_VERACITY_PROMPT,
  AI_OUTPUT_FORMAT_PROMPT,
].join('\n');

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
                  enum: [
                    'get_system_prompt',
                    'list_endpoints',
                    'get_endpoint_detail',
                    'execute_request',
                  ],
                },
                font: { type: 'string' },
                method: { type: ['string', 'null'] },
                route: { type: ['string', 'null'] },
                params: { type: ['object', 'null'] },
                body: { type: ['object', 'null'] },
                responseFields: {
                  type: ['array', 'null'],
                  items: { type: 'string' },
                },
              },
              required: [
                'action',
                'font',
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
