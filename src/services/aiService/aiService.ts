import tmi from 'tmi.js';

import logger from '../../utils/logger';

import {
  AI_EXTERNAL_INFO_ERROR_MESSAGE,
  AI_EXTERNAL_CATALOG_DELIVERED_PROMPT,
  AI_EXTERNAL_INFO_NO_DATA_MESSAGE,
  AI_MAX_EXTERNAL_STEPS,
  AI_MAX_QUEUE_SIZE,
  AI_MENTION,
} from './aiConfig';
import { logAiRequestError, requestAiCompletion } from './aiClient';
import {
  createMentionedChat,
  executeAiCommand,
  sayAi,
  sendAiAnswer,
} from './chatResponder';
import {
  AI_EXTERNAL_INFO_LIMIT_MESSAGE,
  AI_INVALID_RESPONSE_MESSAGE,
  AI_NO_RESPONSE_MESSAGE,
} from '../../configuration/chat';
import { ChannelQueue } from './channelQueue';
import {
  buildConversation,
  buildExternalConversation,
  cleanAiMention,
  saveConversationResult,
} from './conversation';
import { resolveExternalInformationRequest } from './externalInformation';
import { AiResult, ChatMessage, parseAiRawResult } from './types';

export type { AiCommand, AiExternalInformationRequest, AiResult } from './types';
export {
  AI_EXECUTABLE_COMMANDS,
  createMentionedChat,
  formatAiResponseForChat,
  sayAi,
} from './chatResponder';

const aiQueue = new ChannelQueue(AI_MAX_QUEUE_SIZE);

const createWorkflowMessages = (
  content: string,
  context: string,
  stateInstruction?: string,
): ChatMessage[] => [
  { role: 'assistant', content },
  { role: 'system', content: context },
  ...(stateInstruction ? [{ role: 'system' as const, content: stateInstruction }] : []),
];

type AiProgressHandler = (answer: string) => void | Promise<void>;

const askAiInternal = async (
  channel: string,
  username: string,
  message: string,
  onExternalInformationAnswer?: AiProgressHandler,
): Promise<AiResult | undefined> => {
  const question = cleanAiMention(message);
  if (!question) return;

  try {
    let messages = buildConversation(channel, username, question);
    let externalQuery = question;
    let finalResult: AiResult | undefined;

    for (let step = 0; step <= AI_MAX_EXTERNAL_STEPS; step += 1) {
      const content = await requestAiCompletion(messages);
      if (!content) return;

      const parsed = parseAiRawResult(content);
      if (!parsed) {
        logger.warn('AI returned an invalid response format');
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

      const request = parsed.externalInformation;
      logger.info(`AI external information step: ${JSON.stringify(request)}`);

      if (request.action === 'get_system_prompt') {
        if (parsed.answer) await onExternalInformationAnswer?.(parsed.answer);
        externalQuery = request.query?.trim() || question;
        const catalogResolution = await resolveExternalInformationRequest({
          ...request,
          action: 'list_endpoints',
        });

        if (!catalogResolution.success) {
          if (catalogResolution.retryable) {
            messages = buildExternalConversation(
              username,
              externalQuery,
              createWorkflowMessages(content, catalogResolution.output),
            );
            continue;
          }

          finalResult = { answer: AI_EXTERNAL_INFO_ERROR_MESSAGE };
          break;
        }

        if (!catalogResolution.hasData) {
          finalResult = { answer: AI_EXTERNAL_INFO_NO_DATA_MESSAGE };
          break;
        }

        messages = buildExternalConversation(
          username,
          externalQuery,
          createWorkflowMessages(
            content,
            catalogResolution.output,
            AI_EXTERNAL_CATALOG_DELIVERED_PROMPT,
          ),
        );
        continue;
      }

      const resolution = await resolveExternalInformationRequest(request);
      if (!resolution.success) {
        logger.warn(`AI external information request failed: ${resolution.output}`);
        if (resolution.retryable) {
          messages.push({ role: 'assistant', content });
          messages.push({ role: 'system', content: resolution.output });
          continue;
        }

        finalResult = { answer: AI_EXTERNAL_INFO_ERROR_MESSAGE };
        break;
      }

      if (!resolution.hasData) {
        logger.warn(`AI external information request returned no data: ${JSON.stringify(request)}`);
        finalResult = { answer: AI_EXTERNAL_INFO_NO_DATA_MESSAGE };
        break;
      }

      messages = buildExternalConversation(
        username,
        externalQuery,
        createWorkflowMessages(content, resolution.output),
      );
    }

    finalResult ||= { answer: AI_NO_RESPONSE_MESSAGE };
    saveConversationResult(channel, username, question, finalResult);
    return finalResult;
  } catch (error) {
    logAiRequestError(error);
    return;
  }
};

export const askAi = askAiInternal;

export const askAiQueued = async (
  channel: string,
  username: string,
  message: string,
  onExternalInformationAnswer?: AiProgressHandler,
): Promise<AiResult | undefined> => {
  const queued = await aiQueue.run(
    channel,
    () => askAiInternal(channel, username, message, onExternalInformationAnswer),
  );
  if (!queued.accepted) {
    logger.info(`AI request discarded because queue is full: ${channel}`);
    return;
  }

  return queued.value;
};

export const isAiMention = (message: string): boolean => (
  message.toLowerCase().includes(AI_MENTION.toLowerCase())
);

export const handleAiMention = async (
  chat: tmi.Client,
  channel: string,
  tags: tmi.ChatUserstate,
  message: string,
): Promise<void> => {
  const username = tags.username || 'chat';
  const result = await askAiQueued(
    channel,
    username,
    message,
    (answer) => sendAiAnswer(chat, channel, username, answer),
  );

  if (!result) {
    sayAi(chat, channel, username, AI_NO_RESPONSE_MESSAGE);
    return;
  }

  if (result.command) {
    await executeAiCommand(chat, createMentionedChat(chat, username), channel, tags, username, result);
    return;
  }

  if (result.answer) {
    sendAiAnswer(chat, channel, username, result.answer);
    return;
  }

  sayAi(chat, channel, username, AI_NO_RESPONSE_MESSAGE);
};
