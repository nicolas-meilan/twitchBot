type JsonRecord = Record<string, unknown>;

type AiTabularValue = {
  __ai_format: 'table';
  columns: string[];
  rows: unknown[][];
};

const isRecord = (value: unknown): value is JsonRecord => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const isEmptyValue = (value: unknown): boolean => (
  value === null
  || value === undefined
  || value === ''
  || (Array.isArray(value) && value.length === 0)
  || (isRecord(value) && Object.keys(value).length === 0)
);

const isTabularCandidate = (value: unknown[]): value is JsonRecord[] => (
  value.length > 1
  && value.every(isRecord)
  && value.every((item) => !('__ai_format' in item))
);

const flattenRecord = (record: JsonRecord): JsonRecord => {
  const flattened: JsonRecord = {};

  const addValue = (value: unknown, path: string): void => {
    if (isEmptyValue(value)) return;

    if (isRecord(value) && !('__ai_format' in value)) {
      Object.entries(value).forEach(([key, child]) => {
        addValue(child, path ? `${path}.${key}` : key);
      });
      return;
    }

    flattened[path] = value;
  };

  Object.entries(record).forEach(([key, value]) => addValue(value, key));
  return flattened;
};

const toTabularValue = (items: JsonRecord[]): AiTabularValue => {
  const flattenedItems = items.map(flattenRecord);
  const columns = [...new Set(flattenedItems.flatMap((item) => Object.keys(item)))];

  return {
    __ai_format: 'table',
    columns,
    rows: flattenedItems.map((item) => columns.map((column) => item[column] ?? null)),
  };
};

const processValue = (value: unknown): unknown => (
  Array.isArray(value)
    ? processArray(value)
    : isRecord(value)
      ? processRecord(value)
      : value
);

const processArray = (items: unknown[]): unknown[] | AiTabularValue => {
  const processedItems = items
    .map(processValue)
    .filter((item) => !isEmptyValue(item));

  if (!isTabularCandidate(processedItems)) return processedItems;

  const tabularValue = toTabularValue(processedItems);
  return JSON.stringify(tabularValue).length < JSON.stringify(processedItems).length
    ? tabularValue
    : processedItems;
};

const processRecord = (record: JsonRecord): JsonRecord => Object.fromEntries(
  Object.entries(record)
    .map(([key, child]) => [key, processValue(child)] as const)
    .filter(([, child]) => !isEmptyValue(child)),
);

export const processAiExternalResponse = (value: unknown): unknown => processValue(value);
