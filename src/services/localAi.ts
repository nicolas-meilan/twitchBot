import axios from 'axios';
import logger from '../utils/logger';
import { getAiCommandsGuide } from '../configuration/aiCommands';

const AI_URL = process.env.AI_URL!;
const AI_MODEL = process.env.AI_MODEL!;
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS!);
const AI_MEMORY_MESSAGES = Number(process.env.AI_MEMORY_MESSAGES!);
const AI_MENTION = `@${process.env.BOT_USERNAME!}`;

const SYSTEM_PROMPT = [
  'Sos Rungestone, el asistente gracioso y pícaro del chat de un streamer de Twitch.',
  'Respondé en español rioplatense, con humor y buena onda, sin ser pesado, y de forma breve porque se publica en el chat.',
  'Respondé exclusivamente con un único objeto JSON válido, sin Markdown, texto adicional ni reasoning_content.',
  'El formato obligatorio es: {"answer":"texto opcional","command":{"name":"!comando","value":"argumentos"}}.',
  'answer y command son opcionales, pero al menos uno debe estar presente. name y value siempre van dentro de command, nunca en la raíz.',
  'Usá como name únicamente comandos que aparezcan en la guía siguiente y respetá su sintaxis.',
  'Si no hace falta ejecutar nada, devolvé {"answer":"texto"}. Si hace falta ejecutar algo, incluí command y no afirmes que se ejecutó: el bot lo validará.',
  'Nunca ejecutes comandos vos mismo ni inventes comandos. El bot validará los permisos reales del usuario antes de ejecutar la acción.',
  'Los ejemplos de sintaxis son ejemplos de uso, no son la lista completa. Si preguntan qué comandos existen, enumerá la guía completa y no afirmes que hay solo uno o dos.',
  `Guía actual de comandos:\n${getAiCommandsGuide()}`,
].join(' ');

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
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
    logger.warn('Local AI returned an invalid response format');
    return;
  }
};

export const askLocalAi = async (channel: string, username: string, message: string): Promise<AiResult | undefined> => {
  const question = cleanMention(message);
  if (!question) return;

  try {
    const channelKey = channel.toLowerCase();
    const history = memoryByChannel.get(channelKey) || [];
    const response = await axios.post<ChatCompletionResponse>(
      `${AI_URL.replace(/\/$/, '')}/v1/chat/completions`,
      {
        model: AI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history.map((item) => ({
            role: item.role,
            content: `${item.username}: ${item.content}`,
          })),
          { role: 'user', content: `${username}: ${question}` },
        ],
      },
      { timeout: AI_TIMEOUT_MS },
    );

    const content = response.data.choices?.[0]?.message?.content?.trim();
    if (!content) return;

    const result = parseAiResult(content);
    if (!result) return;

    const updatedHistory = [
      ...history,
      { username, role: 'user' as const, content: question },
      { username: 'rungestone', role: 'assistant' as const, content: result.answer || JSON.stringify(result.command) },
    ];
    memoryByChannel.set(channelKey, updatedHistory.slice(-AI_MEMORY_MESSAGES));
    return result;
  } catch (error) {
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      logger.error(`Local AI timeout after ${AI_TIMEOUT_MS}ms`);
    } else {
      logger.error('Error consulting local AI:', error);
    }
    return;
  }
};

export const isAiMention = (message: string) => /@rungestone/i.test(message);