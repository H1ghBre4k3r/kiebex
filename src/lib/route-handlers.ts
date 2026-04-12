import "server-only";

import { z } from "zod";
import {
  ForbiddenError,
  UnauthorizedError,
  requireAdminUser,
  requireAuthUser,
  requireModeratorUser,
} from "@/lib/auth";
import { jsonError } from "@/lib/http";
import type { AuthUser } from "@/lib/types";

type ProtectedHandler = (user: AuthUser) => Promise<Response>;

type ParsedJsonBody<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      response: Response;
    };

function toErrorDetails(error: z.ZodError): { path?: string; message: string }[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : undefined,
    message: issue.message,
  }));
}

export function jsonValidationError(
  error: z.ZodError,
  code = "INVALID_BODY",
  message = "One or more fields are invalid.",
  statusCode = 400,
): Response {
  return jsonError(statusCode, code, message, toErrorDetails(error));
}

export function jsonQueryValidationError(error: z.ZodError): Response {
  return jsonValidationError(error, "INVALID_QUERY", "One or more query parameters are invalid.");
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
  options?: {
    invalidJsonCode?: string;
    invalidJsonMessage?: string;
    invalidBodyCode?: string;
    invalidBodyMessage?: string;
  },
): Promise<ParsedJsonBody<z.infer<TSchema>>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: jsonError(
        400,
        options?.invalidJsonCode ?? "INVALID_JSON",
        options?.invalidJsonMessage ?? "Request body must be valid JSON.",
      ),
    };
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      ok: false,
      response: jsonValidationError(
        parsed.error,
        options?.invalidBodyCode,
        options?.invalidBodyMessage,
      ),
    };
  }

  return {
    ok: true,
    data: parsed.data,
  };
}

function createProtectedRoute(
  loader: () => Promise<AuthUser>,
  forbiddenMessage?: string,
): (handler: ProtectedHandler) => Promise<Response> {
  return async (handler) => {
    try {
      const user = await loader();
      return handler(user);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return jsonError(401, "UNAUTHORIZED", "Authentication required.");
      }

      if (error instanceof ForbiddenError) {
        return jsonError(403, "FORBIDDEN", forbiddenMessage ?? "Insufficient permissions.");
      }

      throw error;
    }
  };
}

export const withApiAuth = createProtectedRoute(requireAuthUser);
export const withApiModerator = createProtectedRoute(
  requireModeratorUser,
  "Moderator permissions required.",
);
export const withApiAdmin = createProtectedRoute(requireAdminUser, "Admin permissions required.");
