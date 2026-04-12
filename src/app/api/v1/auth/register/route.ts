import { createEmailVerificationToken, registerUser } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { jsonError, jsonOk } from "@/lib/http";
import { parseJsonBody } from "@/lib/route-handlers";
import { buildVerificationUrl } from "@/lib/verification";
import { registerBodySchema } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, registerBodySchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const result = await registerUser(parsed.data);

  if (!result.ok) {
    return jsonError(409, "EMAIL_IN_USE", "An account with this email already exists.");
  }

  const token = await createEmailVerificationToken(result.user.id);

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

  await sendVerificationEmail(result.user.email, verificationUrl);

  return jsonOk(
    {
      message: "Account created. Please check your email to verify your address.",
    },
    { status: 201 },
  );
}
