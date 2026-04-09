import { ForbiddenError, UnauthorizedError, requireModeratorUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getModerationAuditLog } from "@/lib/query";

export async function GET(): Promise<Response> {
  try {
    await requireModeratorUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    if (error instanceof ForbiddenError) {
      return jsonError(403, "FORBIDDEN", "Moderator permissions required.");
    }

    throw error;
  }

  const entries = await getModerationAuditLog(200);

  return jsonOk({ entries });
}
