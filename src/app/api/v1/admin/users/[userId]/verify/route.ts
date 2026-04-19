import { jsonError, jsonOk } from "@/lib/http";
import { verifyUserByAdmin } from "@/lib/query";
import { withApiAdmin, withMetrics } from "@/lib/route-handlers";

async function postHandler(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
): Promise<Response> {
  return withApiAdmin(async () => {
    const { userId } = await context.params;
    const result = await verifyUserByAdmin({ targetUserId: userId });

    if (result.outcome === "not_found") {
      return jsonError(404, "USER_NOT_FOUND", `No user found for id '${userId}'.`);
    }

    if (result.outcome === "already_verified") {
      return jsonError(409, "ALREADY_VERIFIED", "User email is already verified.");
    }

    return jsonOk({ user: result.user });
  });
}

export const POST = withMetrics("POST", "/api/v1/admin/users/:id/verify", postHandler);
