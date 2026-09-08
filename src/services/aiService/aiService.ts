import axios from 'axios';

import tmi from 'tmi.js';

import logger from '../../utils/logger';

import { splitChatMessage, formatKnownCommandsForChat } from '../../utils/chatMessage';

import { UserRole, userHasAccess } from '../../actions/userRoles';

import { executeCommand, getCommandRequiredRole } from '../../commandDispatcher';

import {
  ACTION_NOT_ALLOWED,
  AI_COMMAND_ERROR_MESSAGE,
  AI_INVALID_RESPONSE_MESSAGE,
  AI_NO_RESPONSE_MESSAGE,
  AI_EXTERNAL_INFO_LIMIT_MESSAGE,
  BROADCASTER_MESSAGES_CONFIG,
  MESSAGES_CONFIG,
  MODS_ACTIONS_CONFIG,
  TTS_KEY,
  USERS_ACTIONS_CONFIG,
  VIP_ACTIONS_CONFIG,
} from '../../configuration/chat';

import { isAiFullTtsEnabled } from '../../actions/modActions';

import { sendEventTTS } from '../botEvents';

import {
  getAiExternalEndpointDocumentation,
  getAiExternalEndpointDetail,
} from './aiExternalEndpointDocumentation';

import { executeAiExternalEndpointRequest } from './aiExternalEndpointRequest';

import {
  AI_MENTION,
  AI_MEMORY_MESSAGES,
  AI_MAX_QUEUE_SIZE,
  AI_MAX_EXTERNAL_STEPS,
  AI_MODEL,
  AI_TIMEOUT_MS,
  AI_URL,
  AI_EXTERNAL_CONTEXT_FONT,
  AI_EXTERNAL_CONTEXT_ENDPOINTS_LIST,
  AI_EXTERNAL_CONTEXT_DETAIL_ENDPOINT,
  AI_EXTERNAL_CONTEXT_REQUEST_RESULT,
  AiExternalContextType,
  BOT_USERNAME,
  STRICT_RESPONSE_FORMAT,
  SYSTEM_PROMPT,
} from './aiConfig';

export const AI_EXECUTABLE_COMMANDS = new Set([
  ...Object.keys(MESSAGES_CONFIG),
  ...USERS_ACTIONS_CONFIG,
  ...VIP_ACTIONS_CONFIG,
  ...MODS_ACTIONS_CONFIG,
  ...BROADCASTER_MESSAGES_CONFIG,
]);

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

type ChatRole = 'system' | 'user' | 'assistant';

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type MemoryMessage = {
  username: string;
  role: 'user' | 'assistant';
  content: string;
};

type AiQueueTask = () => Promise<void>;

type ExternalActions = 'list_endpoints' | 'get_endpoint_detail' | 'execute_request';

export type AiCommand = {
  name: string;
  value: string;
};

export type AiExternalInformationRequest = {
  action: ExternalActions;
  endpoint: string;
  method?: string | null;
  route?: string | null;
  params?: string | null;
  body?: string | null;
  responseFields?: string[] | null;
};

export type AiResult = {
  answer?: string;
  command?: AiCommand;
};

type AiRawResult = AiResult & {
  externalInformation?: AiExternalInformationRequest;
};

type AiExternalResolution = {
  success: boolean;
  hasData: boolean;
  retryable: boolean;
  output: string;
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

const parseAiRawResult = (content: string): AiRawResult | undefined => {
  try {
    const parsed = JSON.parse(content) as Partial<AiRawResult> & { command?: Partial<AiCommand> | null };

    const hasAnswer = typeof parsed.answer === 'string';

    const hasCommand = !!parsed.command && typeof parsed.command.name === 'string' && typeof parsed.command.value === 'string';

    const hasExternalInformation = !!parsed.externalInformation
      && typeof parsed.externalInformation.action === 'string'
      && typeof parsed.externalInformation.endpoint === 'string';

    if (!hasAnswer && !hasCommand && !hasExternalInformation) return;

    return {
      answer: hasAnswer ? parsed.answer!.replace(/^!/, '').trim() : undefined,
      command: hasCommand
        ? { name: parsed.command!.name!.toLowerCase(), value: parsed.command!.value!.trim() }
        : undefined,
      externalInformation: hasExternalInformation ? parsed.externalInformation : undefined,
    };
  } catch {
    logger.warn('AI returned an invalid response format');

    return;
  }
};

const parseJsonSafely = (value?: string | null): Record<string, unknown> | undefined => {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;

    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
};

const hasExternalData = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }

  return true;
};

const isExternalErrorResult = (value: unknown): boolean => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const result = value as Record<string, unknown>;

  if (typeof result.status === 'number' && result.status >= 400) {
    return true;
  }

  if (result.error !== undefined && result.error !== null) {
    if (typeof result.error === 'string') return result.error.trim().length > 0;

    return true;
  }

  if (result.errors !== undefined && result.errors !== null) {
    if (Array.isArray(result.errors)) return result.errors.length > 0;

    return true;
  }

  return false;
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

const requestAiCompletion = async (messages: ChatMessage[]): Promise<string | undefined> => {
  const requestBody = (responseFormat: object) => ({
    model: AI_MODEL,
    response_format: responseFormat,
    messages,
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

  return response.data.choices?.[0]?.message?.content?.trim();
};

const getExternalContextTag = (
  endpoint: string,
  type: AiExternalContextType,
  route?: string,
) => {
  const endpointKey = endpoint
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const routeKey = route
    ? route
      .toUpperCase()
      .replace(/[{}]/g, '')
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    : '';

  const contextTemplate = type === 'ENDPOINTS_LIST'
    ? AI_EXTERNAL_CONTEXT_ENDPOINTS_LIST
    : type === 'DETAIL_ENDPOINT'
      ? AI_EXTERNAL_CONTEXT_DETAIL_ENDPOINT
      : AI_EXTERNAL_CONTEXT_REQUEST_RESULT;

  const contextTag = contextTemplate.replace(AI_EXTERNAL_CONTEXT_FONT, endpointKey);

  return routeKey && type !== 'ENDPOINTS_LIST'
    ? contextTag.replace(`_${type}`, `_${routeKey}_${type}`)
    : contextTag;
};

const formatExternalContext = (
  endpoint: string,
  type: AiExternalContextType,
  content: string,
  route?: string,
) => {
  const tag = getExternalContextTag(endpoint, type, route);

  return [
    tag,
    content,
    tag.replace(/^\[/, '[/'),
  ].join('\n');
};

const resolveExternalInformationRequest = async (
  request: AiExternalInformationRequest,
): Promise<AiExternalResolution> => {
  try {
    if (request.action === 'list_endpoints') {
      const documentation = await getAiExternalEndpointDocumentation(request.endpoint);

      if (!documentation.trim()) {
        return {
          success: true,
          hasData: false,
          retryable: false,
          output: '',
        };
      }

      return {
        success: true,
        hasData: true,
        retryable: false,
        output: formatExternalContext(
          request.endpoint,
          'ENDPOINTS_LIST',
          documentation,
        ),
      };
    }

    if (request.action === 'get_endpoint_detail') {
      if (!request.method || !request.route) {
        return {
          success: false,
          hasData: false,
          retryable: false,
          output: 'ERROR: falta method o route para get_endpoint_detail.',
        };
      }

      const detail = await getAiExternalEndpointDetail(request.endpoint, request.method, request.route);

      if (!detail.trim()) {
        return {
          success: true,
          hasData: false,
          retryable: false,
          output: '',
        };
      }

      return {
        success: true,
        hasData: true,
        retryable: false,
        output: formatExternalContext(
          request.endpoint,
          'DETAIL_ENDPOINT',
          detail,
          request.route,
        ),
      };
    }

    if (request.action === 'execute_request') {
      if (!request.method || !request.route) {
        return {
          success: false,
          hasData: false,
          retryable: false,
          output: 'ERROR: falta method o route para execute_request.',
        };
      }

      if (request.params && !parseJsonSafely(request.params)) {
        return {
          success: false,
          hasData: false,
          retryable: false,
          output: 'ERROR: params no contiene un JSON válido.',
        };
      }

      if (request.body && !parseJsonSafely(request.body)) {
        return {
          success: false,
          hasData: false,
          retryable: false,
          output: 'ERROR: body no contiene un JSON válido.',
        };
      }

      const params = parseJsonSafely(request.params) || {};
      const body = parseJsonSafely(request.body);

      const sanitizedResponseFields = Array.isArray(request.responseFields)
        ? request.responseFields.filter((field): field is string => typeof field === 'string' && field.trim().length > 0)
        : undefined;

      const result = await executeAiExternalEndpointRequest(
        request.endpoint,
        request.method,
        request.route,
        params as Record<string, string | number | boolean>,
        body,
        sanitizedResponseFields,
      );

      if (result.success && result.fieldsMatched === false) {
        logger.warn(`AI responseFields did not match real response shape: ${JSON.stringify(sanitizedResponseFields)}`);

        return {
          success: false,
          hasData: false,
          retryable: true,
          output: `ERROR_REINTENTABLE: ninguno de los campos indicados en "responseFields" existe en la respuesta real.\nEstructura real de la respuesta: ${result.shapeHint}\nGenerá un nuevo "responseFields" usando exactamente esos nombres y esa anidación, incluyendo claves contenedoras como "data" o "results" si están presentes.\nNo inventes nombres de campo que no aparezcan en esta estructura ni en DETAIL_ENDPOINT.`,
        };
      }

      if (isExternalErrorResult(result)) {
        logger.warn(`External endpoint returned an error: ${JSON.stringify(result)}`);

        return {
          success: false,
          hasData: false,
          retryable: false,
          output: `ERROR: el endpoint "${request.endpoint}" devolvió un error.`,
        };
      }

      if (!hasExternalData(result)) {
        logger.warn(`External endpoint returned no data: ${request.endpoint} ${request.method} ${request.route}`);

        return {
          success: true,
          hasData: false,
          retryable: false,
          output: '',
        };
      }

      return {
        success: true,
        hasData: true,
        retryable: false,
        output: formatExternalContext(
          request.endpoint,
          'REQUEST_RESULT',
          JSON.stringify(result),
          request.route,
        ),
      };
    }

    return {
      success: false,
      hasData: false,
      retryable: false,
      output: `ERROR: acción desconocida "${request.action}".`,
    };
  } catch (error) {
    const errorMessage = (error as Error).message;

    logger.error(`Error resolving external information request: ${errorMessage}`);

    return {
      success: false,
      hasData: false,
      retryable: true,
      output: `ERROR_REINTENTABLE: ${errorMessage}\nLa solicitud externa anterior falló porque la ruta utilizada no está documentada o no es válida.\nNO vuelvas a utilizar esa misma ruta.\nVolvé a revisar ENDPOINTS_LIST y, si corresponde, DETAIL_ENDPOINT antes de generar una nueva solicitud.\nGenerá una nueva externalInformation usando únicamente una ruta que esté documentada.`,
    };
  }
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

  const currentTask: Promise<void> = previousTask
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

    const conversationMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((item) => ({
        role: item.role,
        content: `[usuario: ${item.username}] ${item.content}`,
      })),
      { role: 'user', content: `[usuario: ${username}] ${question}` },
    ];

    let finalResult: AiResult | undefined;

    for (let step = 0; step <= AI_MAX_EXTERNAL_STEPS; step += 1) {
      const content = await requestAiCompletion(conversationMessages);

      if (!content) return;

      const parsed = parseAiRawResult(content);

      if (!parsed) {
        finalResult = { answer: AI_INVALID_RESPONSE_MESSAGE };
        break;
      }

      if (!parsed.externalInformation) {
        finalResult = { answer: parsed.answer, command: parsed.command };
        break;
      }

      if (step === AI_MAX_EXTERNAL_STEPS) {
        logger.warn(`AI reached the maximum amount of external information steps for channel ${channel}`);

        finalResult = { answer: AI_EXTERNAL_INFO_LIMIT_MESSAGE };
        break;
      }

      logger.info(`AI external information step: ${JSON.stringify(parsed.externalInformation)}`);

      const externalResolution = await resolveExternalInformationRequest(parsed.externalInformation);

      if (!externalResolution.success) {
        logger.warn(`AI external information request failed: ${externalResolution.output}`);

        if (externalResolution.retryable && step < AI_MAX_EXTERNAL_STEPS) {
          conversationMessages.push({ role: 'assistant', content });
          conversationMessages.push({
            role: 'system',
            content: externalResolution.output,
          });

          continue;
        }

        finalResult = {
          answer: 'No pude obtener esa información.',
        };

        break;
      }

      if (!externalResolution.hasData) {
        logger.warn(`AI external information request returned no data: ${JSON.stringify(parsed.externalInformation)}`);

        finalResult = {
          answer: 'No encontré datos para esa consulta.',
        };

        break;
      }

      conversationMessages.push({ role: 'assistant', content });
      conversationMessages.push({
        role: 'system',
        content: externalResolution.output,
      });
    }

    if (!finalResult) {
      finalResult = { answer: AI_NO_RESPONSE_MESSAGE };
    }

    const updatedHistory = [
      ...history,
      { username, role: 'user' as const, content: question },
      { username: BOT_USERNAME, role: 'assistant' as const, content: finalResult.answer || JSON.stringify(finalResult.command) },
    ];

    memoryByChannel.set(channelKey, updatedHistory.slice(-AI_MEMORY_MESSAGES));

    return finalResult;
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

const getRoleDescription = (role: UserRole): string => {
  if (role === UserRole.VIP) return 'VIP, moderador o broadcaster';
  if (role === UserRole.MOD) return 'moderador o broadcaster';
  return 'broadcaster';
};

const executeAiCommand = async (
  chat: tmi.Client,
  mentionedChat: tmi.Client,
  channel: string,
  tags: tmi.ChatUserstate,
  username: string,
  result: AiResult,
): Promise<void> => {
  const command = result.command!.name;
  const commandValue = result.command!.value;

  if (!AI_EXECUTABLE_COMMANDS.has(command) || !command.startsWith('!')) {
    sayAi(chat, channel, username, AI_COMMAND_ERROR_MESSAGE);
    return;
  }

  const requiredRole = getCommandRequiredRole(command);

  if (requiredRole && !userHasAccess(tags, requiredRole)) {
    sayAi(chat, channel, username, `${ACTION_NOT_ALLOWED}: necesitás ser ${getRoleDescription(requiredRole)} para usar ${command}.`);
    logger.info(`AI command rejected for permissions: ${command}`);

    return;
  }

  const isTTS = command === TTS_KEY;
  const ignoreCommand = isTTS && isAiFullTtsEnabled();

  if (!ignoreCommand) {
    await executeCommand({
      chat: mentionedChat,
      channel,
      tags,
      command,
      value: commandValue,
      ttsUser: isTTS ? BOT_USERNAME : undefined,
    });
  }

  logger.info(`AI command processed: ${command}`);

  if (result.answer) {
    for (const responseMessage of splitChatMessage(result.answer)) {
      sayAi(chat, channel, username, responseMessage);
    }

    return;
  }

  if (command !== '!game' && command !== '!categoria') {
    sayAi(chat, channel, username, `Listo, ejecuté ${command}.`);
  }
};

export const handleAiMention = async (
  chat: tmi.Client,
  channel: string,
  tags: tmi.ChatUserstate,
  message: string,
): Promise<void> => {
  const username = tags.username || 'chat';
  const mentionedChat = createMentionedChat(chat, username);
  const result = await askAiQueued(channel, username, message);

  if (!result) {
    sayAi(chat, channel, username, AI_NO_RESPONSE_MESSAGE);
    return;
  }

  if (result.command) {
    await executeAiCommand(chat, mentionedChat, channel, tags, username, result);
    return;
  }

  if (result.answer) {
    logger.info(`AI: ${result.answer}`);

    for (const responseMessage of splitChatMessage(result.answer)) {
      sayAi(chat, channel, username, responseMessage);
    }

    return;
  }

  sayAi(chat, channel, username, AI_NO_RESPONSE_MESSAGE);
};
