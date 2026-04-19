import { requestPasswordReset } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { jsonOk } from "@/lib/http";
import { parseJsonBody, withMetrics } from "@/lib/route-handlers";
import { buildPasswordResetUrl } from "@/lib/verification";
import { forgotPasswordBodySchema } from "@/lib/validation";

async function forgotPasswordHandler(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, forgotPasswordBodySchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const result = await requestPasswordReset(parsed.data.email);

  if (result.ok) {
    const resetUrl = buildPasswordResetUrl(request, result.token);

    sendPasswordResetEmail(parsed.data.email, resetUrl).catch(() => {});
  }

  return jsonOk({ sent: true });
}

export const POST = withMetrics("POST", "/api/v1/auth/forgot-password", forgotPasswordHandler);
