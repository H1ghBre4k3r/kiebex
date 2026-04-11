import {
  ForbiddenError,
  UnauthorizedError,
  createEmailVerificationToken,
  requireAdminUser,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { jsonError, jsonOk } from "@/lib/http";

function buildVerificationUrl(request: Request, token: string): string {
  const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
  return `${appUrl}/api/v1/auth/verify-email?token=${token}`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> },
): Promise<Response> {
  try {
    await requireAdminUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    if (error instanceof ForbiddenError) {
      return jsonError(403, "FORBIDDEN", "Admin permissions required.");
    }

    throw error;
  }

  const { userId } = await context.params;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerified: true },
  });

  if (!user) {
    return jsonError(404, "USER_NOT_FOUND", `No user found for id '${userId}'.`);
  }

  if (user.emailVerified) {
    return jsonError(409, "ALREADY_VERIFIED", "User email is already verified.");
  }

  const token = await createEmailVerificationToken(user.id);
  const verificationUrl = buildVerificationUrl(request, token);
  await sendVerificationEmail(user.email, verificationUrl);

  return jsonOk({ message: "Verification email sent." });
}
