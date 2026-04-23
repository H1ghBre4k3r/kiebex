import { AsyncLocalStorage } from "node:async_hooks";
import { logger } from "@/lib/logger";
import { getRequestContext } from "@/lib/request-context";

export type DirectoryQuerySqlScope = "offers_count" | "offers_page" | "approved_offer_sizes";

type DirectoryQuerySqlCaptureContext = {
  scope: DirectoryQuerySqlScope;
};

type RequestContext = ReturnType<typeof getRequestContext>;

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

export function getActiveDirectoryQuerySqlCaptureScope(): DirectoryQuerySqlScope | null {
  if (!isDirectoryQuerySqlCaptureEnabled()) {
    return null;
  }

  return directoryQuerySqlCaptureStorage.getStore()?.scope ?? null;
}

export function logCapturedDirectoryQuerySql(
  event: PrismaQueryEvent,
  options?: {
    scope?: DirectoryQuerySqlScope | null;
    requestContext?: RequestContext;
  },
): void {
  if (!isDirectoryQuerySqlCaptureEnabled()) {
    return;
  }

  const scope = options?.scope ?? directoryQuerySqlCaptureStorage.getStore()?.scope ?? null;
  if (!scope) {
    return;
  }

  const requestContext = options?.requestContext ?? getRequestContext();
  logger.info("directory_query.sql", {
    scope,
    query: event.query,
    params: event.params,
    durationMs: event.duration,
    target: event.target,
    requestId: requestContext?.requestId,
    userId: requestContext?.userId,
  });
}
