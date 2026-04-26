import type { ContractRequest, ContractResponse } from "./types";

export async function sendContractRequest(
  baseUrl: string,
  request: ContractRequest,
): Promise<ContractResponse> {
  const url = new URL(request.path, normalizeBaseUrl(baseUrl));
  const headers = new Headers(request.headers);
  let body: string | undefined;

  if (request.body !== undefined) {
    body = JSON.stringify(request.body);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
  }

  const response = await fetch(url, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
  });

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await parseResponseBody(response),
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.length === 0) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return text;
  }

  return JSON.parse(text) as unknown;
}
