import axios from 'axios';

import fs from 'fs/promises';

import path from 'path';

import { AiExternalEndpoints } from './aiExternalEndpoints';

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
  components?: {
    schemas?: Record<string, Record<string, unknown>>;
  };
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
    .replace(/^\/+/, '')
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

const normalizeRoute = (route: string) => {
  let normalizedRoute = route.trim();
  if (/^https?:\/\//i.test(normalizedRoute)) {
    try {
      normalizedRoute = new URL(normalizedRoute).pathname;
    } catch {
      return normalizedRoute;
    }
  }

  normalizedRoute = normalizedRoute
    .split('?')[0]
    .split('#')[0]
    .trim();

  if (!normalizedRoute) return '/';

  return normalizedRoute.startsWith('/')
    ? normalizedRoute
    : `/${normalizedRoute}`;
};

const routeMatches = (documentedRoute: string, requestedRoute: string) => {
  const normalizedDocumentedRoute = normalizeRoute(documentedRoute);
  const normalizedRequestedRoute = normalizeRoute(requestedRoute);

  if (normalizedDocumentedRoute === normalizedRequestedRoute) {
    return true;
  }

  const documentedSegments = normalizedDocumentedRoute
    .split('/')
    .filter(Boolean);

  const requestedSegments = normalizedRequestedRoute
    .split('/')
    .filter(Boolean);

  if (documentedSegments.length !== requestedSegments.length) {
    return false;
  }

  return documentedSegments.every((segment, index) => {
    const requestedSegment = requestedSegments[index];

    if (
      segment.startsWith('{')
      && segment.endsWith('}')
    ) {
      return requestedSegment.length > 0;
    }

    return segment === requestedSegment;
  });
};

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

const indentText = (value: string, spaces: number) => value
  .split('\n')
  .map((line) => `${' '.repeat(spaces)}${line}`)
  .join('\n');

const formatSchema = (
  schema: Record<string, unknown> | undefined,
  schemas: Record<string, Record<string, unknown>> = {},
  resolvingRefs: Set<string> = new Set(),
): string => {
  if (!schema) return 'unknown';

  if (schema.$ref && typeof schema.$ref === 'string') {
    const schemaName = schema.$ref.replace(
      '#/components/schemas/',
      '',
    );

    const referencedSchema = schemas[schemaName];

    if (!referencedSchema) {
      return schemaName;
    }

    if (resolvingRefs.has(schemaName)) {
      return schemaName;
    }

    const nextResolvingRefs = new Set(resolvingRefs);
    nextResolvingRefs.add(schemaName);

    return formatSchema(
      referencedSchema,
      schemas,
      nextResolvingRefs,
    );
  }

  if (Array.isArray(schema.allOf)) {
    const schemasText = schema.allOf
      .map((item) =>
        formatSchema(
          item as Record<string, unknown>,
          schemas,
          resolvingRefs,
        ),
      )
      .join('\n');

    if (schema.properties) {
      const propertiesText = formatSchema(
        {
          type: 'object',
          properties: schema.properties,
        },
        schemas,
        resolvingRefs,
      );

      return [
        'allOf {',
        indentText(schemasText, 2),
        '}',
        propertiesText,
      ].join('\n');
    }

    return [
      'allOf {',
      indentText(schemasText, 2),
      '}',
    ].join('\n');
  }

  if (Array.isArray(schema.oneOf)) {
    const schemasText = schema.oneOf
      .map((item) =>
        formatSchema(
          item as Record<string, unknown>,
          schemas,
          resolvingRefs,
        ),
      )
      .join('\n');

    return [
      'oneOf {',
      indentText(schemasText, 2),
      '}',
    ].join('\n');
  }

  if (Array.isArray(schema.anyOf)) {
    const schemasText = schema.anyOf
      .map((item) =>
        formatSchema(
          item as Record<string, unknown>,
          schemas,
          resolvingRefs,
        ),
      )
      .join('\n');

    return [
      'anyOf {',
      indentText(schemasText, 2),
      '}',
    ].join('\n');
  }

  const type = schema.type;

  if (type === 'array') {
    const itemSchema = formatSchema(
      schema.items as Record<string, unknown> | undefined,
      schemas,
      resolvingRefs,
    );

    if (itemSchema.includes('\n')) {
      return [
        'array<',
        indentText(itemSchema, 2),
        '>',
      ].join('\n');
    }

    return `array<${itemSchema}>`;
  }

  if (type === 'object' || schema.properties) {
    const properties = schema.properties as
      | Record<string, Record<string, unknown>>
      | undefined;

    if (!properties) return 'object';

    const propertiesText = Object.entries(properties)
      .map(([name, property]) =>
        `${name}: ${formatSchema(
          property,
          schemas,
          resolvingRefs,
        )}`,
      )
      .join('\n');

    return [
      'object {',
      indentText(propertiesText, 2),
      '}',
    ].join('\n');
  }

  if (schema.enum) {
    return `${type || 'string'} (${formatValue(schema.enum)})`;
  }

  if (schema.format) {
    return `${type || 'unknown'} (${schema.format})`;
  }

  if (schema.nullable === true) {
    return `${String(type || 'unknown')} | null`;
  }

  return String(type || 'unknown');
};

const formatParameter = (
  parameter: OpenApiParameter,
  schemas: Record<string, Record<string, unknown>>,
) => [
  `NAME: ${cleanText(parameter.name || '')}`,
  `IN: ${cleanText(parameter.in || '')}`,
  `DESCRIPTION: ${cleanText(parameter.description || '')}`,
  `REQUIRED: ${parameter.required ? 'true' : 'false'}`,
  `SCHEMA: ${formatSchema(parameter.schema || {}, schemas)}`,
].join('\n');

const formatRequestBody = (
  requestBody: Record<string, unknown> | undefined,
  schemas: Record<string, Record<string, unknown>>,
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
      formatSchema(value.schema, schemas),
    ].join('\n'))
    .join('\n\n');
};

const formatResponse = (
  status: string,
  response: OpenApiResponse,
  schemas: Record<string, Record<string, unknown>>,
) => {
  const content = response.content;

  if (!content) {
    return [
      `STATUS: ${status}`,
      `DESCRIPTION: ${cleanText(response.description || '')}`,
    ].join('\n');
  }

  const schemasText = Object.entries(content)
    .map(([contentType, value]) => [
      `CONTENT-TYPE: ${cleanText(contentType)}`,
      `SCHEMA:`,
      formatSchema(value.schema, schemas),
    ].join('\n'))
    .join('\n\n');

  return [
    `STATUS: ${status}`,
    `DESCRIPTION: ${cleanText(response.description || '')}`,
    schemasText,
  ].join('\n');
};

const formatEndpointDocumentation = (
  method: string,
  route: string,
  operation: OpenApiOperation,
  schemas: Record<string, Record<string, unknown>>,
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
      ? parameters
        .map((parameter) => formatParameter(parameter, schemas))
        .join('\n\n')
      : 'None',
    '',
    'REQUEST BODY:',
    formatRequestBody(operation.requestBody, schemas),
    '',
    'RESPONSES:',
    Object.keys(responses).length
      ? Object.entries(responses)
        .map(([status, response]) =>
          formatResponse(status, response, schemas),
        )
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
  const endpoint = AiExternalEndpoints[
    endpointName as keyof typeof AiExternalEndpoints
  ];

  if (!endpoint?.documentation) {
    throw new Error(
      `Unknown AI external endpoint documentation: ${endpointName}`,
    );
  }

  const openApiUrl = endpoint.documentation;
  const response = await axios.get(openApiUrl);
  const openApi = response.data as OpenApiDocument;
  const schemas = openApi.components?.schemas || {};
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
          schemas,
        ),
        'utf8',
      );
    }
  }

  const endpointsFile = endpoints
    .map((item) => `${item.method} ${item.route} - ${item.summary}`)
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

export const resolveAiExternalEndpointRoute = async (
  endpointName: string,
  method: string,
  route: string,
) => {
  await ensureAiExternalEndpointDocumentation(endpointName);

  const endpointDirectory = getEndpointDirectory(endpointName);
  const files = await fs.readdir(endpointDirectory);
  const normalizedMethod = method.toLowerCase();

  for (const fileName of files) {
    if (!fileName.endsWith('.txt') || fileName === 'endpoints.txt') {
      continue;
    }

    const filePath = path.join(endpointDirectory, fileName);
    const documentation = await fs.readFile(filePath, 'utf8');
    const methodMatch = documentation.match(/^METHOD:\s*(.+)$/m);
    const pathMatch = documentation.match(/^PATH:\s*(.+)$/m);

    if (!methodMatch || !pathMatch) {
      continue;
    }

    if (methodMatch[1].trim().toLowerCase() !== normalizedMethod) {
      continue;
    }

    const documentedRoute = pathMatch[1].trim();

    if (routeMatches(documentedRoute, route)) {
      return documentedRoute;
    }
  }

  throw new Error(
    `No documented route found for ${method.toUpperCase()} ${route} in "${endpointName}".`,
  );
};

export const getAiExternalEndpointDetail = async (
  endpointName: string,
  method: string,
  route: string,
) => {
  const documentedRoute = await resolveAiExternalEndpointRoute(
    endpointName,
    method,
    route,
  );

  return fs.readFile(
    getEndpointFilePath(endpointName, method, documentedRoute),
    'utf8',
  );
};

export const updateAiExternalEndpointDocumentation = async (
  endpointName: string,
) => {
  return generateAiExternalEndpointDocumentation(endpointName);
};
