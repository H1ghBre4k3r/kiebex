import { requestEmailChange } from "@/lib/auth";
import { sendEmailChangeVerificationEmail } from "@/lib/email";
import { jsonError, jsonOk } from "@/lib/http";
import { parseJsonBody, withApiAuth } from "@/lib/route-handlers";
import { buildVerificationUrl } from "@/lib/verification";
import { changeEmailBodySchema } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  return withApiAuth(async (user) => {
    const parsed = await parseJsonBody(request, changeEmailBodySchema);

    if (!parsed.ok) {
      return parsed.response;
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
  });
}
