import {
  AI_MEMORY_MESSAGES,
  AI_MENTION,
  BOT_USERNAME,
  EXTERNAL_INFORMATION_SYSTEM_PROMPT,
  SYSTEM_PROMPT,
} from './aiConfig';
import { AiResult, ChatMessage, MemoryMessage } from './types';

const memoryByChannel = new Map<string, MemoryMessage[]>();

const createUserMessage = (username: string, question: string): ChatMessage => ({
  role: 'user',
  content: `[usuario: ${username}] ${question}`,
});

export const normalizeChannel = (channel: string): string => channel.toLowerCase();

export const cleanAiMention = (message: string): string => (
  message.replace(new RegExp(AI_MENTION, 'ig'), '').trim()
);

export const buildConversation = (channel: string, username: string, question: string): ChatMessage[] => {
  const history = memoryByChannel.get(normalizeChannel(channel)) || [];

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((item) => ({
      role: item.role,
      content: `[usuario: ${item.username}] ${item.content}`,
    })),
    createUserMessage(username, question),
  ];
};

export const buildExternalConversation = (
  username: string,
  question: string,
  workflowMessages: ChatMessage[],
): ChatMessage[] => [
  { role: 'system', content: EXTERNAL_INFORMATION_SYSTEM_PROMPT },
  createUserMessage(username, question),
  ...workflowMessages,
];

export const saveConversationResult = (
  channel: string,
  username: string,
  question: string,
  result: AiResult,
): void => {
  const channelKey = normalizeChannel(channel);
  const history = memoryByChannel.get(channelKey) || [];
  const assistantContent = result.answer || JSON.stringify(result.command);

  const updatedHistory: MemoryMessage[] = [
    ...history,
    { username, role: 'user', content: question },
    { username: BOT_USERNAME, role: 'assistant', content: assistantContent },
  ];

  memoryByChannel.set(channelKey, updatedHistory.slice(-AI_MEMORY_MESSAGES));
};
