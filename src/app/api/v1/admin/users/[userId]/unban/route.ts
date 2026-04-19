import { jsonError, jsonOk } from "@/lib/http";
import { unbanUserByAdmin, logModerationAction } from "@/lib/query";
import { withApiAdmin, withMetrics } from "@/lib/route-handlers";

async function postHandler(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const { userId } = await context.params;
    const result = await unbanUserByAdmin({ targetUserId: userId });

    if (result.outcome === "not_found") {
      return jsonError(404, "USER_NOT_FOUND", `No user found for id '${userId}'.`);
    }

    if (result.outcome === "not_banned") {
      return jsonError(409, "NOT_BANNED", "This user is not currently banned.");
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "unban",
      contentType: "user",
      contentId: userId,
      details: {
        email: result.user.email,
        displayName: result.user.displayName,
      },
    });

    return jsonOk({ user: result.user });
  });
}

export const POST = withMetrics("POST", "/api/v1/admin/users/:id/unban", postHandler);
