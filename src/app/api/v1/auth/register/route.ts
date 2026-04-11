import { createEmailVerificationToken, registerUser } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { jsonError, jsonOk } from "@/lib/http";
import { registerBodySchema } from "@/lib/validation";

function buildVerificationUrl(request: Request, token: string): string {
  const appUrl = process.env.APP_URL ?? new URL(request.url).origin;
  return `${appUrl}/api/v1/auth/verify-email?token=${token}`;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = registerBodySchema.safeParse(body);

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

  const result = await registerUser(parsed.data);

  if (!result.ok) {
    return jsonError(409, "EMAIL_IN_USE", "An account with this email already exists.");
  }

  const token = await createEmailVerificationToken(result.user.id);
  const verificationUrl = buildVerificationUrl(request, token);

  await sendVerificationEmail(result.user.email, verificationUrl);

  return jsonOk(
    {
      message: "Account created. Please check your email to verify your address.",
    },
    { status: 201 },
  );
}
