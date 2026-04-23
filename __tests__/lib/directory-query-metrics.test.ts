import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockedRecordDirectoryQuery = jest.fn();

describe("directory query metrics", () => {
  beforeEach(() => {
    jest.resetModules();
    mockedRecordDirectoryQuery.mockReset();

    jest.doMock("@/lib/metrics", () => ({
      recordDirectoryQuery: mockedRecordDirectoryQuery,
    }));
  });

  it("normalizes filter shape labels", async () => {
    const { buildDirectoryFilterShape } = await import("@/lib/directory-query-metrics");

    expect(buildDirectoryFilterShape({})).toBe("none");
    expect(buildDirectoryFilterShape({ brandId: ["brand-1"] })).toBe("brand");
    expect(buildDirectoryFilterShape({ locationType: ["pub"] })).toBe("location_type");
    expect(buildDirectoryFilterShape({ brandId: ["brand-1"], serving: ["tap"] })).toBe("multi");
  });

  it("buckets page labels", async () => {
    const { buildDirectoryPageBucket } = await import("@/lib/directory-query-metrics");

    expect(buildDirectoryPageBucket(1)).toBe("1");
    expect(buildDirectoryPageBucket(3)).toBe("2_5");
    expect(buildDirectoryPageBucket(6)).toBe("6_plus");
  });

  it("builds beer-offer metric labels", async () => {
    const { buildBeerOffersDirectoryMetricLabels } = await import("@/lib/directory-query-metrics");

    expect(buildBeerOffersDirectoryMetricLabels({ brandId: ["brand-1"] }, 4)).toEqual({
      sort: "price_asc",
      filter_shape: "brand",
      page_bucket: "2_5",
    });

    expect(
      buildBeerOffersDirectoryMetricLabels(
        { brandId: ["brand-1"], variantId: ["variant-1"], sort: "price_desc" },
        6,
      ),
    ).toEqual({
      sort: "price_desc",
      filter_shape: "multi",
      page_bucket: "6_plus",
    });
  });

  it("records timed query metrics", async () => {
    const { timeDirectoryQuery } = await import("@/lib/directory-query-metrics");

    const result = await timeDirectoryQuery(
      {
        query_name: "offers_page",
        sort: "price_asc",
        filter_shape: "none",
        page_bucket: "1",
      },
      async () => "ok",
    );

    expect(result).toBe("ok");
    expect(mockedRecordDirectoryQuery).toHaveBeenCalledWith(
      {
        query_name: "offers_page",
        sort: "price_asc",
        filter_shape: "none",
        page_bucket: "1",
      },
      expect.any(Number),
    );
  });
});
