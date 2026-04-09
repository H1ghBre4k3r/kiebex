import {
  ForbiddenError,
  UnauthorizedError,
  requireAuthUser,
  updateDisplayName,
  updatePassword,
} from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { updateProfileBodySchema } from "@/lib/validation";

export async function GET(): Promise<Response> {
  try {
    const user = await requireAuthUser();
    return jsonOk({ user });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    throw error;
  }
}

export async function PATCH(request: Request): Promise<Response> {
  let userId: string;

  try {
    const user = await requireAuthUser();
    userId = user.id;
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    throw error;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = updateProfileBodySchema.safeParse(body);

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

  const { displayName, currentPassword, newPassword } = parsed.data;

  let updatedUser = await requireAuthUser();

  if (displayName) {
    updatedUser = await updateDisplayName(userId, displayName);
  }

  if (newPassword && currentPassword) {
    const result = await updatePassword(userId, currentPassword, newPassword);

    if (!result.ok) {
      return jsonError(400, "WRONG_PASSWORD", "Current password is incorrect.");
    }
  }

  return jsonOk({ user: updatedUser });
}
