type JsonRecord = Record<string, unknown>;

type AiTabularValue = {
  __ai_format: 'table';
  columns: string[];
  rows: unknown[][];
};

const isRecord = (value: unknown): value is JsonRecord => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const isTabularCandidate = (value: unknown[]): value is JsonRecord[] => (
  value.length > 1
  && value.every(isRecord)
  && value.every((item) => !('__ai_format' in item))
);

const toTabularValue = (items: JsonRecord[]): AiTabularValue => {
  const columns = [...new Set(items.flatMap((item) => Object.keys(item)))];

  return {
    __ai_format: 'table',
    columns,
    rows: items.map((item) => columns.map((column) => item[column] ?? null)),
  };
};

const processValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const processedItems = value.map(processValue);

    if (!isTabularCandidate(processedItems)) return processedItems;

    const tabularValue = toTabularValue(processedItems);
    return JSON.stringify(tabularValue).length < JSON.stringify(processedItems).length
      ? tabularValue
      : processedItems;
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, processValue(child)]),
    );
  }

  return value;
};

export const processAiExternalResponse = (value: unknown): unknown => processValue(value);
