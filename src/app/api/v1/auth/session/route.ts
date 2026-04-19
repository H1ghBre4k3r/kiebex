import { getCurrentAuthUser } from "@/lib/auth";
import { jsonOk } from "@/lib/http";
import { withMetrics } from "@/lib/route-handlers";

async function getSession(): Promise<Response> {
  const user = await getCurrentAuthUser();

  return jsonOk({
    authenticated: Boolean(user),
    user,
  });
}

export const GET = withMetrics("GET", "/api/v1/auth/session", getSession);
