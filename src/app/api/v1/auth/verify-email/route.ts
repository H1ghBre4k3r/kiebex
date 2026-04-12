import { createSession, verifyEmailToken } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseJsonBody } from "@/lib/route-handlers";

const verifyEmailBodySchema = z.object({
  token: z.string().min(1).max(128),
});

/**
 * GET /api/v1/auth/verify-email?token=...
 *
 * Used by email verification links. Verifies the token, creates a session
 * (sets the cookie), and redirects. Cookie writes are only permitted in
 * Route Handlers and Server Actions, not in Server Component renders.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";

  const result = token ? await verifyEmailToken(token) : null;

  if (!result?.ok) {
    const reason = result?.reason ?? "invalid";
    redirect(`/verify-email?error=${reason}`);
  }

  await createSession(result.userId);
  redirect("/");
}

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, verifyEmailBodySchema, {
    invalidBodyCode: "INVALID_TOKEN",
    invalidBodyMessage: "A valid token is required.",
  });

  if (!parsed.ok) {
    return parsed.response;
  }

  const result = await verifyEmailToken(parsed.data.token);

  if (!result.ok) {
    if (result.reason === "email_conflict") {
      return jsonError(
        409,
        "EMAIL_CONFLICT",
        "The email address has already been taken by another account.",
      );
    }

    return jsonError(
      400,
      "INVALID_OR_EXPIRED_TOKEN",
      "Verification link is invalid or has expired.",
    );
  }

  await createSession(result.userId);

  return jsonOk({ message: "Email verified. You are now signed in." });
}
