import { describe, expect, it } from "@jest/globals";

import { GET } from "@/app/api/v1/metrics/route";

describe("GET /api/v1/metrics", () => {
  it("returns Prometheus-compatible metrics", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/plain");

    const body = await response.text();

    expect(body).toContain("# HELP");
    expect(body).toContain("# TYPE");
    expect(body).toContain("nodejs_");
    expect(body).toContain('app="kiebex"');
  });

  it("includes custom HTTP metrics", async () => {
    const response = await GET();
    const body = await response.text();

    expect(body).toContain("kiebex_http_request_duration_seconds");
    expect(body).toContain("kiebex_http_requests_total");
  });

  it("returns no-cache header", async () => {
    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe("no-cache");
  });
});
