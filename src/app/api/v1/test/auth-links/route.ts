import { z } from "zod";
import { createEmailVerificationToken, requestPasswordReset } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { withMetrics } from "@/lib/route-handlers";
import { buildPasswordResetUrl, buildVerificationUrl } from "@/lib/verification";

const authLinkBodySchema = z.object({
  kind: z.enum(["verification", "password_reset"]),
  email: z.string().trim().email().max(255),
});

async function createAuthLinkHandler(request: Request): Promise<Response> {
  if (process.env.E2E_TEST_MODE !== "true") {
    return jsonError(404, "NOT_FOUND", "Not found.");
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_BODY", "A valid request body is required.");
  }

  const parsed = authLinkBodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "INVALID_BODY", "A valid request body is required.");
  }

  if (parsed.data.kind === "verification") {
    const user = await db.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (!user) {
      return jsonError(404, "USER_NOT_FOUND", "No user found for the supplied email address.");
    }

    const token = await createEmailVerificationToken(user.id);
    return jsonOk({ url: buildVerificationUrl(request, token) });
  }

  const result = await requestPasswordReset(parsed.data.email);

  if (!result.ok) {
    return jsonError(404, "USER_NOT_FOUND", "No user found for the supplied email address.");
  }

  return jsonOk({ url: buildPasswordResetUrl(request, result.token) });
}

export const POST = withMetrics("POST", "/api/v1/test/auth-links", createAuthLinkHandler);
