import { jsonError, jsonOk } from "@/lib/http";
import { deleteUserByAdmin, logModerationAction } from "@/lib/query";
import { withApiAdmin, withMetrics } from "@/lib/route-handlers";

async function deleteHandler(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const { userId } = await context.params;
    const result = await deleteUserByAdmin({
      targetUserId: userId,
      actingAdminId: admin.id,
    });

    if (result.outcome === "not_found") {
      return jsonError(404, "USER_NOT_FOUND", `No user found for id '${userId}'.`);
    }

    if (result.outcome === "cannot_delete_self") {
      return jsonError(409, "CANNOT_DELETE_SELF", "You cannot delete your own account.");
    }

    if (result.outcome === "cannot_delete_last_admin") {
      return jsonError(
        409,
        "LAST_ADMIN_PROTECTION",
        "Cannot delete the last admin account. Assign another admin first.",
      );
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "delete",
      contentType: "user",
      contentId: userId,
      details: {
        email: result.email,
        displayName: result.displayName,
      },
    });

    return jsonOk({ deleted: true });
  });
}

export const DELETE = withMetrics("DELETE", "/api/v1/admin/users/:id", deleteHandler);
