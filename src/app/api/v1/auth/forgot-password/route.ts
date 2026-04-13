import { requestPasswordReset } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { jsonOk } from "@/lib/http";
import { parseJsonBody } from "@/lib/route-handlers";
import { buildPasswordResetUrl } from "@/lib/verification";
import { forgotPasswordBodySchema } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, forgotPasswordBodySchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const result = await requestPasswordReset(parsed.data.email);

  // Always return the same response to prevent email enumeration.
  if (result.ok) {
    const resetUrl = buildPasswordResetUrl(request, result.token);

    // Fire-and-forget: do not let email errors surface to the client.
    sendPasswordResetEmail(parsed.data.email, resetUrl).catch(() => {});
  }

  return jsonOk({ sent: true });
}
