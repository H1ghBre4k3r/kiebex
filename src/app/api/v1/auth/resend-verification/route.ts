import { createEmailVerificationToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { jsonError, jsonOk } from "@/lib/http";
import { resendVerificationBodySchema } from "@/lib/validation";

function buildVerificationUrl(request: Request, token: string): string {
  const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
  return `${appUrl}/verify-email?token=${token}`;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = resendVerificationBodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      400,
      "INVALID_BODY",
      "One or more fields are invalid.",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const email = parsed.data.email.trim().toLowerCase();

  // Always return 200 to avoid leaking whether the email address is registered.
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, emailVerified: true },
  });

  if (user && !user.emailVerified) {
    const token = await createEmailVerificationToken(user.id);
    const verificationUrl = buildVerificationUrl(request, token);
    await sendVerificationEmail(user.email, verificationUrl);
  }

  return jsonOk({
    message:
      "If that address is registered and unverified, a new verification email has been sent.",
  });
}
