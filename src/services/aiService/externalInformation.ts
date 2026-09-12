import logger from '../../utils/logger';

import {
  AI_EXTERNAL_CONTEXT_DETAIL_ENDPOINT,
  AI_EXTERNAL_CONTEXT_ENDPOINTS_LIST,
  AI_EXTERNAL_CONTEXT_FONT,
  AI_EXTERNAL_CONTEXT_REQUEST_RESULT,
  AI_EXTERNAL_CATALOG_MAX_CHARS,
  AI_EXTERNAL_RESPONSE_MAX_CHARS,
  AiExternalContextType,
  getAiExternalEndpointErrorMessage,
  getAiExternalMissingRequestMessage,
  getAiExternalRequiredDataMessage,
  getAiExternalRequestRetryMessage,
  getAiResponseFieldsMismatchMessage,
  getAiUnknownExternalActionMessage,
} from './aiConfig';
import {
  getAiExternalEndpointDetail,
  getAiExternalEndpointDocumentation,
  getMissingAiExternalRequestData,
} from './aiExternalEndpointDocumentation';
import { executeAiExternalEndpointRequest } from './aiExternalEndpointRequest';
import {
  AiExternalInformationRequest,
  AiExternalResolution,
} from './types';

const normalizeContextKey = (value: string): string => value
  .toUpperCase()
  .replace(/[{}]/g, '')
  .replace(/[^A-Z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const limitContext = (content: string, maxCharacters: number): string => (
  content.length > maxCharacters
    ? `${content.slice(0, maxCharacters)}\n[CONTEXTO RECORTADO PARA AHORRAR TOKENS]`
    : content
);

const getExternalContextTag = (
  font: string,
  type: AiExternalContextType,
  route?: string,
): string => {
  const template = type === 'ENDPOINTS_LIST'
    ? AI_EXTERNAL_CONTEXT_ENDPOINTS_LIST
    : type === 'DETAIL_ENDPOINT'
      ? AI_EXTERNAL_CONTEXT_DETAIL_ENDPOINT
      : AI_EXTERNAL_CONTEXT_REQUEST_RESULT;
  const tag = template.replace(AI_EXTERNAL_CONTEXT_FONT, normalizeContextKey(font));
  const routeKey = route ? normalizeContextKey(route) : '';

  return routeKey && type !== 'ENDPOINTS_LIST'
    ? tag.replace(`_${type}`, `_${routeKey}_${type}`)
    : tag;
};

const formatExternalContext = (
  font: string,
  type: AiExternalContextType,
  content: string,
  route?: string,
): string => {
  const tag = getExternalContextTag(font, type, route);
  return [tag, content, tag.replace(/^\[/, '[/')].join('\n');
};

const noData = (): AiExternalResolution => ({
  success: true,
  hasData: false,
  retryable: false,
  output: '',
});

const invalidRequest = (action: string): AiExternalResolution => ({
  success: false,
  hasData: false,
  retryable: false,
  output: getAiExternalMissingRequestMessage(action),
});

const sanitizeResponseFields = (fields: string[] | null | undefined): string[] | undefined => (
  Array.isArray(fields)
    ? fields.filter((field): field is string => typeof field === 'string' && field.trim().length > 0)
    : undefined
);

export const resolveExternalInformationRequest = async (
  request: AiExternalInformationRequest,
): Promise<AiExternalResolution> => {
  try {
    if (request.action === 'list_endpoints') {
      const documentation = await getAiExternalEndpointDocumentation(request.font);
      if (!documentation.trim()) return noData();

      return {
        success: true,
        hasData: true,
        retryable: false,
        output: formatExternalContext(
          request.font,
          'ENDPOINTS_LIST',
          limitContext(documentation, AI_EXTERNAL_CATALOG_MAX_CHARS),
        ),
      };
    }

    if (request.action === 'get_endpoint_detail') {
      if (!request.method || !request.route) return invalidRequest(request.action);
      const detail = await getAiExternalEndpointDetail(request.font, request.method, request.route);
      if (!detail.trim()) return noData();

      return {
        success: true,
        hasData: true,
        retryable: false,
        output: formatExternalContext(request.font, 'DETAIL_ENDPOINT', detail, request.route),
      };
    }

    if (request.action === 'execute_request') {
      if (!request.method || !request.route) return invalidRequest(request.action);
      const responseFields = sanitizeResponseFields(request.responseFields);
      const documentation = await getAiExternalEndpointDetail(
        request.font,
        request.method,
        request.route,
      );
      const missingData = getMissingAiExternalRequestData(
        documentation,
        request.params || {},
        request.body,
        request.route,
      );

      if (missingData.length > 0) {
        return {
          success: false,
          hasData: false,
          retryable: true,
          output: getAiExternalRequiredDataMessage(missingData),
        };
      }

      const result = await executeAiExternalEndpointRequest(
        request.font,
        request.method,
        request.route,
        request.params || {},
        request.body,
        responseFields,
      );

      if (!result.success) {
        logger.warn(`External endpoint request failed: ${request.font} ${request.method} ${request.route}`);
        return {
          success: false,
          hasData: false,
          retryable: false,
          output: getAiExternalEndpointErrorMessage(request.font),
        };
      }

      if (result.fieldsMatched === false) {
        logger.warn(`AI responseFields did not match real response shape: ${JSON.stringify(responseFields)}`);
        return {
          success: false,
          hasData: false,
          retryable: true,
          output: getAiResponseFieldsMismatchMessage(result.shapeHint),
        };
      }

      if (!result.data.trim() || result.data === 'null' || result.data === '{}' || result.data === '[]') {
        return noData();
      }

      return {
        success: true,
        hasData: true,
        retryable: false,
        output: formatExternalContext(
          request.font,
          'REQUEST_RESULT',
          limitContext(result.data, AI_EXTERNAL_RESPONSE_MAX_CHARS),
          request.route,
        ),
      };
    }

    return {
      success: false,
      hasData: false,
      retryable: false,
      output: getAiUnknownExternalActionMessage(request.action),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    logger.error(`Error resolving external information request: ${message}`);

    return {
      success: false,
      hasData: false,
      retryable: true,
      output: getAiExternalRequestRetryMessage(message),
    };
  }
};
