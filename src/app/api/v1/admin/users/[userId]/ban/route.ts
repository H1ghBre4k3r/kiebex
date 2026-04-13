import { jsonError, jsonOk } from "@/lib/http";
import { banUserByAdmin, logModerationAction } from "@/lib/query";
import { withApiAdmin } from "@/lib/route-handlers";

export async function POST(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const { userId } = await context.params;
    const result = await banUserByAdmin({
      targetUserId: userId,
      actingAdminId: admin.id,
    });

    if (result.outcome === "not_found") {
      return jsonError(404, "USER_NOT_FOUND", `No user found for id '${userId}'.`);
    }

    if (result.outcome === "cannot_ban_self") {
      return jsonError(409, "CANNOT_BAN_SELF", "You cannot ban your own account.");
    }

    if (result.outcome === "already_banned") {
      return jsonError(409, "ALREADY_BANNED", "This user is already banned.");
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "ban",
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
