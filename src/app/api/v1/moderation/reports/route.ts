import { jsonOk } from "@/lib/http";
import { withApiModerator, withMetrics } from "@/lib/route-handlers";
import { getOpenReports } from "@/lib/query";

async function getHandler(): Promise<Response> {
  return withApiModerator(async () => {
    const reports = await getOpenReports();
    return jsonOk({ reports });
  });
}

export const GET = withMetrics("GET", "/api/v1/moderation/reports", getHandler);
