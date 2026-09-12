import axios from 'axios';

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

const createRequestBody = (messages: ChatMessage[], responseFormat: object) => ({
  model: AI_MODEL,
  response_format: responseFormat,
  messages,
});

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

export const requestAiCompletion = async (messages: ChatMessage[]): Promise<string | undefined> => {
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

    logger.warn('AI does not support JSON Schema; falling back to JSON object mode');
    const response = await axios.post<ChatCompletionResponse>(
      url,
      createRequestBody(messages, { type: 'json_object' }),
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
    logger.error(`AI error: HTTP ${error.response.status}`);
    return;
  }

  logger.error('AI error: connection failed');
};
