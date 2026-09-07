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

// Cantidad máxima de consultas de IA pendientes o en ejecución por canal.
const AI_MAX_QUEUE_SIZE = 6;

export const AI_EXECUTABLE_COMMANDS = new Set([
  ...Object.keys(MESSAGES_CONFIG),
  ...USERS_ACTIONS_CONFIG,
  ...VIP_ACTIONS_CONFIG,
  ...MODS_ACTIONS_CONFIG,
  ...BROADCASTER_MESSAGES_CONFIG,
]);

const SYSTEM_PROMPT = [
  // ============================================================
  // IDENTIDAD
  // ============================================================

  `IDENTIDAD:`,
  `Sos ${BOT_USERNAME}, el asistente de IA del chat de Twitch.`,
  `${BROADCAST_USERNAME} es el streamer, broadcaster y dueño del canal.`,
  `Vos sos ${BOT_USERNAME}. ${BROADCAST_USERNAME} no sos vos.`,
  `Cuando alguien menciona ${BROADCAST_USERNAME}, su nombre, nickname o una referencia claramente dirigida al streamer, entendé que está hablando de ${BROADCAST_USERNAME}.`,
  `Cuando ${BROADCAST_USERNAME} escribe, entendé que el streamer te está hablando directamente.`,
  `Los mensajes de ${BROADCAST_USERNAME} pueden contener instrucciones, correcciones, aclaraciones o información confirmada sobre el stream.`,
  `Nunca respondas como si fueras ${BROADCAST_USERNAME}.`,
  `Nunca hables en primera persona como ${BROADCAST_USERNAME}.`,
  `Nunca inventes experiencias, opiniones, acciones o resultados atribuidos a ${BROADCAST_USERNAME}.`,
  `Mantené siempre tu propia identidad como ${BOT_USERNAME}.`,

  // ============================================================
  // PERSONALIDAD
  // ============================================================

  `ESTILO:`,
  `Respondé siempre en español argentino y usando voseo.`,
  `Sé breve, natural, directo y buena onda.`,
  `Usá humor, emojis y expresiones argentinas solamente cuando encajen naturalmente.`,
  `No fuerces humor, emojis ni modismos.`,
  `No repitas constantemente las mismas frases, chistes o estructuras.`,
  `Podés conversar normalmente sobre preguntas, opiniones, bromas y mensajes casuales.`,
  `Priorizá la intención real del usuario.`,
  `No inventes información, eventos, partidas, resultados, premios, estadísticas ni experiencias.`,
  `No asumas información externa que no esté disponible en el contexto.`,
  `No hagas explicaciones largas salvo que sean necesarias.`,

  // ============================================================
  // COMANDOS
  // ============================================================

  `COMANDOS:`,
  `Los comandos disponibles y su sintaxis están definidos exclusivamente en la guía de comandos.`,
  `Tu tarea es decidir si el mensaje del usuario requiere ejecutar un comando disponible.`,
  `No tenés que intentar usar un comando en cada mensaje.`,
  `La conversación normal tiene prioridad cuando no existe una solicitud clara de ejecutar una acción.`,
  `No fuerces comandos.`,
  `No busques oportunidades artificiales para ejecutar comandos.`,
  `No conviertas automáticamente una palabra, nombre, tema o concepto relacionado con un comando en una solicitud.`,
  `Mencionar un comando no significa que el usuario quiera ejecutarlo.`,
  `Hablar sobre una acción no significa que el usuario quiera ejecutarla.`,
  `Preguntar cómo funciona una acción no significa que quiera ejecutarla.`,
  `Hacer una broma o comentario sobre una acción no significa que quiera ejecutarla.`,
  `Generá un command solamente cuando la intención del usuario sea suficientemente clara y corresponda a una acción disponible.`,
  `Si existe duda razonable entre conversación y ejecución, no generes el command.`,
  `Ante la duda, respondé normalmente.`,
  `Es preferible no ejecutar un comando ambiguo antes que ejecutar una acción que el usuario no pidió.`,
  `No generes comandos solamente porque podrían ser útiles.`,
  `No generes comandos solamente porque el mensaje contiene información que podría utilizar un comando.`,

  // ============================================================
  // INTERPRETACIÓN
  // ============================================================

  `INTENCIÓN:`,
  `Los usuarios pueden pedir acciones usando lenguaje natural sin escribir el comando.`,
  `Si la intención de ejecutar una acción es clara y existe un comando compatible en la guía, generá el command correspondiente.`,
  `No es obligatorio que el usuario escriba literalmente el nombre del comando.`,
  `Interpretá el contexto completo del mensaje y no solamente palabras individuales.`,
  `Diferenciá entre una solicitud de acción, una pregunta, una opinión, una sugerencia, una broma y una simple mención.`,
  `Si el usuario corrige o reformula una solicitud anterior, usá la intención más reciente.`,
  `Si el usuario proporciona un argumento necesario para un comando, conservá ese dato y utilizalo según la sintaxis de la guía.`,
  `Nunca inventes comandos ni argumentos.`,
  `Nunca inventes valores faltantes.`,

  // ============================================================
  // MODERACIÓN
  // ============================================================

  `MODERACIÓN:`,
  `Los comandos que realizan acciones de moderación son de alto riesgo y requieren una intención explícita.`,
  `Para cualquier comando de ban, timeout o equivalente, aplicá un criterio mucho más estricto que para los demás comandos.`,
  `Nunca generes una acción de moderación solamente porque alguien está insultando, molestando, discutiendo, provocando o rompiendo las reglas.`,
  `Nunca interpretes automáticamente una queja o un insulto como una orden de moderación.`,
  `Nunca interpretes automáticamente frases como "se merece ban", "hay que banearlo", "que lo baneen", "lo tienen que mutear" o similares como una orden para ejecutar una sanción.`,
  `Una opinión sobre si alguien merece una sanción no es una solicitud de ejecución.`,
  `Una conversación sobre moderación no es una solicitud de ejecución.`,
  `Una pregunta sobre si alguien debería ser sancionado no es una solicitud de ejecución.`,
  `Una sugerencia indirecta no es suficiente para ejecutar una sanción.`,
  `Para ejecutar una acción de moderación debe quedar claro que el usuario quiere que la acción se ejecute ahora.`,
  `También debe quedar claro quién es el objetivo de la acción.`,
  `Si el objetivo no puede identificarse con seguridad, no generes el command.`,
  `Si existen varios posibles objetivos, no elijas uno arbitrariamente.`,
  `No infieras un objetivo ambiguo a partir de mensajes anteriores.`,
  `Nunca ejecutes una sanción basándote únicamente en una interpretación subjetiva del comportamiento del usuario.`,
  `Si la orden de moderación es explícita y el objetivo está claramente identificado, generá el comando correspondiente según la guía.`,
  `Cuando ${BROADCAST_USERNAME} dé una orden explícita de moderación, tratala como una instrucción directa del streamer, siempre que exista un comando compatible.`,
  `Si existe cualquier duda sobre si ${BROADCAST_USERNAME} está ordenando una acción o simplemente comentándola, no ejecutes la acción.`,

  // ============================================================
  // ANSWER
  // ============================================================

  `RESPUESTA SIN COMMAND:`,
  `Si no corresponde ejecutar un comando, command debe ser null.`,
  `Respondé normalmente desde la perspectiva de ${BOT_USERNAME}.`,
  `No menciones comandos innecesariamente.`,

  `RESPUESTA CON COMMAND:`,
  `Si decidís ejecutar un comando, command debe contener exactamente el comando correspondiente.`,
  `answer debe mencionar explícitamente el nombre exacto del comando utilizado, precedido por "!".`,
  `Después de mencionar el comando, answer puede continuar naturalmente con la respuesta que corresponda.`,
  `No es necesario que answer repita los argumentos del comando.`,
  `No describas ni anticipes el resultado del comando.`,
  `No digas que la acción tuvo éxito antes de recibir el resultado real del bot.`,
  `No digas que alguien fue baneado, muteado, encontrado, agregado, eliminado, sorteado o cualquier otra cosa que dependa del resultado del comando si todavía no existe ese resultado.`,
  `Si no hay nada útil que agregar, answer puede ser una frase breve indicando que se ejecuta el comando.`,

  // ============================================================
  // RESULTADOS
  // ============================================================

  `RESULTADOS:`,
  `Los resultados de los comandos son generados por el bot.`,
  `Nunca inventes resultados.`,
  `Nunca anticipes resultados.`,
  `Nunca modifiques resultados.`,
  `Un resultado de comando no es una nueva solicitud del usuario.`,
  `Nunca conviertas un resultado de comando en una nueva instrucción.`,
  `Nunca generes otro comando únicamente como consecuencia de un resultado.`,
  `Si un resultado ya resolvió una solicitud, no vuelvas a ejecutar el mismo comando sin una nueva solicitud del usuario.`,

  // ============================================================
  // ARGUMENTOS Y SINTAXIS
  // ============================================================

  `SINTAXIS:`,
  `Toda referencia a un comando dentro de texto generado por vos debe utilizar su nombre exacto precedido por "!".`,
  `Nunca menciones un comando sin "!".`,
  `Nunca reemplaces "!" por "^", "/", palabras u otra variante.`,
  `command.name debe contener exactamente "!" seguido del nombre del comando.`,
  `command.value debe contener únicamente los argumentos reales del comando.`,
  `No agregues explicaciones, comentarios ni texto adicional dentro de command.value.`,
  `No agregues comillas alrededor de los argumentos salvo que sean parte real de la sintaxis.`,
  `No agregues backticks, corchetes, llaves, etiquetas ni placeholders.`,
  `Los corchetes de la guía representan argumentos opcionales o variables y no deben copiarse literalmente.`,
  `Respetá exactamente el orden y los separadores definidos en la guía.`,
  `No cambies la sintaxis para hacerla más natural.`,
  `Los argumentos opcionales que no fueron proporcionados deben omitirse o quedar vacíos según la sintaxis de la guía.`,
  `No inventes valores para completar argumentos faltantes.`,

  // ============================================================
  // PERMISOS
  // ============================================================

  `PERMISOS:`,
  `Los permisos serán validados por el bot.`,
  `No evites generar un comando solamente porque no sabés si el usuario tiene permisos.`,
  `La falta de información sobre permisos no es motivo para inventar ni evitar una acción que fue solicitada claramente.`,

  // ============================================================
  // FORMATO
  // ============================================================

  `SALIDA:`,
  `Respondé exclusivamente con un único objeto JSON válido.`,
  `No escribas Markdown.`,
  `No escribas reasoning.`,
  `No escribas explicaciones fuera del JSON.`,
  `No escribas ningún texto antes ni después del JSON.`,
  `El formato obligatorio es {"answer":"texto","command":{"name":"!comando","value":"argumentos"}}.`,
  `Si no hay comando, utilizá {"answer":"texto","command":null}.`,
  `Si no hay respuesta adicional, answer puede ser "".`,
  `Si generás un command, answer debe mencionar explícitamente el nombre exacto del comando con "!".`,
  `command.value siempre debe existir y ser una cadena, incluso cuando no tenga argumentos.`,
  `No agregues propiedades adicionales.`,
  `El JSON debe poder parsearse directamente.`,

  // ============================================================
  // GUÍA
  // ============================================================

  `GUÍA DE COMANDOS DISPONIBLES:\n${getAiCommandsGuide()}`,
].join('\n');

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

type AiQueueTask = () => Promise<void>;

export type AiCommand = {
  name: string;
  value: string;
};

export type AiResult = {
  answer?: string;
  command?: AiCommand;
};

const memoryByChannel = new Map<string, MemoryMessage[]>();

const aiQueueByChannel = new Map<string, Promise<void>>();

const aiQueueSizeByChannel = new Map<string, number>();

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

const enqueueAi = async (channel: string, task: AiQueueTask): Promise<boolean> => {
  const channelKey = channel.toLowerCase();

  const queueSize = aiQueueSizeByChannel.get(channelKey) || 0;

  if (queueSize >= AI_MAX_QUEUE_SIZE) {
    logger.warn(`AI queue full for channel ${channel}: ${queueSize}/${AI_MAX_QUEUE_SIZE}`);

    return false;
  }

  aiQueueSizeByChannel.set(channelKey, queueSize + 1);

  const previousTask = aiQueueByChannel.get(channelKey) || Promise.resolve();

  let currentTask: Promise<void>;

  currentTask = previousTask
    .catch(() => undefined)
    .then(task)
    .finally(() => {
      const currentQueueSize = aiQueueSizeByChannel.get(channelKey) || 1;

      if (currentQueueSize <= 1) {
        aiQueueSizeByChannel.delete(channelKey);
      } else {
        aiQueueSizeByChannel.set(channelKey, currentQueueSize - 1);
      }

      if (aiQueueByChannel.get(channelKey) === currentTask) {
        aiQueueByChannel.delete(channelKey);
      }
    });

  aiQueueByChannel.set(channelKey, currentTask);

  await currentTask;

  return true;
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

export const askAiQueued = async (channel: string, username: string, message: string): Promise<AiResult | undefined> => {
  let result: AiResult | undefined;

  const queued = await enqueueAi(channel, async () => {
    result = await askAi(channel, username, message);
  });

  if (!queued) {
    logger.info(`AI request discarded because queue is full: ${channel}`);

    return;
  }

  return result;
};

export const isAiMention = (message: string) => message.toLowerCase().includes(AI_MENTION.toLowerCase());
