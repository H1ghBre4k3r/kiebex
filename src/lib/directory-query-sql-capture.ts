import { AsyncLocalStorage } from "node:async_hooks";
import { logger } from "@/lib/logger";
import { getRequestContext } from "@/lib/request-context";

type DirectoryQuerySqlScope = "offers_count" | "offers_page" | "approved_offer_sizes";

type DirectoryQuerySqlCaptureContext = {
  scope: DirectoryQuerySqlScope;
};

type PrismaQueryEvent = {
  query: string;
  params: string;
  duration: number;
  target: string;
};

const directoryQuerySqlCaptureStorage = new AsyncLocalStorage<DirectoryQuerySqlCaptureContext>();

export function isDirectoryQuerySqlCaptureEnabled(): boolean {
  return process.env.KBI_CAPTURE_DIRECTORY_SQL === "true";
}

export function withDirectoryQuerySqlCapture<T>(
  scope: DirectoryQuerySqlScope,
  work: () => Promise<T>,
): Promise<T> {
  if (!isDirectoryQuerySqlCaptureEnabled()) {
    return work();
  }

  return directoryQuerySqlCaptureStorage.run({ scope }, work);
}

export function logCapturedDirectoryQuerySql(event: PrismaQueryEvent): void {
  if (!isDirectoryQuerySqlCaptureEnabled()) {
    return;
  }

  const captureContext = directoryQuerySqlCaptureStorage.getStore();
  if (!captureContext) {
    return;
  }

  const requestContext = getRequestContext();
  logger.info("directory_query.sql", {
    scope: captureContext.scope,
    query: event.query,
    params: event.params,
    durationMs: event.duration,
    target: event.target,
    requestId: requestContext?.requestId,
    userId: requestContext?.userId,
  });
}
