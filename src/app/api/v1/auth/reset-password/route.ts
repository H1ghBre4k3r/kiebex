import { resetPassword } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { parseJsonBody, withMetrics } from "@/lib/route-handlers";
import { resetPasswordBodySchema } from "@/lib/validation";

async function resetPasswordHandler(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, resetPasswordBodySchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const result = await resetPassword(parsed.data.token, parsed.data.password);

  if (!result.ok) {
    if (result.reason === "expired") {
      return jsonError(
        400,
        "TOKEN_EXPIRED",
        "This password reset link has expired. Please request a new one.",
      );
    }

    return jsonError(400, "TOKEN_INVALID", "This password reset link is invalid or already used.");
  }

  return jsonOk({ reset: true });
}

export const POST = withMetrics("POST", "/api/v1/auth/reset-password", resetPasswordHandler);
