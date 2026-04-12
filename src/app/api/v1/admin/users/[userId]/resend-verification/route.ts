import { createEmailVerificationToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { jsonError, jsonOk } from "@/lib/http";
import { withApiAdmin } from "@/lib/route-handlers";
import { buildVerificationUrl } from "@/lib/verification";

export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> },
): Promise<Response> {
  return withApiAdmin(async () => {
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
  });
}
