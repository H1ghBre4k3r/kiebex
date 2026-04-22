import { beforeEach, describe, expect, it, jest } from "@jest/globals";

describe("metrics singleton", () => {
  beforeEach(() => {
    jest.resetModules();
    delete (globalThis as typeof globalThis & { __kiebexMetricsStore?: unknown })
      .__kiebexMetricsStore;
  });

  it("shares page metrics across separate module imports", async () => {
    const firstImport = await import("@/lib/metrics");
    firstImport.recordPageRender("/", 0.05);
    firstImport.recordHomepageStage("offers_query", 0.02);

    jest.resetModules();

    const secondImport = await import("@/lib/metrics");
    const body = await secondImport.getMetrics();

    expect(body).toContain('kiebex_page_render_duration_seconds_count{app="kiebex",route="/"} 1');
    expect(body).toContain(
      'kiebex_homepage_stage_duration_seconds_count{app="kiebex",stage="offers_query"} 1',
    );
  });
});
