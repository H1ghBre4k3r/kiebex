import { jsonOk } from "@/lib/http";
import { getModerationAuditLog } from "@/lib/query";
import { withApiModerator, withMetrics } from "@/lib/route-handlers";

async function getHandler(): Promise<Response> {
  return withApiModerator(async () => {
    const entries = await getModerationAuditLog(200);

    return jsonOk({ entries });
  });
}

export const GET = withMetrics("GET", "/api/v1/moderation/audit-log", getHandler);
