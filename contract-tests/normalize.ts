import type { ContractResponse } from "./types";

export function normalizeHeaders(
  response: ContractResponse,
  headerNames: string[],
): ContractResponse {
  const headers = { ...response.headers };

  for (const headerName of headerNames) {
    delete headers[headerName.toLowerCase()];
  }

  return {
    ...response,
    headers,
  };
}

export function replaceJsonPath(value: unknown, path: string[], replacement: unknown): unknown {
  if (path.length === 0) {
    return replacement;
  }

  if (Array.isArray(value)) {
    const [segment, ...rest] = path;
    const index = Number(segment);

    return value.map((item, itemIndex) =>
      itemIndex === index ? replaceJsonPath(item, rest, replacement) : item,
    );
  }

  if (value !== null && typeof value === "object") {
    const [segment, ...rest] = path;
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        key === segment ? replaceJsonPath(entryValue, rest, replacement) : entryValue,
      ]),
    );
  }

  return value;
}
