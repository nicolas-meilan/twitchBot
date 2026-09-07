import axios from 'axios';

import fs from 'fs/promises';

import path from 'path';

import { AiExternalEndpointDocumentation } from './aiExternalEndpoints';

const AI_EXTRA_DATA_DIRECTORY = path.resolve(process.cwd(), 'aiExtraData');

type OpenApiParameter = {
  name?: string;
  in?: string;
  description?: string;
  required?: boolean;
  schema?: Record<string, unknown>;
};

type OpenApiResponseContent = {
  schema?: Record<string, unknown>;
};

type OpenApiResponse = {
  description?: string;
  content?: Record<string, OpenApiResponseContent>;
};

type OpenApiOperation = {
  summary?: string;
  description?: string;
  parameters?: OpenApiParameter[];
  requestBody?: Record<string, unknown>;
  responses?: Record<string, OpenApiResponse>;
};

type OpenApiDocument = {
  paths?: Record<string, Record<string, OpenApiOperation>>;
};

const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
]);

const sanitizeFileName = (value: string) => {
  const sanitized = value
    .replace(/^\//, '')
    .replace(/[{}]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return sanitized || 'root';
};

const getEndpointDirectory = (endpointName: string) =>
  path.join(AI_EXTRA_DATA_DIRECTORY, endpointName);

const getEndpointsFilePath = (endpointName: string) =>
  path.join(getEndpointDirectory(endpointName), 'endpoints.txt');

const getEndpointFileName = (method: string, route: string) =>
  `${method.toUpperCase()}_${sanitizeFileName(route)}.txt`;

const getEndpointFilePath = (
  endpointName: string,
  method: string,
  route: string,
) =>
  path.join(
    getEndpointDirectory(endpointName),
    getEndpointFileName(method, route),
  );

const cleanText = (value: string) => value
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/__([^_]+)__/g, '$1')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/\r\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const removeAuthorizationSection = (value: string) => {
  const authorizationPatterns = [
    /(?:^|\n)(?:__)?Authorization:(?:__)?[\s\S]*?(?=\n(?:__)?(?:Parameters|Request Body|Responses|Errors|Examples):(?:__)?|\s*$)/i,
    /(?:^|\n)Authorization:\s*[\s\S]*?(?=\n(?:Parameters|Request Body|Responses|Errors|Examples):|\s*$)/i,
  ];

  return authorizationPatterns.reduce(
    (text, pattern) => text.replace(pattern, ''),
    value,
  );
};

const formatValue = (value: unknown) => {
  if (typeof value === 'string') {
    return cleanText(value);
  }

  return JSON.stringify(value, null, 2);
};

const formatSchema = (
  schema: Record<string, unknown> | undefined,
): string => {
  if (!schema) return 'unknown';

  if (schema.$ref && typeof schema.$ref === 'string') {
    return schema.$ref.replace('#/components/schemas/', '');
  }

  const type = schema.type;

  if (type === 'array') {
    return `array<${formatSchema(
      schema.items as Record<string, unknown> | undefined,
    )}>`;
  }

  if (type === 'object' || schema.properties) {
    const properties = schema.properties as
      | Record<string, Record<string, unknown>>
      | undefined;

    if (!properties) return 'object';

    return Object.entries(properties)
      .map(([name, property]) =>
        `${name}: ${formatSchema(property)}`,
      )
      .join('\n');
  }

  if (schema.enum) {
    return `${type || 'string'} (${formatValue(schema.enum)})`;
  }

  if (schema.format) {
    return `${type || 'unknown'} (${schema.format})`;
  }

  return String(type || 'unknown');
};

const formatParameter = (parameter: OpenApiParameter) => [
  `NAME: ${cleanText(parameter.name || '')}`,
  `IN: ${cleanText(parameter.in || '')}`,
  `DESCRIPTION: ${cleanText(parameter.description || '')}`,
  `REQUIRED: ${parameter.required ? 'true' : 'false'}`,
  `SCHEMA: ${formatValue(parameter.schema || {})}`,
].join('\n');

const formatRequestBody = (
  requestBody: Record<string, unknown> | undefined,
) => {
  if (!requestBody) return 'None';

  const content = requestBody.content as
    | Record<string, OpenApiResponseContent>
    | undefined;

  if (!content) {
    return formatValue(requestBody);
  }

  return Object.entries(content)
    .map(([contentType, value]) => [
      `CONTENT-TYPE: ${cleanText(contentType)}`,
      `SCHEMA:`,
      formatSchema(value.schema),
    ].join('\n'))
    .join('\n\n');
};

const formatResponse = (
  status: string,
  response: OpenApiResponse,
) => {
  const content = response.content;

  if (!content) {
    return [
      `STATUS: ${status}`,
      `DESCRIPTION: ${cleanText(response.description || '')}`,
    ].join('\n');
  }

  const schemas = Object.entries(content)
    .map(([contentType, value]) => [
      `CONTENT-TYPE: ${cleanText(contentType)}`,
      `SCHEMA:`,
      formatSchema(value.schema),
    ].join('\n'))
    .join('\n\n');

  return [
    `STATUS: ${status}`,
    `DESCRIPTION: ${cleanText(response.description || '')}`,
    schemas,
  ].join('\n');
};

const formatEndpointDocumentation = (
  method: string,
  route: string,
  operation: OpenApiOperation,
) => {
  const parameters = operation.parameters || [];
  const responses = operation.responses || {};

  const documentation = [
    `METHOD: ${method.toUpperCase()}`,
    `PATH: ${route}`,
    '',
    `SUMMARY: ${cleanText(operation.summary || '')}`,
    '',
    `DESCRIPTION: ${cleanText(operation.description || '')}`,
    '',
    'PARAMETERS:',
    parameters.length
      ? parameters.map(formatParameter).join('\n\n')
      : 'None',
    '',
    'REQUEST BODY:',
    formatRequestBody(operation.requestBody),
    '',
    'RESPONSES:',
    Object.keys(responses).length
      ? Object.entries(responses)
        .map(([status, response]) => formatResponse(status, response))
        .join('\n\n')
      : 'None',
  ].join('\n');

  return removeAuthorizationSection(documentation)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const hasDocumentation = async (endpointName: string) => {
  try {
    await fs.access(getEndpointsFilePath(endpointName));
    return true;
  } catch {
    return false;
  }
};

const generateAiExternalEndpointDocumentation = async (
  endpointName: string,
) => {
  const openApiUrl =
    AiExternalEndpointDocumentation[
      endpointName as keyof typeof AiExternalEndpointDocumentation
    ];

  if (!openApiUrl) {
    throw new Error(
      `Unknown AI external endpoint documentation: ${endpointName}`,
    );
  }

  const response = await axios.get(openApiUrl);

  const openApi = response.data as OpenApiDocument;

  const endpointDirectory = getEndpointDirectory(endpointName);

  await fs.mkdir(endpointDirectory, { recursive: true });

  const endpoints: Array<{
    method: string;
    route: string;
    fileName: string;
    summary: string;
  }> = [];

  for (const [route, pathItem] of Object.entries(openApi.paths || {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method)) continue;

      const summary = cleanText(operation.summary || '');
      const fileName = getEndpointFileName(method, route);

      endpoints.push({
        method: method.toUpperCase(),
        route,
        fileName,
        summary,
      });

      await fs.writeFile(
        path.join(endpointDirectory, fileName),
        formatEndpointDocumentation(
          method,
          route,
          operation,
        ),
        'utf8',
      );
    }
  }

  const endpointsFile = endpoints
    .map((item) => `${item.route} - ${item.summary}`)
    .join('\n');

  await fs.writeFile(
    getEndpointsFilePath(endpointName),
    endpointsFile,
    'utf8',
  );

  return {
    endpoint: endpointName,
    endpoints: endpoints.length,
  };
};

export const ensureAiExternalEndpointDocumentation = async (
  endpointName: string,
) => {
  if (await hasDocumentation(endpointName)) {
    return;
  }

  await generateAiExternalEndpointDocumentation(endpointName);
};

export const getAiExternalEndpointDocumentation = async (
  endpointName: string,
) => {
  await ensureAiExternalEndpointDocumentation(endpointName);

  return fs.readFile(
    getEndpointsFilePath(endpointName),
    'utf8',
  );
};

export const getAiExternalEndpointDetail = async (
  endpointName: string,
  method: string,
  route: string,
) => {
  await ensureAiExternalEndpointDocumentation(endpointName);

  return fs.readFile(
    getEndpointFilePath(endpointName, method, route),
    'utf8',
  );
};

export const updateAiExternalEndpointDocumentation = async (
  endpointName: string,
) => {
  return generateAiExternalEndpointDocumentation(endpointName);
};
