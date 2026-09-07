import axios from 'axios';

import { AiExternalEndpoints } from './aiExternalEndpoints';

type ExternalRequestParams = Record<string, string | number | boolean>;

type ExternalRequestResult = {
  success: boolean;
  status?: number;
  data: string;
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
        return /^https?:\/\//i.test(item) ? undefined : item;
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
  const resolvedRoute = route.replace(/\{([^}]+)\}|:([a-zA-Z0-9_]+)/g, (_match, braced, colon) => {
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

    const data = truncateResponseText(JSON.stringify(externalEndpoint.filterUrlsInResponse ? removeObjectUrls(response.data) : response.data), externalEndpoint.maxResponseLength);

    return {
      success: true,
      status: response.status,
      data,
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
