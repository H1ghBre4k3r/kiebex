import { jsonOk } from "@/lib/http";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withMetrics } from "@/lib/route-handlers";

type CheckStatus = "ok" | "error";

async function healthHandler(): Promise<Response> {
  const timestamp = new Date().toISOString();

  let database: CheckStatus = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    database = "error";
    logger.error("Health check: database unreachable", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const healthy = database === "ok";

  return jsonOk(
    {
      service: "kiebex",
      status: healthy ? "healthy" : "degraded",
      checks: { database },
      timestamp,
    },
    { status: healthy ? 200 : 503 },
  );
}

export const GET = withMetrics("GET", "/api/v1/health", healthHandler);
