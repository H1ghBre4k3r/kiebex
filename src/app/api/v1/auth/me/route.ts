import { jsonOk } from "@/lib/http";
import { withApiAuth, withMetrics } from "@/lib/route-handlers";

async function getMe(): Promise<Response> {
  return withApiAuth(async (user) => {
    return jsonOk({ user });
  });
}

export const GET = withMetrics("GET", "/api/v1/auth/me", getMe);
