import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockedFindMany = jest.fn<() => Promise<Array<{ id: string }>>>();

describe("beer offer query shape", () => {
  beforeEach(() => {
    jest.resetModules();
    mockedFindMany.mockReset();

    jest.doMock("@/lib/db", () => ({
      db: {
        beerVariant: {
          findMany: mockedFindMany,
        },
      },
    }));
  });

  it("only resolves variant ids when brand or style filters lack an explicit variant id", async () => {
    const { shouldResolveApprovedVariantIds } = await import("@/lib/beer-offer-query-shape");

    expect(shouldResolveApprovedVariantIds({})).toBe(false);
    expect(shouldResolveApprovedVariantIds({ brandId: ["brand-1"] })).toBe(true);
    expect(shouldResolveApprovedVariantIds({ styleId: ["style-1"] })).toBe(true);
    expect(
      shouldResolveApprovedVariantIds({ brandId: ["brand-1"], variantId: ["variant-1"] }),
    ).toBe(false);
  });

  it("returns null when no variant-id pre-resolution is needed", async () => {
    const { resolveApprovedVariantIdsForBeerQuery } = await import("@/lib/beer-offer-query-shape");

    await expect(
      resolveApprovedVariantIdsForBeerQuery({ locationType: ["pub"] }),
    ).resolves.toBeNull();
    expect(mockedFindMany).not.toHaveBeenCalled();
  });

  it("resolves approved variant ids for brand and style filters", async () => {
    mockedFindMany.mockImplementation(async () => [{ id: "variant-1" }, { id: "variant-2" }]);

    const { resolveApprovedVariantIdsForBeerQuery } = await import("@/lib/beer-offer-query-shape");

    await expect(
      resolveApprovedVariantIdsForBeerQuery({ brandId: ["brand-1"], styleId: ["style-1"] }),
    ).resolves.toEqual(["variant-1", "variant-2"]);

    expect(mockedFindMany as jest.Mock).toHaveBeenCalledWith({
      where: {
        brandId: { in: ["brand-1"] },
        styleId: { in: ["style-1"] },
        status: "approved",
        brand: {
          status: "approved",
        },
      },
      select: {
        id: true,
      },
    });
  });
});
