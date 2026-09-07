import axios from 'axios';

import tmi from 'tmi.js';

import logger from '../../utils/logger';

import { formatKnownCommandsForChat } from './aiConfig';

import {
  AI_INVALID_RESPONSE_MESSAGE,
  BROADCASTER_MESSAGES_CONFIG,
  MESSAGES_CONFIG,
  MODS_ACTIONS_CONFIG,
  USERS_ACTIONS_CONFIG,
  VIP_ACTIONS_CONFIG,
} from '../../configuration/chat';

import { isAiFullTtsEnabled } from '../../actions/modActions';

import { sendEventTTS } from '../botEvents';

import {
  AI_MENTION,
  AI_MEMORY_MESSAGES,
  AI_MAX_QUEUE_SIZE,
  AI_MODEL,
  AI_TIMEOUT_MS,
  AI_URL,
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
