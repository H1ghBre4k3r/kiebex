import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  getActiveDirectoryQuerySqlCaptureScope,
  isDirectoryQuerySqlCaptureEnabled,
  logCapturedDirectoryQuerySql,
} from "@/lib/directory-query-sql-capture";
import { getRequestContext } from "@/lib/request-context";

type Queryable = {
  query: (...args: unknown[]) => unknown;
  __kbiDirectorySqlCaptureWrapped?: boolean;
};

function readQueryText(arg: unknown): string {
  if (typeof arg === "string") {
    return arg;
  }

  if (typeof arg === "object" && arg !== null && "text" in arg && typeof arg.text === "string") {
    return arg.text;
  }

  return "<unknown query>";
}

function readQueryValues(firstArg: unknown, secondArg: unknown): unknown[] {
  if (Array.isArray(secondArg)) {
    return secondArg;
  }

  if (
    typeof firstArg === "object" &&
    firstArg !== null &&
    "values" in firstArg &&
    Array.isArray(firstArg.values)
  ) {
    return firstArg.values;
  }

  return [];
}

function wrapQueryableForDirectorySqlCapture(queryable: Queryable): void {
  if (queryable.__kbiDirectorySqlCaptureWrapped) {
    return;
  }

  const originalQuery = queryable.query.bind(queryable);

  queryable.query = (...args: unknown[]) => {
    const start = performance.now();
    const captureScope = getActiveDirectoryQuerySqlCaptureScope();
    const requestContext = getRequestContext();
    const finish = (firstArg: unknown, secondArg: unknown) => {
      if (!captureScope) {
        return;
      }

      logCapturedDirectoryQuerySql(
        {
          query: readQueryText(firstArg),
          params: JSON.stringify(readQueryValues(firstArg, secondArg)),
          duration: Math.round(performance.now() - start),
          target: "pg.query",
        },
        {
          scope: captureScope,
          requestContext,
        },
      );
    };

    const lastArg = args.at(-1);

    if (typeof lastArg === "function") {
      const wrappedArgs = [...args];
      const callbackIndex = wrappedArgs.length - 1;
      const originalCallback = wrappedArgs[callbackIndex] as (
        ...callbackArgs: unknown[]
      ) => unknown;

      wrappedArgs[callbackIndex] = (...callbackArgs: unknown[]) => {
        finish(args[0], args[1]);
        return originalCallback(...callbackArgs);
      };

      return originalQuery(...wrappedArgs);
    }

    const result = originalQuery(...args);

    if (
      result &&
      typeof result === "object" &&
      "finally" in result &&
      typeof result.finally === "function"
    ) {
      return result.finally(() => {
        finish(args[0], args[1]);
      });
    }

    finish(args[0], args[1]);
    return result;
  };

  queryable.__kbiDirectorySqlCaptureWrapped = true;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaPool: Pool | undefined;
};

const pool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

const shouldCaptureDirectorySql = isDirectoryQuerySqlCaptureEnabled();

if (shouldCaptureDirectorySql) {
  const poolWithCapture = pool as Pool & {
    __kbiDirectoryConnectWrapped?: boolean;
    connect: Pool["connect"];
  };

  wrapQueryableForDirectorySqlCapture(pool as unknown as Queryable);

  if (!poolWithCapture.__kbiDirectoryConnectWrapped) {
    const originalConnect = pool.connect.bind(pool);

    pool.connect = ((...args: unknown[]) => {
      const maybeCallback = args[0];

      if (typeof maybeCallback === "function") {
        return originalConnect((error, client, done) => {
          if (client) {
            wrapQueryableForDirectorySqlCapture(client as unknown as Queryable);
          }

          maybeCallback(error, client, done);
        });
      }

      return originalConnect().then((client) => {
        wrapQueryableForDirectorySqlCapture(client as unknown as Queryable);
        return client;
      });
    }) as unknown as Pool["connect"];

    poolWithCapture.__kbiDirectoryConnectWrapped = true;
  }
}

const adapter = new PrismaPg(pool);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaPool = pool;
}
