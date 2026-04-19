import { createEmailVerificationToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { jsonError, jsonOk } from "@/lib/http";
import { parseJsonBody, withMetrics } from "@/lib/route-handlers";
import { buildVerificationUrl } from "@/lib/verification";
import { resendVerificationBodySchema } from "@/lib/validation";

async function resendVerificationHandler(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, resendVerificationBodySchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const email = parsed.data.email.trim().toLowerCase();

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, emailVerified: true },
  });

  if (user && !user.emailVerified) {
    const token = await createEmailVerificationToken(user.id);

    let verificationUrl: string;

    try {
      verificationUrl = buildVerificationUrl(request, token);
    } catch {
      return jsonError(
        500,
        "CONFIGURATION_ERROR",
        "Server configuration error. Please contact support.",
      );
    }

    await sendVerificationEmail(user.email, verificationUrl);
  }

  return jsonOk({
    message:
      "If that address is registered and unverified, a new verification email has been sent.",
  });
}

export const POST = withMetrics(
  "POST",
  "/api/v1/auth/resend-verification",
  resendVerificationHandler,
);
