import { createSession, verifyEmailToken } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { z } from "zod";

const verifyEmailBodySchema = z.object({
  token: z.string().min(1).max(128),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = verifyEmailBodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "INVALID_TOKEN", "A valid token is required.");
  }

  const result = await verifyEmailToken(parsed.data.token);

  if (!result) {
    return jsonError(
      400,
      "INVALID_OR_EXPIRED_TOKEN",
      "Verification link is invalid or has expired.",
    );
  }

  await createSession(result.userId);

  return jsonOk({ message: "Email verified. You are now signed in." });
}
