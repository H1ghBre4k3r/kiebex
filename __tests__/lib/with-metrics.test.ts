import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock server-only modules that route-handlers imports transitively.
jest.mock("@/lib/auth", () => ({
  UnauthorizedError: class UnauthorizedError extends Error {},
  ForbiddenError: class ForbiddenError extends Error {},
  requireAuthUser: jest.fn(),
  requireModeratorUser: jest.fn(),
  requireAdminUser: jest.fn(),
}));

const mockedRecordHttpRequest =
  jest.fn<(method: string, route: string, status: number, duration: number) => void>();

jest.mock("@/lib/metrics", () => ({
  recordHttpRequest: mockedRecordHttpRequest,
}));

// logger is imported by route-handlers; mock it to avoid console noise.
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("withMetrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the handler response unchanged (status + body)", async () => {
    const { withMetrics } = await import("@/lib/route-handlers");

    const wrapped = withMetrics("GET", "/api/v1/test", async () => {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const response = await wrapped();

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("adds X-Request-ID header to every response", async () => {
    const { withMetrics } = await import("@/lib/route-handlers");

    const wrapped = withMetrics("GET", "/api/v1/test", async () => {
      return new Response("ok", { status: 200 });
    });

    const response = await wrapped();

    const requestId = response.headers.get("X-Request-ID");
    expect(requestId).not.toBeNull();
    // UUID v4 format
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("generates a unique X-Request-ID per request", async () => {
    const { withMetrics } = await import("@/lib/route-handlers");

    const wrapped = withMetrics("POST", "/api/v1/test", async () => {
      return new Response(null, { status: 204 });
    });

    const [r1, r2] = await Promise.all([wrapped(), wrapped()]);

    const id1 = r1.headers.get("X-Request-ID");
    const id2 = r2.headers.get("X-Request-ID");

    expect(id1).not.toBeNull();
    expect(id2).not.toBeNull();
    expect(id1).not.toBe(id2);
  });

  it("records HTTP request metrics with correct arguments", async () => {
    const { withMetrics } = await import("@/lib/route-handlers");

    const wrapped = withMetrics("DELETE", "/api/v1/test", async () => {
      return new Response(null, { status: 204 });
    });

    await wrapped();

    expect(mockedRecordHttpRequest).toHaveBeenCalledTimes(1);
    expect(mockedRecordHttpRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/test",
      204,
      expect.any(Number),
    );
  });

  it("preserves existing response headers alongside X-Request-ID", async () => {
    const { withMetrics } = await import("@/lib/route-handlers");

    const wrapped = withMetrics("GET", "/api/v1/test", async () => {
      return new Response("body", {
        status: 200,
        headers: { "Content-Type": "text/plain", "X-Custom": "hello" },
      });
    });

    const response = await wrapped();

    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(response.headers.get("X-Custom")).toBe("hello");
    expect(response.headers.get("X-Request-ID")).not.toBeNull();
  });
});
