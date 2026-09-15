import axios from 'axios';

import {
  AI_CONTEXT_LIMIT_MESSAGE,
  AI_CONTEXT_LIMIT_UNAVAILABLE_MESSAGE,
} from '../../configuration/chat';
import logger from '../../utils/logger';

import {
  AI_MODEL,
  AI_LOG_TOKEN_USAGE,
  AI_TIMEOUT_MS,
  AI_URL,
  STRICT_RESPONSE_FORMAT,
} from './aiConfig';
import { ChatMessage } from './types';

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

type AiModel = {
  display_name?: string;
  key?: string;
  loaded_instances?: Array<{
    id?: string;
    config?: {
      context_length?: number;
    };
  }>;
};

type AiModelsResponse = {
  models?: AiModel[];
};

export class AiContextLimitError extends Error {
  constructor(
    public readonly estimatedTokens: number,
    public readonly maxTokens: number,
  ) {
    super(AI_CONTEXT_LIMIT_MESSAGE);
    this.name = 'AiContextLimitError';
  }
}

export class AiContextLimitUnavailableError extends Error {
  constructor() {
    super(AI_CONTEXT_LIMIT_UNAVAILABLE_MESSAGE);
    this.name = 'AiContextLimitUnavailableError';
  }
}

export const estimatePromptTokens = (
  messages: ChatMessage[],
  responseFormat: object = STRICT_RESPONSE_FORMAT,
): number => {
  const requestCharacters = JSON.stringify({ messages, response_format: responseFormat }).length;
  return Math.ceil(requestCharacters / 3);
};

let selectedModelKey: string | undefined;

const createRequestBody = (messages: ChatMessage[], responseFormat: object) => ({
  model: selectedModelKey || AI_MODEL,
  response_format: responseFormat,
  messages,
});

const getValidContextLength = (model?: AiModel): number | undefined => {
  const contextLength = model?.loaded_instances?.[0]?.config?.context_length;

  return Number.isFinite(contextLength) && contextLength! > 0
    ? contextLength
    : undefined;
};

const normalizeModelName = (value: string): string => value
  .toLowerCase()
  .replace(/\s+/g, '');

const modelMatchesConfiguredName = (model: AiModel): boolean => (
  !!model.display_name
  && normalizeModelName(model.display_name) === normalizeModelName(AI_MODEL)
);

const AI_RESPONSE_TOKEN_RESERVE = 256;
const MODEL_METADATA_REFRESH_MS = 15 * 60 * 1000;
let maxContextTokens: number | undefined;
let maxContextTokensFetchedAt = 0;
let maxContextTokensPromise: Promise<number | undefined> | undefined;

const getMaxContextTokens = async (): Promise<number | undefined> => {
  if (Date.now() - maxContextTokensFetchedAt < MODEL_METADATA_REFRESH_MS) {
    return maxContextTokens;
  }

  if (!maxContextTokensPromise) {
    maxContextTokensPromise = axios.get<AiModelsResponse>(
      `${AI_URL.replace(/\/$/, '')}/api/v1/models`,
      { timeout: AI_TIMEOUT_MS },
    ).then(({ data }) => {
      const models = data.models || [];
      const matchedModel = models.find(modelMatchesConfiguredName);
      const model = matchedModel || models[0];
      selectedModelKey = model?.key || model?.display_name;
      const discoveredContextLength = getValidContextLength(model);

      logger.info(
        `AI model selected: ${selectedModelKey || 'none'} (${matchedModel ? 'AI_MODEL display_name match' : 'first model fallback'})`,
      );

      if (discoveredContextLength) {
        logger.info(`AI model context limit discovered: ${discoveredContextLength}`);
      }

      return discoveredContextLength;
    }).catch(() => {
      logger.warn('AI model context limit could not be discovered from /api/v1/models');
      return undefined;
    }).finally(() => {
      maxContextTokensFetchedAt = Date.now();
      maxContextTokensPromise = undefined;
    });
  }

  maxContextTokens = await maxContextTokensPromise;
  return maxContextTokens;
};

const logTokenUsage = (messages: ChatMessage[], response: ChatCompletionResponse): void => {
  if (!AI_LOG_TOKEN_USAGE) return;

  const promptCharacters = messages.reduce((total, message) => total + message.content.length, 0);
  const completionCharacters = response.choices?.[0]?.message?.content?.length || 0;
  const estimatedPromptTokens = Math.ceil(promptCharacters / 4);
  const estimatedCompletionTokens = Math.ceil(completionCharacters / 4);
  const usage = response.usage;

  logger.info(
    `AI token usage: prompt=${usage?.prompt_tokens ?? estimatedPromptTokens} (${usage?.prompt_tokens === undefined ? 'estimated' : 'provider'}), completion=${usage?.completion_tokens ?? estimatedCompletionTokens} (${usage?.completion_tokens === undefined ? 'estimated' : 'provider'}), total=${usage?.total_tokens ?? estimatedPromptTokens + estimatedCompletionTokens}, messages=${messages.length}`,
  );
};

const getCompletionContent = (messages: ChatMessage[], response: ChatCompletionResponse): string | undefined => {
  logTokenUsage(messages, response);
  return response.choices?.[0]?.message?.content?.trim();
};

export const requestAiCompletion = async (
  messages: ChatMessage[],
  requireContextLimit = false,
): Promise<string | undefined> => {
  const estimatedPromptTokens = estimatePromptTokens(messages, STRICT_RESPONSE_FORMAT);
  const maxContextTokens = await getMaxContextTokens();
  const estimatedRequestTokens = estimatedPromptTokens + AI_RESPONSE_TOKEN_RESERVE;

  if (requireContextLimit && !maxContextTokens) {
    logger.warn('AI request rejected before provider call: context limit unavailable');
    throw new AiContextLimitUnavailableError();
  }

  if (maxContextTokens && estimatedRequestTokens > maxContextTokens) {
    logger.warn(
      `AI request rejected before provider call: estimated=${estimatedRequestTokens}, max=${maxContextTokens}`,
    );
    throw new AiContextLimitError(estimatedRequestTokens, maxContextTokens);
  }

  const url = `${AI_URL.replace(/\/$/, '')}/v1/chat/completions`;

  try {
    const response = await axios.post<ChatCompletionResponse>(
      url,
      createRequestBody(messages, STRICT_RESPONSE_FORMAT),
      { timeout: AI_TIMEOUT_MS },
    );

    return getCompletionContent(messages, response.data);
  } catch (error) {
    if (!axios.isAxiosError(error) || ![400, 422].includes(error.response?.status || 0)) {
      throw error;
    }

    logger.warn('AI JSON Schema unavailable; retrying with text format');
    const response = await axios.post<ChatCompletionResponse>(
      url,
      createRequestBody(messages, { type: 'text' }),
      { timeout: AI_TIMEOUT_MS },
    );

    return getCompletionContent(messages, response.data);
  }
};

export const logAiRequestError = (error: unknown): void => {
  if (!axios.isAxiosError(error)) {
    logger.error('AI error: unknown failure');
    return;
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    logger.error(`AI error: timeout after ${AI_TIMEOUT_MS}ms`);
    return;
  }

  if (error.response?.status) {
    const responseData = typeof error.response.data === 'string'
      ? error.response.data
      : JSON.stringify(error.response.data);
    logger.error(`AI error: HTTP ${error.response.status}${responseData ? ` - ${responseData}` : ''}`);
    return;
  }

  logger.error('AI error: connection failed');
};
