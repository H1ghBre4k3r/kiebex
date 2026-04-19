import { clearCurrentSession } from "@/lib/auth";
import { jsonOk } from "@/lib/http";
import { withMetrics } from "@/lib/route-handlers";

async function logoutHandler(): Promise<Response> {
  await clearCurrentSession();

  return jsonOk({
    message: "Logged out successfully.",
  });
}

export const POST = withMetrics("POST", "/api/v1/auth/logout", logoutHandler);
