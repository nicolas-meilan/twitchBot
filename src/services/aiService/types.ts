export const AI_EXTERNAL_ACTIONS = [
  'get_system_prompt',
  'list_endpoints',
  'get_endpoint_detail',
  'execute_request',
] as const;

export type AiExternalAction = typeof AI_EXTERNAL_ACTIONS[number];
export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type MemoryMessage = {
  username: string;
  role: Extract<ChatRole, 'user' | 'assistant'>;
  content: string;
};

export type AiCommand = {
  name: string;
  value: string;
};

export type AiExternalInformationRequest = {
  action: AiExternalAction;
  font: string;
  query?: string | null;
  method?: string | null;
  route?: string | null;
  params?: Record<string, unknown> | null;
  body?: Record<string, unknown> | null;
  responseFields?: string[] | null;
};

export type AiResult = {
  answer?: string;
  command?: AiCommand;
};

export type AiRawResult = AiResult & {
  externalInformation?: AiExternalInformationRequest;
};

export type AiExternalResolution = {
  success: boolean;
  hasData: boolean;
  retryable: boolean;
  output: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const isNullableRecord = (value: unknown): value is Record<string, unknown> | null | undefined => (
  value === undefined || value === null || isRecord(value)
);

const isNullableString = (value: unknown): value is string | null | undefined => (
  value === undefined || value === null || typeof value === 'string'
);

const isNullableStringArray = (value: unknown): value is string[] | null | undefined => (
  value === undefined
  || value === null
  || (Array.isArray(value) && value.every((item) => typeof item === 'string'))
);

const parseCommand = (value: unknown): AiCommand | undefined | null => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value) || typeof value.name !== 'string' || typeof value.value !== 'string') return null;

  return {
    name: value.name.toLowerCase(),
    value: value.value.trim(),
  };
};

const parseExternalInformation = (value: unknown): AiExternalInformationRequest | undefined | null => {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value) || !AI_EXTERNAL_ACTIONS.includes(value.action as AiExternalAction)) return null;
  if (typeof value.font !== 'string' || !value.font.trim()) return null;
  if (!isNullableString(value.query)) return null;
  if (!isNullableString(value.method) || !isNullableString(value.route)) return null;
  if (!isNullableRecord(value.params) || !isNullableRecord(value.body)) return null;
  if (!isNullableStringArray(value.responseFields)) return null;

  return {
    action: value.action as AiExternalAction,
    font: value.font.trim(),
    query: value.query,
    method: value.method,
    route: value.route,
    params: value.params,
    body: value.body,
    responseFields: value.responseFields,
  };
};

export const parseAiRawResult = (content: string): AiRawResult | undefined => {
  try {
    const parsed: unknown = JSON.parse(content);
    if (!isRecord(parsed)) return;

    const command = parseCommand(parsed.command);
    const externalInformation = parseExternalInformation(parsed.externalInformation);
    if (command === null || externalInformation === null) return;

    const answer = typeof parsed.answer === 'string'
      ? parsed.answer.replace(/^!/, '').trim()
      : undefined;

    if (!answer && !command && !externalInformation) return;

    return {
      answer,
      command: externalInformation ? undefined : command,
      externalInformation,
    };
  } catch {
    return;
  }
};
