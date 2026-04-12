import { jsonOk } from "@/lib/http";
import { getModerationAuditLog } from "@/lib/query";
import { withApiModerator } from "@/lib/route-handlers";

export async function GET(): Promise<Response> {
  return withApiModerator(async () => {
    const entries = await getModerationAuditLog(200);

    return jsonOk({ entries });
  });
}
