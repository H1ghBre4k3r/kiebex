import { jsonOk } from "@/lib/http";
import { withApiAuth } from "@/lib/route-handlers";

export async function GET(): Promise<Response> {
  return withApiAuth(async (user) => {
    return jsonOk({ user });
  });
}
