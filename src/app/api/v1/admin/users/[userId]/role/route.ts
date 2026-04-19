import { jsonError, jsonOk } from "@/lib/http";
import { updateUserRoleByAdmin } from "@/lib/query";
import { parseJsonBody, withApiAdmin, withMetrics } from "@/lib/route-handlers";
import { userRoleUpdateSchema } from "@/lib/validation";

async function patchHandler(
  request: Request,
  context: { params: Promise<{ userId: string }> },
): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const parsed = await parseJsonBody(request, userRoleUpdateSchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const { userId } = await context.params;
    const result = await updateUserRoleByAdmin({
      targetUserId: userId,
      role: parsed.data.role,
      actingAdminId: admin.id,
    });

    if (result.outcome === "not_found") {
      return jsonError(404, "USER_NOT_FOUND", `No user found for id '${userId}'.`);
    }

    if (result.outcome === "cannot_demote_last_admin") {
      return jsonError(409, "LAST_ADMIN_PROTECTION", "At least one admin must remain assigned.");
    }

    return jsonOk({ user: result.user });
  });
}

export const PATCH = withMetrics("PATCH", "/api/v1/admin/users/:id/role", patchHandler);
