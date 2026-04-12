import { createEmailVerificationToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { jsonOk } from "@/lib/http";
import { parseJsonBody } from "@/lib/route-handlers";
import { buildVerificationUrl } from "@/lib/verification";
import { resendVerificationBodySchema } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, resendVerificationBodySchema);

  if (!parsed.ok) {
    return parsed.response;
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
