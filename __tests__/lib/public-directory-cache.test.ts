import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockedRevalidateTag = jest.fn<(tag: string, profile: string) => void>();
const mockedUnstableCache = jest.fn((fn: (...args: never[]) => Promise<unknown>) => fn);

const mockedGetLocations = jest.fn<() => Promise<Array<{ id: string; name: string }>>>();
const mockedGetBeerBrands = jest.fn<() => Promise<Array<{ id: string; name: string }>>>();
const mockedGetBeerStyles = jest.fn<() => Promise<Array<{ id: string; name: string }>>>();
const mockedGetBeerVariants =
  jest.fn<() => Promise<Array<{ id: string; name: string; brandId: string }>>>();
const mockedGetDistinctApprovedOfferSizes = jest.fn<() => Promise<number[]>>();

jest.mock("next/cache", () => ({
  revalidateTag: mockedRevalidateTag,
  unstable_cache: mockedUnstableCache,
}));

jest.mock("@/lib/query", () => ({
  getLocations: mockedGetLocations,
  getBeerBrands: mockedGetBeerBrands,
  getBeerStyles: mockedGetBeerStyles,
  getBeerVariants: mockedGetBeerVariants,
  getDistinctApprovedOfferSizes: mockedGetDistinctApprovedOfferSizes,
}));

describe("public directory cache", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const env = process.env as NodeJS.ProcessEnv & { NODE_ENV: string | undefined };

  beforeEach(() => {
    jest.resetModules();
    mockedRevalidateTag.mockReset();
    mockedUnstableCache.mockClear();
    mockedGetLocations.mockReset();
    mockedGetBeerBrands.mockReset();
    mockedGetBeerStyles.mockReset();
    mockedGetBeerVariants.mockReset();
    mockedGetDistinctApprovedOfferSizes.mockReset();
    env.NODE_ENV = originalNodeEnv;
  });

  it("loads the homepage filter metadata through a cached wrapper", async () => {
    mockedGetLocations.mockResolvedValue([{ id: "location-1", name: "Pub One" }]);
    mockedGetBeerBrands.mockResolvedValue([{ id: "brand-1", name: "Brand A" }]);
    mockedGetBeerStyles.mockResolvedValue([{ id: "style-1", name: "Pilsner" }]);
    mockedGetBeerVariants.mockResolvedValue([
      { id: "variant-1", name: "Pils", brandId: "brand-1" },
    ]);
    mockedGetDistinctApprovedOfferSizes.mockResolvedValue([330, 500]);

    const { getCachedPublicDirectoryFilterMetadata } = await import("@/lib/public-directory-cache");
    const result = await getCachedPublicDirectoryFilterMetadata();

    expect(result).toEqual({
      locations: [{ id: "location-1", name: "Pub One" }],
      brands: [{ id: "brand-1", name: "Brand A" }],
      stylesList: [{ id: "style-1", name: "Pilsner" }],
      variants: [{ id: "variant-1", name: "Pils", brandId: "brand-1" }],
      sizes: [330, 500],
    });
    expect(mockedUnstableCache.mock.calls[0]).toEqual([
      expect.any(Function),
      ["public-directory-filter-metadata"],
      {
        tags: ["public-directory-filter-metadata"],
      },
    ]);
  });

  it("skips tag invalidation during Jest route tests", async () => {
    const { invalidatePublicDirectoryFilterMetadataCache } =
      await import("@/lib/public-directory-cache");

    invalidatePublicDirectoryFilterMetadataCache();

    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("invalidates the shared metadata tag outside the test environment", async () => {
    env.NODE_ENV = "development";

    const { invalidatePublicDirectoryFilterMetadataCache } =
      await import("@/lib/public-directory-cache");

    invalidatePublicDirectoryFilterMetadataCache();

    expect(mockedRevalidateTag).toHaveBeenCalledWith("public-directory-filter-metadata", "max");
  });

  it("ignores missing revalidation context outside Next runtime", async () => {
    env.NODE_ENV = "development";
    mockedRevalidateTag.mockImplementation(() => {
      throw new Error(
        "Invariant: static generation store missing in revalidateTag public-directory-filter-metadata",
      );
    });

    const { invalidatePublicDirectoryFilterMetadataCache } =
      await import("@/lib/public-directory-cache");

    expect(() => invalidatePublicDirectoryFilterMetadataCache()).not.toThrow();
  });
});
