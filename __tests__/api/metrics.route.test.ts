import { beforeEach, describe, expect, it } from "@jest/globals";

import { GET } from "@/app/api/v1/metrics/route";
import { recordHomepageStage, recordPageRender } from "@/lib/metrics";

describe("GET /api/v1/metrics", () => {
  beforeEach(() => {
    recordPageRender("/", 0.05);
    recordHomepageStage("offers_query", 0.02);
  });

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
    expect(body).toContain("kiebex_page_render_duration_seconds");
    expect(body).toContain("kiebex_homepage_stage_duration_seconds");
  });

  it("includes homepage render labels after recording metrics", async () => {
    const response = await GET();
    const body = await response.text();

    expect(body).toContain(
      'kiebex_page_render_duration_seconds_bucket{le="0.1",app="kiebex",route="/"}',
    );
    expect(body).toContain(
      'kiebex_homepage_stage_duration_seconds_bucket{le="0.025",app="kiebex",stage="offers_query"}',
    );
  });

  it("returns no-cache header", async () => {
    const response = await GET();

    expect(response.headers.get("Cache-Control")).toBe("no-cache");
  });
});
