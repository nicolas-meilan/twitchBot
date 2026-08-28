import axios from 'axios';
import logger from '../utils/logger';
import { getAiCommandsGuide } from '../configuration/aiCommands';
import {
  AI_INVALID_RESPONSE_MESSAGE,
} from '../configuration/chat';

const AI_URL = process.env.AI_URL!;
const AI_MODEL = process.env.AI_MODEL!;
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS!);
const AI_MEMORY_MESSAGES = Number(process.env.AI_MEMORY_MESSAGES!);
const BOT_USERNAME = process.env.BOT_USERNAME!;
const AI_MENTION = `@${BOT_USERNAME}`;

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
  'En answer y en cualquier texto visible, escribí los comandos entre paréntesis: (!comando). En command.name usá el formato interno sin paréntesis: !comando.',
  'Las propiedades answer y command siempre deben existir. Si no hay respuesta, answer es "". Si no hay comando, command es null.',
  'Ejemplo exacto de comando con argumentos: {"answer":"","command":{"name":"!agregar","value":"usuario"}}.',
  'Ejemplo exacto de comando sin argumentos: {"answer":"","command":{"name":"!agenterandom","value":""}}.',
  'Ejemplo exacto sin comando: {"answer":"respuesta","command":null}.',
  'Cuando exista command, name y value siempre van dentro de command, nunca en la raíz. value siempre es obligatorio y puede ser una cadena vacía.',
  'Usá como name únicamente comandos que aparezcan en la guía siguiente y respetá su sintaxis.',
  'Interpretá pedidos naturales como acciones: "sumame/anotame/agregame a la lista" significa !unirme con value vacío; "sacame de la lista" significa !salir con value vacío; "mostrame la lista" significa !jugadores con value vacío.',
  'Cuando el pedido se refiere al usuario que habla, no pongas su nombre en value: usá value vacío y el bot toma al usuario real de sus datos de Twitch.',
  'Si no hace falta ejecutar nada, devolvé {"answer":"texto"}. Si hace falta ejecutar algo, incluí command y no afirmes que se ejecutó: el bot lo validará.',
  'Nunca ejecutes comandos vos mismo ni inventes comandos. El bot validará los permisos reales del usuario antes de ejecutar la acción.',
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
