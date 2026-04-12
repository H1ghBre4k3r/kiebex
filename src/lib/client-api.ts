export type ApiErrorBody = {
  status?: "error";
  error?: {
    code?: string;
    message?: string;
  };
};

export type ApiSuccessBody<T> = {
  status?: "ok";
  data?: T;
};

export type ApiRequestResult<T> =
  | {
      ok: true;
      data: T | null;
    }
  | {
      ok: false;
      code?: string;
      message: string;
    };

async function parseApiJson<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null;
}

async function getApiError(
  response: Response,
  fallbackMessage: string,
): Promise<{ code?: string; message: string }> {
  const body = await parseApiJson<ApiErrorBody>(response);

  return {
    code: body?.error?.code,
    message: body?.error?.message ?? fallbackMessage,
  };
}

export function jsonInit(
  method: string,
  options?: Omit<RequestInit, "body" | "headers" | "method"> & {
    body?: unknown;
    headers?: HeadersInit;
  },
): RequestInit {
  const headers = new Headers(options?.headers);

  if (options?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return {
    ...options,
    method,
    headers,
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  };
}

export async function requestApi<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  fallbackMessage: string,
): Promise<ApiRequestResult<T>> {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      const error = await getApiError(response, fallbackMessage);
      return {
        ok: false,
        code: error.code,
        message: error.message,
      };
    }

    const body = await parseApiJson<ApiSuccessBody<T>>(response);

    return {
      ok: true,
      data: body?.data ?? null,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[client-api] Network error:", error);
    }
    return {
      ok: false,
      message: fallbackMessage,
    };
  }
}
