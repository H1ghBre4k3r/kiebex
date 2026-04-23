import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockedLoggerInfo = jest.fn();

jest.mock("@/lib/logger", () => ({
  logger: {
    info: mockedLoggerInfo,
  },
}));

describe("directory query SQL capture", () => {
  const originalCaptureEnv = process.env.KBI_CAPTURE_DIRECTORY_SQL;

  beforeEach(() => {
    jest.resetModules();
    mockedLoggerInfo.mockReset();

    if (originalCaptureEnv === undefined) {
      delete process.env.KBI_CAPTURE_DIRECTORY_SQL;
    } else {
      process.env.KBI_CAPTURE_DIRECTORY_SQL = originalCaptureEnv;
    }
  });

  it("does not log when capture is disabled", async () => {
    delete process.env.KBI_CAPTURE_DIRECTORY_SQL;

    const { logCapturedDirectoryQuerySql } = await import("@/lib/directory-query-sql-capture");
    logCapturedDirectoryQuerySql({
      query: "SELECT 1",
      params: "[]",
      duration: 1,
      target: "db",
    });

    expect(mockedLoggerInfo).not.toHaveBeenCalled();
  });

  it("logs exact SQL only within an active capture scope", async () => {
    process.env.KBI_CAPTURE_DIRECTORY_SQL = "true";

    const { withDirectoryQuerySqlCapture, logCapturedDirectoryQuerySql } = await import(
      "@/lib/directory-query-sql-capture"
    );
    const { runWithContext } = await import("@/lib/request-context");

    await runWithContext({ requestId: "req-1", userId: "user-1" }, async () => {
      await withDirectoryQuerySqlCapture("offers_page", async () => {
        logCapturedDirectoryQuerySql({
          query: "SELECT \"BeerOffer\".* FROM \"BeerOffer\" WHERE \"status\" = $1",
          params: '["approved"]',
          duration: 12,
          target: "quaint::connector::metrics",
        });
      });
    });

    expect(mockedLoggerInfo).toHaveBeenCalledWith("directory_query.sql", {
      scope: "offers_page",
      query: 'SELECT "BeerOffer".* FROM "BeerOffer" WHERE "status" = $1',
      params: '["approved"]',
      durationMs: 12,
      target: "quaint::connector::metrics",
      requestId: "req-1",
      userId: "user-1",
    });
  });

  it("ignores query events outside a capture scope even when enabled", async () => {
    process.env.KBI_CAPTURE_DIRECTORY_SQL = "true";

    const { logCapturedDirectoryQuerySql } = await import("@/lib/directory-query-sql-capture");
    logCapturedDirectoryQuerySql({
      query: "SELECT 1",
      params: "[]",
      duration: 1,
      target: "db",
    });

    expect(mockedLoggerInfo).not.toHaveBeenCalled();
  });
});
