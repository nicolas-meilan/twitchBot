import axios from 'axios';
import tmi from 'tmi.js';
import logger from '../utils/logger';
import { getAiCommandsGuide, formatKnownCommandsForChat } from '../configuration/aiCommands';
import {
  AI_INVALID_RESPONSE_MESSAGE,
  BROADCASTER_MESSAGES_CONFIG,
  MESSAGES_CONFIG,
  MODS_ACTIONS_CONFIG,
  USERS_ACTIONS_CONFIG,
  VIP_ACTIONS_CONFIG,
} from '../configuration/chat';
import { isAiFullTtsEnabled } from '../actions/modActions';
import { sendEventTTS } from './botEvents';

const AI_URL = process.env.AI_URL!;
const AI_MODEL = process.env.AI_MODEL!;
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS!);
const AI_MEMORY_MESSAGES = Number(process.env.AI_MEMORY_MESSAGES!);
const BOT_USERNAME = process.env.BOT_USERNAME!;
const AI_MENTION = `@${BOT_USERNAME}`;

export const AI_EXECUTABLE_COMMANDS = new Set([
  ...Object.keys(MESSAGES_CONFIG),
  ...USERS_ACTIONS_CONFIG,
  ...VIP_ACTIONS_CONFIG,
  ...MODS_ACTIONS_CONFIG,
  ...BROADCASTER_MESSAGES_CONFIG,
]);

const SYSTEM_PROMPT = [
  `Sos ${BOT_USERNAME}, el asistente gracioso, pícaro y consistente del chat de un streamer de Twitch.`,
  'Respondé siempre en español argentino, con voseo, humor y buena onda, sin ser pesado, y de forma breve porque se publica en el chat.',
  'Usá formas argentinas naturales: vos, tenés, podés, querés, vení, decime, usá, hacé, bancá, tranqui, de una, che y una banda.',
  'Evitá formas neutras o de otros países como tú, tienes, puedes, quieres, vale, ordenador, genial o vosotros.',
  'No metas lunfardo o modismos en cada frase: soná como una persona argentina real, natural y consistente.',
  'Mantené una personalidad estable: amable, atento, ocurrente y coherente con lo que ya dijiste.',
  'No contradigas información confirmada en la conversación. Si no tenés un dato, decilo y no lo inventes.',
  'Recordá las preferencias y datos explícitos de cada usuario durante esta ejecución del bot.',
  'Para el trato personal, priorizá los pronombres o preferencias expresados por el usuario. El nombre puede ser una señal débil, nunca una certeza.',
  'No afirmes ni anuncies el género de una persona. Si no hay certeza, usá un trato neutral y evitá asumir.',
  'No confundas el nombre del usuario con el nombre del bot ni con el de otra persona del historial.',
  'Respondé exclusivamente con un único objeto JSON válido, sin Markdown, texto adicional ni reasoning_content.',
  'El único formato permitido es: {"answer":"texto o cadena vacía","command":{"name":"!comando","value":"argumentos"}}.',
  'En answer y en cualquier texto visible, escribí los comandos entre paréntesis: (!comando). En command.name usá el formato interno sin paréntesis.',
  'Las propiedades answer y command siempre deben existir. Si no hay respuesta, answer es "". Si no hay comando, command es null.',
  'Ejemplo exacto de comando con argumentos: {"answer":"","command":{"name":"!agregar","value":"usuario"}}.',
  'Ejemplo exacto de comando sin argumentos: {"answer":"","command":{"name":"!agenterandom","value":""}}.',
  'Ejemplo exacto sin comando: {"answer":"respuesta","command":null}.',
  'Cuando exista command, name y value siempre van dentro de command, nunca en la raíz. value siempre es obligatorio y puede ser una cadena vacía.',
  'Interpretá los pedidos naturales como acciones y sé permisivo al detectar intenciones de ejecutar comandos.',
  'Si el usuario pide, sugiere o expresa claramente que quiere realizar una acción que corresponde a un comando disponible, GENERÁ EL COMMAND aunque no escriba explícitamente el comando.',
  'No te limites a explicar cómo usar un comando cuando el usuario está pidiendo que realices la acción: ejecutá la intención generando el command.',
  'Por ejemplo, "sumame", "anotame", "agregame a la lista", "quiero entrar", "meteme", "sacame", "borrame", "mostrame la lista" deben interpretarse como acciones cuando exista un comando compatible.',
  'Antes de elegir un comando, determiná quién es el objetivo de la acción: el propio usuario que está hablando u otra persona.',
  'Si la acción está dirigida al propio usuario, usá el comando correspondiente a la acción sobre uno mismo y no incluyas su nombre o usuario como argumento, salvo que la sintaxis del comando indique explícitamente lo contrario.',
  'Si la acción está dirigida a otra persona, usá el comando correspondiente a la acción sobre otra persona y utilizá su nombre o usuario como argumento cuando la sintaxis lo requiera.',
  'La elección del comando debe basarse en el objetivo real de la acción y en la sintaxis definida en la guía, no únicamente en las palabras utilizadas por el usuario.',
  'No confundas una acción expresada en primera persona con una acción sobre otra persona. Priorizá siempre quién es el destinatario de la acción antes de seleccionar el comando.',
  'Si existe un comando apropiado para realizar la acción, preferí generar el command antes que responder solamente con una explicación.',
  'Si además es útil explicar cómo puede hacerlo manualmente, podés hacerlo brevemente en answer, pero igualmente generá el command cuando el usuario haya pedido realizar la acción.',
  'Los permisos serán validados por el bot. No dejes de generar un command solamente porque no sepas si el usuario tiene permisos suficientes.',
  'Si el comando requiere permisos y el bot posteriormente rechaza la ejecución, el bot se encargará de informar que el usuario no tiene el rol necesario.',
  'Nunca inventes comandos ni permisos. Usá únicamente comandos que aparezcan en la guía siguiente y respetá su sintaxis.',
  'Cuando no exista un comando compatible con la intención del usuario, respondé normalmente sin generar command.',
  'Si el usuario solamente pregunta cómo hacer algo y no está pidiendo que lo hagas, explicale el comando sin generar command.',
  'Nunca ejecutes comandos vos mismo. Tu función es detectar la intención y generar el command; el bot se encargará de validarlo y ejecutarlo.',
  'Los ejemplos de sintaxis son ejemplos de uso, no son la lista completa. Si preguntan qué comandos existen, enumerá la guía completa y no afirmes que hay solo uno o dos.',
  `Guía actual de comandos:\n${getAiCommandsGuide()}`,
].join(' ');

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

const STRICT_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'ai_response',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        answer: { type: ['string', 'null'] },
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
      },
      required: ['answer', 'command'],
      additionalProperties: false,
    },
  },
};

type MemoryMessage = {
  username: string;
  role: 'user' | 'assistant';
  content: string;
};

export type AiCommand = {
  name: string;
  value: string;
};

export type AiResult = {
  answer?: string;
  command?: AiCommand;
};

const memoryByChannel = new Map<string, MemoryMessage[]>();

const cleanMention = (message: string) => message.replace(new RegExp(AI_MENTION, 'ig'), '').trim();

export const formatAiResponseForChat = (message: string) => formatKnownCommandsForChat(message, AI_EXECUTABLE_COMMANDS);

export const createMentionedChat = (chat: tmi.Client, username: string): tmi.Client => new Proxy(chat, {
  get: (target, property, receiver) => {
    if (property !== 'say') return Reflect.get(target, property, receiver);

    return (channel: string, message: string) => target.say(channel, `@${username}, ${formatAiResponseForChat(message)}`);
  },
});

export const sayAi = (chat: tmi.Client, channel: string, username: string, response: string) => {
  const formattedResponse = formatAiResponseForChat(response);
  const chatMessage = `@${username}, ${formattedResponse}`;

  logger.info(`AI response: ${formattedResponse}`);
  chat.say(channel, chatMessage);

  if (isAiFullTtsEnabled()) {
    sendEventTTS(formattedResponse, BOT_USERNAME, true);
  }
};

const parseAiResult = (content: string): AiResult | undefined => {
  try {
    const parsed = JSON.parse(content) as Partial<AiResult>;
    const hasAnswer = typeof parsed.answer === 'string';
    const hasCommand = parsed.command && typeof parsed.command.name === 'string' && typeof parsed.command.value === 'string';

    if (!hasAnswer && !hasCommand) return;

    return {
      answer: hasAnswer ? parsed.answer!.replace(/^!/, '').trim() : undefined,
      command: hasCommand
        ? { name: parsed.command!.name.toLowerCase(), value: parsed.command!.value.trim() }
        : undefined,
    };
  } catch {
    logger.warn('AI returned an invalid response format');
    return;
  }
};

const logAiError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      logger.error(`AI error: timeout after ${AI_TIMEOUT_MS}ms`);
      return;
    }

    if (error.response?.status) {
      logger.error(`AI error: HTTP ${error.response.status}`);
      return;
    }

    logger.error('AI error: connection failed');
    return;
  }

  logger.error('AI error: unknown failure');
};

export const askAi = async (channel: string, username: string, message: string): Promise<AiResult | undefined> => {
  const question = cleanMention(message);
  if (!question) return;

  try {
    const channelKey = channel.toLowerCase();
    const history = memoryByChannel.get(channelKey) || [];
    const requestBody = (responseFormat: object) => ({
      model: AI_MODEL,
      response_format: responseFormat,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map((item) => ({
          role: item.role,
          content: `[usuario: ${item.username}] ${item.content}`,
        })),
        { role: 'user', content: `[usuario: ${username}] ${question}` },
      ],
    });

    let response;
    try {
      response = await axios.post<ChatCompletionResponse>(
        `${AI_URL.replace(/\/$/, '')}/v1/chat/completions`,
        requestBody(STRICT_RESPONSE_FORMAT),
        { timeout: AI_TIMEOUT_MS },
      );
    } catch (error) {
      if (!axios.isAxiosError(error) || ![400, 422].includes(error.response?.status || 0)) throw error;

      logger.warn('AI does not support JSON Schema; falling back to JSON object mode');
      response = await axios.post<ChatCompletionResponse>(
        `${AI_URL.replace(/\/$/, '')}/v1/chat/completions`,
        requestBody({ type: 'json_object' }),
        { timeout: AI_TIMEOUT_MS },
      );
    }

    const content = response.data.choices?.[0]?.message?.content?.trim();
    if (!content) return;

    const result = parseAiResult(content);
    if (!result) {
      return { answer: AI_INVALID_RESPONSE_MESSAGE };
    }

    const updatedHistory = [
      ...history,
      { username, role: 'user' as const, content: question },
      { username: BOT_USERNAME, role: 'assistant' as const, content: result.answer || JSON.stringify(result.command) },
    ];
    memoryByChannel.set(channelKey, updatedHistory.slice(-AI_MEMORY_MESSAGES));
    return result;
  } catch (error) {
    logAiError(error);
    return;
  }
};

export const isAiMention = (message: string) => message.toLowerCase().includes(AI_MENTION.toLowerCase());
