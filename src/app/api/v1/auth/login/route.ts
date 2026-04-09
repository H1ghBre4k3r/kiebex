import { authenticateUser, createSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { loginBodySchema } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = loginBodySchema.safeParse(body);

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

  const result = await authenticateUser(parsed.data);

  if (!result.ok) {
    if (result.reason === "EMAIL_NOT_VERIFIED") {
      return jsonError(
        403,
        "EMAIL_NOT_VERIFIED",
        "Please verify your email address before signing in.",
      );
    }

    return jsonError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  await createSession(result.user.id);

  return jsonOk({ user: result.user });
}
