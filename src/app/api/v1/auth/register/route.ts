import { createSession, registerUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { registerBodySchema } from "@/lib/validation";

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

  await createSession(result.user.id);

  return jsonOk(
    {
      user: result.user,
    },
    { status: 201 },
  );
}
