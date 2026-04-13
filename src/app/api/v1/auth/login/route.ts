import { authenticateUser, createSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { parseJsonBody } from "@/lib/route-handlers";
import { loginBodySchema } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJsonBody(request, loginBodySchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const result = await authenticateUser(parsed.data);

  if (!result.ok) {
    if (result.reason === "EMAIL_NOT_VERIFIED") {
      return jsonError(
        403,
        "EMAIL_NOT_VERIFIED",
        "Please verify your email address before signing in.",
      );
    }

    if (result.reason === "ACCOUNT_BANNED") {
      return jsonError(403, "ACCOUNT_BANNED", "This account has been suspended.");
    }

    return jsonError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  await createSession(result.user.id);

  return jsonOk({ user: result.user });
}
