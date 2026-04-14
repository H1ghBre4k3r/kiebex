import { jsonOk } from "@/lib/http";
import { withApiModerator } from "@/lib/route-handlers";
import { getOpenReports } from "@/lib/query";

export async function GET(): Promise<Response> {
  return withApiModerator(async () => {
    const reports = await getOpenReports();
    return jsonOk({ reports });
  });
}
