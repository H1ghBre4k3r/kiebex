import { createSession, verifyEmailToken } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { withMetrics } from "@/lib/route-handlers";
import { redirect } from "next/navigation";
import { z } from "zod";

const verifyEmailBodySchema = z.object({
  token: z.string().min(1).max(128),
});

async function getVerifyEmail(request: Request): Promise<Response> {
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

async function postVerifyEmail(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_TOKEN", "A valid token is required.");
  }

  const parsed = verifyEmailBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "INVALID_TOKEN", "A valid token is required.");
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

export const GET = withMetrics("GET", "/api/v1/auth/verify-email", getVerifyEmail);
export const POST = withMetrics("POST", "/api/v1/auth/verify-email", postVerifyEmail);
