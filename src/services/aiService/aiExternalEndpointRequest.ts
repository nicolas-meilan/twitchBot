import axios from 'axios';

import { AiExternalEndpoints } from './aiExternalEndpoints';

type ExternalRequestParams = Record<string, unknown>;

type ExternalRequestResult = {
  success: boolean;
  status?: number;
  data: string;
  fieldsMatched?: boolean;
  shapeHint?: string;
};

type FieldTree = { [key: string]: FieldTree } | true;

const MAX_SHAPE_KEYS = 25;

const normalizeFieldPath = (path: string): string => (
  path
    .replace(/\[\d*\]/g, '')
    .replace(/(^|\.)(\d+)(?=\.|$)/g, '$1')
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('.')
);

const buildFieldTree = (paths: string[]): Record<string, FieldTree> => {
  const tree: Record<string, FieldTree> = {};

  for (const path of paths) {
    const normalizedPath = normalizeFieldPath(path);
    const segments = normalizedPath.split('.').filter(Boolean);

    if (segments.length === 0) continue;

    let node = tree;

    segments.forEach((segment, index) => {
      const isLast = index === segments.length - 1;

      if (isLast) {
        if (!(segment in node)) node[segment] = true;
        return;
      }

      const existing = node[segment];

      if (existing === true) {
        node[segment] = {};
      } else if (existing === undefined) {
        node[segment] = {};
      }

      node = node[segment] as Record<string, FieldTree>;
    });
  }

  return tree;
};

const applyFieldTree = (value: unknown, tree: FieldTree): unknown => {
  if (tree === true) return value;

  if (Array.isArray(value)) {
    return value.map((item) => applyFieldTree(item, tree));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, subtree] of Object.entries(tree)) {
      if (!(key in (value as Record<string, unknown>))) continue;

      result[key] = applyFieldTree((value as Record<string, unknown>)[key], subtree);
    }

    return result;
  }

  return value;
};

export const filterResponseFields = (value: unknown, fieldPaths?: string[] | null): unknown => {
  if (!fieldPaths || fieldPaths.length === 0) return value;

  const tree = buildFieldTree(fieldPaths);

  if (Object.keys(tree).length === 0) return value;

  return applyFieldTree(value, tree);
};

const describeShape = (value: unknown, depth = 0): string => {
  if (depth > 1) return '…';

  if (Array.isArray(value)) {
    if (value.length === 0) return 'array vacío';
    return `array [ ${describeShape(value[0], depth + 1)} ]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_SHAPE_KEYS);
    const parts = entries.map(([key, child]) => {
      if (depth === 1) return key;

      if (Array.isArray(child) || (child && typeof child === 'object')) {
        return `${key}: ${describeShape(child, depth + 1)}`;
      }

      return key;
    });

    return `{ ${parts.join(', ')} }`;
  }

  return typeof value;
};

const isEffectivelyEmpty = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;

  if (Array.isArray(value)) {
    return value.length === 0 || value.every(isEffectivelyEmpty);
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.length === 0 || entries.every(([, v]) => isEffectivelyEmpty(v));
  }

  return false;
};

const removeObjectUrls = (
  value: Record<string, unknown> | unknown[],
): Record<string, unknown> | unknown[] => {
  const parseValue = (item: unknown): unknown => {
    if (typeof item === 'string') {
      try {
        const parsedValue = JSON.parse(item);
        const cleanedValue = parseValue(parsedValue);

        return cleanedValue === undefined ? undefined : JSON.stringify(cleanedValue);
      } catch {
        return /^https?:\/\/?/i.test(item) ? undefined : item;
      }
    }

    if (Array.isArray(item)) {
      const cleanedArray = item
        .map(parseValue)
        .filter((value) => value !== undefined);

      return cleanedArray.length > 0 ? cleanedArray : undefined;
    }

    if (item instanceof Object) {
      const cleanedObject = Object.fromEntries(
        Object.entries(item)
          .map(([key, value]) => [
            key,
            parseValue(value),
          ])
          .filter(([, value]) => value !== undefined),
      );

      return Object.keys(cleanedObject).length > 0 ? cleanedObject : undefined;
    }

    return item;
  };

  return parseValue(value) as Record<string, unknown> | unknown[];
};

const truncateResponseText = (value: string, maxlength?: number) => (
  maxlength && value.length > maxlength
    ? `${value.slice(0, maxlength)}... [truncated]`
    : value
);

const buildRequestUrl = (baseUrl: string, route: string, params: ExternalRequestParams) => {
  const remainingParams: ExternalRequestParams = { ...params };
  const resolvedRoute = route.replace(/\{([^}]+)\}|:([a-zA-Z0-9_]+)/g,(_match, braced, colon) => {
    const key = braced || colon;
    const value = remainingParams[key];
    delete remainingParams[key];
    return value !== undefined ? encodeURIComponent(String(value)) : '';
  });
  const normalizedRoute = resolvedRoute.startsWith('/') ? resolvedRoute : `/${resolvedRoute}`;
  return {
    url: `${baseUrl.replace(/\/$/, '')}${normalizedRoute}`,
    queryParams: remainingParams,
  };
};

export const executeAiExternalEndpointRequest = async (
  endpointName: string,
  method: string,
  route: string,
  params: ExternalRequestParams = {},
  body?: Record<string, unknown> | null,
  responseFields?: string[] | null,
): Promise<ExternalRequestResult> => {
  const externalEndpoint = AiExternalEndpoints[endpointName as keyof typeof AiExternalEndpoints];

  if (!externalEndpoint) {
    return {
      success: false,
      data: JSON.stringify({ message: `Endpoint externo desconocido: ${endpointName}` }),
    };
  }

  const resolvedEndpoint = await externalEndpoint.endpointGetter();
  const { url, queryParams } = buildRequestUrl(resolvedEndpoint.endpoint, route, params);

  try {
    const response = await axios.request({
      url,
      method: method.toLowerCase(),
      headers: resolvedEndpoint.baseHeader,
      params: queryParams,
      data: body ?? resolvedEndpoint.baseBody,
      timeout: 10000,
    });

    const filteredData = filterResponseFields(response.data, responseFields);

    const hasResponseFields = !!responseFields && responseFields.length > 0;
    const originalIsEmpty = isEffectivelyEmpty(response.data);
    const filteredIsEmpty = isEffectivelyEmpty(filteredData);
    const fieldsMatched = !hasResponseFields || originalIsEmpty || !filteredIsEmpty;

    const data = truncateResponseText(
      JSON.stringify(
        externalEndpoint.filterUrlsInResponse
          ? removeObjectUrls(filteredData as Record<string, unknown> | unknown[])
          : filteredData,
      ),
      externalEndpoint.maxResponseLength,
    );

    return {
      success: true,
      status: response.status,
      data,
      fieldsMatched,
      shapeHint: fieldsMatched ? undefined : describeShape(response.data),
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        status: error.response?.status,
        data: truncateResponseText(JSON.stringify(error.response?.data ?? { message: error.message }), externalEndpoint.maxResponseLength),
      };
    }

    return {
      success: false,
      data: JSON.stringify({ message: 'Error desconocido ejecutando la petición externa.' }),
    };
  }
};
