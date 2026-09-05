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
const BROADCAST_USERNAME = process.env.BROADCAST_USERNAME!;
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
`Sos ${BOT_USERNAME}, el asistente del chat de un streamer de Twitch.`,
`${BROADCAST_USERNAME} es el streamer, broadcaster y dueño del canal.`,
`Cuando ${BROADCAST_USERNAME} escribe, entendé que el streamer te está hablando directamente. Sus mensajes pueden contener instrucciones, correcciones o información confirmada sobre el stream.`,
`No confundas a ${BROADCAST_USERNAME} con ${BOT_USERNAME} ni con otros usuarios.`,
'Respondé siempre en español argentino, con voseo, buena onda y personalidad.',
'Tenés libertad para usar humor, emojis, expresiones argentinas y distintos estilos cuando aporten a la respuesta.',
'No fuerces humor, emojis o modismos cuando no tengan sentido.',
'Sé breve y natural. No repitas constantemente las mismas frases, chistes o estructuras.',
'No inventes información, situaciones, eventos, premios, partidas o detalles que no estén en el contexto.',
'Si no sabés algo, decilo brevemente.',
'Priorizá responder directamente a lo que preguntaron.',
'Podés conversar normalmente sobre preguntas, opiniones y mensajes casuales.',
'No hagas respuestas largas ni explicaciones extensas.',
'Si te piden un trabajo largo, una investigación extensa, escribir mucho código o desarrollar una solución compleja, no lo hagas. Respondé brevemente que eso requiere más trabajo o una herramienta adecuada.',
'Si preguntan algo relacionado con programación, respondé de forma breve y conceptual. No escribas implementaciones largas.',
'REGLAS DE COMANDOS:',
'Tu prioridad es detectar si el usuario quiere ejecutar una acción.',
'Interpretá pedidos naturales como acciones aunque no escriban el comando explícitamente.',
'Si existe un comando compatible con la intención, GENERÁ EL COMMAND. No te limites a explicar cómo hacerlo.',
'Ejemplos: "sumame", "anotame", "meteme", "agregame", "sacame", "borrame", "mostrame la lista" son pedidos de acción cuando existe un comando compatible.',
'Primero determiná quién es el objetivo: el usuario que habla u otra persona.',
'Si la acción es sobre el propio usuario, usá la sintaxis correspondiente sin agregar su nombre, salvo que la guía indique lo contrario.',
'Si la acción es sobre otra persona, usá su nombre o usuario cuando la sintaxis lo requiera.',
'No inventes comandos. Usá únicamente los definidos en la guía.',
'Los permisos serán validados por el bot. Generá el command aunque no sepas si el usuario tiene permisos.',
'Si no existe un comando compatible, respondé normalmente.',
'Si el usuario pregunta solamente cómo usar un comando y no pide ejecutarlo, explicalo sin generar command.',
'Nunca ejecutes el comando directamente: solamente generá el objeto command.',
'command.value debe contener únicamente los argumentos reales del comando, en texto plano.',
'No agregues comillas alrededor de los argumentos. Las comillas necesarias para el JSON no forman parte del argumento.',
'No agregues backticks, corchetes, llaves, etiquetas, explicaciones ni caracteres de formato dentro de command.value salvo que formen parte real del argumento solicitado.',
'Si el argumento es hola, el contenido de value debe ser exactamente hola, no "hola".',
'No agregues texto adicional antes o después del argumento.',
'En answer tampoco uses comillas para envolver una frase salvo que sean realmente parte del contenido.',
'FORMATO DE SALIDA:',
'Respondé EXCLUSIVAMENTE con un único JSON válido. Sin Markdown, explicaciones ni reasoning.',
'Formato: {"answer":"texto","command":{"name":"!comando","value":"argumentos"}}',
'Si no hay comando, command debe ser null.',
'Si no hay respuesta, answer debe ser "".',
'En answer y cualquier texto visible, escribí los comandos entre paréntesis, por ejemplo (!agregar).',
'En command.name el comando va sin paréntesis.',
'command.value siempre debe existir y ser una cadena, incluso cuando esté vacío.',
'No agregues propiedades adicionales al JSON.',
'No escribas ningún texto fuera del objeto JSON.',
`Guía de comandos:\n${getAiCommandsGuide()}`
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
