type ErrorDetail = {
  path?: string;
  message: string;
};

export type ApiSuccess<T> = {
  status: "ok";
  data: T;
};

export type ApiError = {
  status: "error";
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
};

export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json(
    {
      status: "ok",
      data,
    } satisfies ApiSuccess<T>,
    init,
  );
}

export function jsonError(
  statusCode: number,
  code: string,
  message: string,
  details?: ErrorDetail[],
): Response {
  return Response.json(
    {
      status: "error",
      error: {
        code,
        message,
        details,
      },
    } satisfies ApiError,
    {
      status: statusCode,
    },
  );
}
