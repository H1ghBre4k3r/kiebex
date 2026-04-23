import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockedLogCapturedDirectoryQuerySql = jest.fn();
const mockedGetActiveDirectoryQuerySqlCaptureScope = jest.fn<() => "offers_page" | null>();
const mockedGetRequestContext = jest.fn<() => { requestId: string; userId?: string } | undefined>();

type MockPoolInstance = {
  pool: {
    query: (...args: unknown[]) => unknown;
    connect: (...args: unknown[]) => unknown;
  };
  originalQuery: jest.Mock;
  originalConnect: jest.Mock;
};

const mockPoolInstances: MockPoolInstance[] = [];

function resetPrismaGlobals(): void {
  const globalForPrisma = globalThis as typeof globalThis & {
    prisma?: unknown;
    prismaPool?: unknown;
  };

  delete globalForPrisma.prisma;
  delete globalForPrisma.prismaPool;
}

function installDbModuleMocks(captureEnabled: boolean): void {
  jest.doMock("@/generated/prisma/client", () => ({
    PrismaClient: jest.fn().mockImplementation((...args: unknown[]) => {
      const [options] = args as [{ adapter: unknown }];

      return {
        adapter: options.adapter,
      };
    }),
  }));

  jest.doMock("@prisma/adapter-pg", () => ({
    PrismaPg: jest.fn().mockImplementation((pool: unknown) => ({
      pool,
    })),
  }));

  jest.doMock("pg", () => ({
    Pool: jest.fn().mockImplementation(() => {
      const originalQuery = jest.fn(async () => ({
        rows: [],
        rowCount: 0,
      }));
      const originalConnect = jest.fn();

      const pool = {
        query: (...args: unknown[]) => Reflect.apply(originalQuery, undefined, args),
        connect: (...args: unknown[]) => Reflect.apply(originalConnect, undefined, args),
      };

      mockPoolInstances.push({
        pool,
        originalQuery,
        originalConnect,
      });

      return pool;
    }),
  }));

  jest.doMock("@/lib/directory-query-sql-capture", () => ({
    getActiveDirectoryQuerySqlCaptureScope: mockedGetActiveDirectoryQuerySqlCaptureScope,
    isDirectoryQuerySqlCaptureEnabled: () => captureEnabled,
    logCapturedDirectoryQuerySql: mockedLogCapturedDirectoryQuerySql,
  }));

  jest.doMock("@/lib/request-context", () => ({
    getRequestContext: mockedGetRequestContext,
  }));
}

describe("db directory SQL capture", () => {
  const originalCaptureEnv = process.env.KBI_CAPTURE_DIRECTORY_SQL;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockPoolInstances.length = 0;
    resetPrismaGlobals();

    if (originalCaptureEnv === undefined) {
      delete process.env.KBI_CAPTURE_DIRECTORY_SQL;
    } else {
      process.env.KBI_CAPTURE_DIRECTORY_SQL = originalCaptureEnv;
    }

    mockedGetActiveDirectoryQuerySqlCaptureScope.mockReturnValue("offers_page");
    mockedGetRequestContext.mockReturnValue({
      requestId: "req-1",
      userId: "user-1",
    });
  });

  it("captures queries executed through pool.query", async () => {
    process.env.KBI_CAPTURE_DIRECTORY_SQL = "true";
    installDbModuleMocks(true);

    await import("@/lib/db");

    const [{ pool, originalQuery }] = mockPoolInstances;

    await pool.query({
      text: 'SELECT "BeerOffer"."id" FROM "BeerOffer" WHERE "status" = $1',
      values: ["approved"],
    });

    expect(originalQuery).toHaveBeenCalledWith({
      text: 'SELECT "BeerOffer"."id" FROM "BeerOffer" WHERE "status" = $1',
      values: ["approved"],
    });
    expect(mockedLogCapturedDirectoryQuerySql).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'SELECT "BeerOffer"."id" FROM "BeerOffer" WHERE "status" = $1',
        params: '["approved"]',
        duration: expect.any(Number),
        target: "pg.query",
      }),
      {
        scope: "offers_page",
        requestContext: {
          requestId: "req-1",
          userId: "user-1",
        },
      },
    );
  });

  it("leaves pool.query untouched when capture is disabled", async () => {
    delete process.env.KBI_CAPTURE_DIRECTORY_SQL;
    installDbModuleMocks(false);

    await import("@/lib/db");

    const [{ pool, originalQuery }] = mockPoolInstances;

    await pool.query("SELECT 1");

    expect(originalQuery).toHaveBeenCalledWith("SELECT 1");
    expect(mockedLogCapturedDirectoryQuerySql).not.toHaveBeenCalled();
  });
});
