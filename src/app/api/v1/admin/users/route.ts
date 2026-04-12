import { jsonOk } from "@/lib/http";
import { getUsersForAdmin } from "@/lib/query";
import { withApiAdmin } from "@/lib/route-handlers";

export async function GET(): Promise<Response> {
  return withApiAdmin(async () => {
    const users = await getUsersForAdmin();
    return jsonOk({ users });
  });
}
