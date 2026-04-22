import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { withMetrics } from "@/lib/route-handlers";
import { getLatestCapturedTestEmail } from "@/lib/test-email";

const authLinkBodySchema = z.object({
  kind: z.enum(["verification", "change_email_verification", "password_reset"]),
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

  const email = getLatestCapturedTestEmail({
    kind: parsed.data.kind,
    to: parsed.data.email,
  });

  if (!email) {
    return jsonError(404, "AUTH_EMAIL_NOT_FOUND", "No captured auth email found.");
  }

  return jsonOk({
    url: email.actionUrl,
    email: {
      kind: email.kind,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
      createdAt: email.createdAt.toISOString(),
    },
  });
}

export const POST = withMetrics("POST", "/api/v1/test/auth-links", createAuthLinkHandler);
