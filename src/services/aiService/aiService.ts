import tmi from 'tmi.js';

import logger from '../../utils/logger';

import {
  AI_EXTERNAL_INFO_ERROR_MESSAGE,
  AI_EXTERNAL_CATALOG_DELIVERED_PROMPT,
  AI_EXTERNAL_CATALOG_PROMPT,
  AI_EXTERNAL_INITIAL_PROMPT,
  AI_EXTERNAL_DETAIL_PROMPT,
  AI_EXTERNAL_EXECUTION_PROMPT,
  AI_EXTERNAL_FINAL_PROMPT,
  AI_EXTERNAL_ACTION_STAGE_ERROR_MESSAGE,
  AI_EXTERNAL_COMMAND_FORBIDDEN_ERROR_MESSAGE,
  AI_EXTERNAL_INFO_NO_DATA_MESSAGE,
  AI_EXTERNAL_WORKFLOW_STAGES,
  AiExternalWorkflowStage,
  AI_MAX_EXTERNAL_STEPS,
  AI_MAX_QUEUE_SIZE,
  AI_MENTION,
  getAiExternalFontGuide,
} from './aiConfig';
import {
  AiContextLimitError,
  AiContextLimitUnavailableError,
  logAiRequestError,
  requestAiCompletion,
} from './aiClient';
import {
  createMentionedChat,
  executeAiCommand,
  sayAi,
  sendAiAnswer,
} from './chatResponder';
import {
  AI_CONTEXT_LIMIT_MESSAGE,
  AI_CONTEXT_LIMIT_UNAVAILABLE_MESSAGE,
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
import {
  AI_EXTERNAL_ACTIONS,
  AiExternalAction,
  AiResult,
  ChatMessage,
  parseAiRawResult,
} from './types';

export type { AiCommand, AiExternalInformationRequest, AiResult } from './types';
export {
  AI_EXECUTABLE_COMMANDS,
  createMentionedChat,
  formatAiResponseForChat,
  sayAi,
} from './chatResponder';

const aiQueue = new ChannelQueue(AI_MAX_QUEUE_SIZE);

const createWorkflowMessages = (
  context: string,
  stateInstruction?: string,
): ChatMessage[] => [
  {
    role: 'system',
    content: [context, stateInstruction].filter(Boolean).join('\n'),
  },
];

const getExternalStagePrompt = (
  stage: AiExternalWorkflowStage,
  font?: string,
): string => {
  const prompts: Record<AiExternalWorkflowStage, string> = {
    [AI_EXTERNAL_WORKFLOW_STAGES.INITIAL]: AI_EXTERNAL_INITIAL_PROMPT,
    [AI_EXTERNAL_WORKFLOW_STAGES.CATALOG]: AI_EXTERNAL_DETAIL_PROMPT,
    [AI_EXTERNAL_WORKFLOW_STAGES.DETAIL]: AI_EXTERNAL_EXECUTION_PROMPT,
    [AI_EXTERNAL_WORKFLOW_STAGES.RESULT]: AI_EXTERNAL_FINAL_PROMPT,
  };

  return font
    ? `${prompts[stage]}\n${getAiExternalFontGuide(font)}`
    : prompts[stage];
};

const EXPECTED_EXTERNAL_ACTION_BY_STAGE: Record<
  AiExternalWorkflowStage,
  AiExternalAction | undefined
> = {
  [AI_EXTERNAL_WORKFLOW_STAGES.INITIAL]: AI_EXTERNAL_ACTIONS.LIST_ENDPOINTS,
  [AI_EXTERNAL_WORKFLOW_STAGES.CATALOG]: AI_EXTERNAL_ACTIONS.GET_ENDPOINT_DETAIL,
  [AI_EXTERNAL_WORKFLOW_STAGES.DETAIL]: AI_EXTERNAL_ACTIONS.EXECUTE_REQUEST,
  [AI_EXTERNAL_WORKFLOW_STAGES.RESULT]: AI_EXTERNAL_ACTIONS.EXECUTE_REQUEST,
};

const isExpectedExternalAction = (
  stage: AiExternalWorkflowStage,
  action: AiExternalAction,
): boolean => EXPECTED_EXTERNAL_ACTION_BY_STAGE[stage] === action;

const createExternalQuery = (
  username: string,
  query: string | null | undefined,
  fallbackQuestion: string,
): string => `Usuario ${username}: ${query?.trim() || fallbackQuestion}`;

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
    let externalStage: AiExternalWorkflowStage = AI_EXTERNAL_WORKFLOW_STAGES.INITIAL;
    let externalWorkflowStarted = false;
    let externalFont: string | undefined;
    let externalDetailContext: string | undefined;
    let finalResult: AiResult | undefined;

    for (let step = 0; step < AI_MAX_EXTERNAL_STEPS; step += 1) {
      const content = await requestAiCompletion(messages, externalWorkflowStarted);
      if (!content) return;

      const parsed = parseAiRawResult(content);
      if (!parsed) {
        logger.warn('AI returned an invalid response format');
        finalResult = { answer: AI_INVALID_RESPONSE_MESSAGE };
        break;
      }

      if (externalWorkflowStarted && parsed.command) {
        messages = buildExternalConversation(
          username,
          externalQuery,
          createWorkflowMessages(AI_EXTERNAL_COMMAND_FORBIDDEN_ERROR_MESSAGE),
          getExternalStagePrompt(externalStage, externalFont),
        );
        continue;
      }

      if (!parsed.externalInformation) {
        finalResult = { answer: parsed.answer, command: parsed.command };
        break;
      }

      const parsedRequest = parsed.externalInformation;
      const requestWithFont = externalWorkflowStarted && externalFont
        ? {
          ...parsedRequest,
          font: externalFont,
          query: externalQuery,
        }
        : parsedRequest;
      const request = (
        externalStage === AI_EXTERNAL_WORKFLOW_STAGES.INITIAL
        && requestWithFont.action === AI_EXTERNAL_ACTIONS.LIST_ENDPOINTS
      )
        ? {
          ...requestWithFont,
          query: createExternalQuery(username, requestWithFont.query, question),
        }
        : requestWithFont;
      logger.info(`AI external information step: ${JSON.stringify(request)}`);

      if (!isExpectedExternalAction(externalStage, request.action)) {
        messages = buildExternalConversation(
          username,
          externalQuery,
          createWorkflowMessages(AI_EXTERNAL_ACTION_STAGE_ERROR_MESSAGE),
          getExternalStagePrompt(externalStage, externalFont || request.font),
        );
        continue;
      }

      if (
        externalStage === AI_EXTERNAL_WORKFLOW_STAGES.INITIAL
        && request.action === AI_EXTERNAL_ACTIONS.LIST_ENDPOINTS
      ) {
        externalWorkflowStarted = true;
        externalFont = request.font;
        if (parsed.answer) await onExternalInformationAnswer?.(parsed.answer);
        externalQuery = request.query!;
        const catalogResolution = await resolveExternalInformationRequest({
          ...request,
        });

        if (!catalogResolution.success) {
          if (catalogResolution.retryable) {
            messages = buildExternalConversation(
              username,
              externalQuery,
              createWorkflowMessages(catalogResolution.output),
              AI_EXTERNAL_CATALOG_PROMPT,
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

        externalStage = AI_EXTERNAL_WORKFLOW_STAGES.CATALOG;
        messages = buildExternalConversation(
          username,
          externalQuery,
          createWorkflowMessages(
            catalogResolution.output,
            AI_EXTERNAL_CATALOG_DELIVERED_PROMPT,
          ),
          getExternalStagePrompt(externalStage, externalFont),
        );
        continue;
      }

      const resolution = await resolveExternalInformationRequest(request);
      if (!resolution.success) {
        if (resolution.retryable) {
          if (request.action === AI_EXTERNAL_ACTIONS.GET_ENDPOINT_DETAIL) {
            externalStage = AI_EXTERNAL_WORKFLOW_STAGES.CATALOG;
            const catalogResolution = await resolveExternalInformationRequest({
              ...request,
              action: AI_EXTERNAL_ACTIONS.LIST_ENDPOINTS,
            });

            if (catalogResolution.success && catalogResolution.hasData) {
              messages = buildExternalConversation(
                username,
                externalQuery,
                createWorkflowMessages(
                  [resolution.output, catalogResolution.output].join('\n\n'),
                  AI_EXTERNAL_CATALOG_DELIVERED_PROMPT,
                ),
                getExternalStagePrompt(externalStage, externalFont),
              );
              continue;
            }
          }

          const retryPrompt = request.action === AI_EXTERNAL_ACTIONS.GET_ENDPOINT_DETAIL
            ? getExternalStagePrompt(externalStage, externalFont)
            : AI_EXTERNAL_EXECUTION_PROMPT;
          const retryContext = request.action === AI_EXTERNAL_ACTIONS.EXECUTE_REQUEST
            && externalDetailContext
            ? [resolution.output, externalDetailContext].join('\n\n')
            : resolution.output;
          messages = buildExternalConversation(
            username,
            externalQuery,
            createWorkflowMessages(retryContext),
            retryPrompt,
          );
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

      if (request.action === AI_EXTERNAL_ACTIONS.GET_ENDPOINT_DETAIL) {
        externalStage = AI_EXTERNAL_WORKFLOW_STAGES.DETAIL;
        externalDetailContext = resolution.output;
        messages = buildExternalConversation(
          username,
          externalQuery,
          createWorkflowMessages(resolution.output),
          getExternalStagePrompt(externalStage, externalFont),
        );
        continue;
      }

      externalStage = AI_EXTERNAL_WORKFLOW_STAGES.RESULT;
      messages = buildExternalConversation(
        username,
        externalQuery,
        createWorkflowMessages(resolution.output),
        getExternalStagePrompt(externalStage, externalFont),
      );
    }

    finalResult ||= { answer: AI_NO_RESPONSE_MESSAGE };
    saveConversationResult(channel, username, question, finalResult);
    return finalResult;
  } catch (error) {
    if (error instanceof AiContextLimitError || error instanceof AiContextLimitUnavailableError) {
      const result = {
        answer: error instanceof AiContextLimitUnavailableError
          ? AI_CONTEXT_LIMIT_UNAVAILABLE_MESSAGE
          : AI_CONTEXT_LIMIT_MESSAGE,
      };
      saveConversationResult(channel, username, question, result);
      return result;
    }

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
