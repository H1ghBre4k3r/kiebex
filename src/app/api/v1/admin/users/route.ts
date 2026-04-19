import { jsonOk } from "@/lib/http";
import { getUsersForAdmin } from "@/lib/query";
import { withApiAdmin, withMetrics } from "@/lib/route-handlers";

async function getHandler(): Promise<Response> {
  return withApiAdmin(async () => {
    const users = await getUsersForAdmin();
    return jsonOk({ users });
  });
}

export const GET = withMetrics("GET", "/api/v1/admin/users", getHandler);
