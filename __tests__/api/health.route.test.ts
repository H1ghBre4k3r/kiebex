import { describe, expect, it, jest } from "@jest/globals";

jest.mock("@/lib/db", () => ({
  db: {
    $queryRaw: async () => [{ 1: 1 }],
  },
}));

describe("GET /api/v1/health", () => {
  it("returns an ok envelope with service metadata", async () => {
    const { GET } = await import("@/app/api/v1/health/route");
    const response = await GET();
    const body = (await response.json()) as {
      status: string;
      data: {
        service: string;
        status: string;
        timestamp: string;
      };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data.service).toBe("kiel-beer-index");
    expect(body.data.status).toBe("healthy");
    expect(new Date(body.data.timestamp).toString()).not.toBe("Invalid Date");
  });
});
