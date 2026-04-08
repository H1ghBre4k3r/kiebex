import { ForbiddenError, UnauthorizedError, requireAdminUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { updateUserRoleByAdmin } from "@/lib/query";
import { userRoleUpdateSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
): Promise<Response> {
  let adminId: string;

  try {
    const adminUser = await requireAdminUser();
    adminId = adminUser.id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    if (error instanceof ForbiddenError) {
      return jsonError(403, "FORBIDDEN", "Admin permissions required.");
    }

    throw error;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = userRoleUpdateSchema.safeParse(body);

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

  const { userId } = await context.params;
  const result = await updateUserRoleByAdmin({
    targetUserId: userId,
    role: parsed.data.role,
    actingAdminId: adminId,
  });

  if (result.outcome === "not_found") {
    return jsonError(404, "USER_NOT_FOUND", `No user found for id '${userId}'.`);
  }

  if (result.outcome === "cannot_demote_last_admin") {
    return jsonError(409, "LAST_ADMIN_PROTECTION", "At least one admin must remain assigned.");
  }

  return jsonOk({ user: result.user });
}
