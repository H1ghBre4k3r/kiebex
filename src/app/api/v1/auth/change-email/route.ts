import { requestEmailChange, requireAuthUser } from "@/lib/auth";
import { sendEmailChangeVerificationEmail } from "@/lib/email";
import { jsonError, jsonOk } from "@/lib/http";
import { changeEmailBodySchema } from "@/lib/validation";

function buildVerificationUrl(request: Request, token: string): string {
  const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
  return `${appUrl}/api/v1/auth/verify-email?token=${token}`;
}

export async function POST(request: Request): Promise<Response> {
  let user;

  try {
    user = await requireAuthUser();
  } catch {
    return jsonError(401, "UNAUTHORIZED", "Authentication required.");
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = changeEmailBodySchema.safeParse(body);

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

  const result = await requestEmailChange(
    user.id,
    parsed.data.newEmail,
    parsed.data.currentPassword,
  );

  if (!result.ok) {
    if (result.code === "WRONG_PASSWORD") {
      return jsonError(400, "WRONG_PASSWORD", "Current password is incorrect.");
    }

    if (result.code === "SAME_EMAIL") {
      return jsonError(400, "SAME_EMAIL", "The new email address matches your current one.");
    }

    if (result.code === "EMAIL_TAKEN") {
      return jsonError(
        409,
        "EMAIL_TAKEN",
        "That email address is already in use by another account.",
      );
    }
  }

  if (!result.ok) {
    return jsonError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }

  const verificationUrl = buildVerificationUrl(request, result.token);
  await sendEmailChangeVerificationEmail(parsed.data.newEmail, verificationUrl);

  return jsonOk({ message: "Verification email sent to your new address." });
}
