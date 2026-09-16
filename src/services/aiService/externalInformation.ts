import logger from '../../utils/logger';

import {
  AI_EXTERNAL_CONTEXT_DETAIL_ENDPOINT,
  AI_EXTERNAL_CONTEXT_ENDPOINTS_LIST,
  AI_EXTERNAL_CONTEXT_FONT,
  AI_EXTERNAL_CONTEXT_REQUEST_RESULT,
  AI_EXTERNAL_CONTEXT_TYPES,
  AI_MAX_RESPONSE_FIELDS,
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
  AI_EXTERNAL_ACTIONS,
  AiExternalInformationRequest,
  AiExternalResolution,
} from './types';

const normalizeContextKey = (value: string): string => value
  .toUpperCase()
  .replace(/[{}]/g, '')
  .replace(/[^A-Z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const compactDocumentation = (content: string): string => content
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{2,}/g, '\n')
  .trim();

const getExternalContextTag = (
  font: string,
  type: AiExternalContextType,
  route?: string,
): string => {
  const template = type === AI_EXTERNAL_CONTEXT_TYPES.ENDPOINTS_LIST
    ? AI_EXTERNAL_CONTEXT_ENDPOINTS_LIST
    : type === AI_EXTERNAL_CONTEXT_TYPES.DETAIL_ENDPOINT
      ? AI_EXTERNAL_CONTEXT_DETAIL_ENDPOINT
      : AI_EXTERNAL_CONTEXT_REQUEST_RESULT;
  const tag = template.replace(AI_EXTERNAL_CONTEXT_FONT, normalizeContextKey(font));
  const routeKey = route ? normalizeContextKey(route) : '';

  return routeKey && type !== AI_EXTERNAL_CONTEXT_TYPES.ENDPOINTS_LIST
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
    ? [...new Set(
      fields
        .filter((field): field is string => typeof field === 'string' && field.trim().length > 0)
        .map((field) => field.trim()),
    )].slice(0, AI_MAX_RESPONSE_FIELDS)
    : undefined
);

export const resolveExternalInformationRequest = async (
  request: AiExternalInformationRequest,
): Promise<AiExternalResolution> => {
  try {
    if (request.action === AI_EXTERNAL_ACTIONS.LIST_ENDPOINTS) {
      const documentation = await getAiExternalEndpointDocumentation(request.font);
      if (!documentation.trim()) return noData();

      return {
        success: true,
        hasData: true,
        retryable: false,
        output: formatExternalContext(
          request.font,
          AI_EXTERNAL_CONTEXT_TYPES.ENDPOINTS_LIST,
          compactDocumentation(documentation),
        ),
      };
    }

    if (request.action === AI_EXTERNAL_ACTIONS.GET_ENDPOINT_DETAIL) {
      if (!request.method || !request.route) return invalidRequest(request.action);
      const detail = await getAiExternalEndpointDetail(request.font, request.method, request.route);
      if (!detail.trim()) return noData();

      return {
        success: true,
        hasData: true,
        retryable: false,
        output: formatExternalContext(
          request.font,
          AI_EXTERNAL_CONTEXT_TYPES.DETAIL_ENDPOINT,
          compactDocumentation(detail),
          request.route,
        ),
      };
    }

    if (
      request.action === AI_EXTERNAL_ACTIONS.OBTAIN_PARAMS
      || request.action === AI_EXTERNAL_ACTIONS.EXECUTE_REQUEST
    ) {
      if (!request.method || !request.route) return invalidRequest(request.action);
      const sanitizedResponseFields = sanitizeResponseFields(request.responseFields);
      const endpointDocumentation = await getAiExternalEndpointDetail(
        request.font,
        request.method,
        request.route,
      );
      const missingRequiredFields = getMissingAiExternalRequestData(
        endpointDocumentation,
        request.params || {},
        request.body,
        request.route,
      );

      if (missingRequiredFields.length > 0) {
        return {
          success: false,
          hasData: false,
          retryable: true,
          output: getAiExternalRequiredDataMessage(missingRequiredFields),
        };
      }

      const result = await executeAiExternalEndpointRequest(
        request.font,
        request.method,
        request.route,
        request.params || {},
        request.body,
        sanitizedResponseFields,
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
        logger.warn(`AI responseFields did not match real response shape: ${JSON.stringify(sanitizedResponseFields)}`);
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
          AI_EXTERNAL_CONTEXT_TYPES.REQUEST_RESULT,
          result.data,
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
