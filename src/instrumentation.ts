import type { Instrumentation } from "next";
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      enableLogs: true,
    });
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { logger } = await import("@/lib/logger");

  const isError = error instanceof Error;

  logger.error("Unhandled server error", {
    digest: isError ? (error as Error & { digest?: string }).digest : undefined,
    message: isError ? error.message : String(error),
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  });

  Sentry.captureRequestError(error, request, context);
};
