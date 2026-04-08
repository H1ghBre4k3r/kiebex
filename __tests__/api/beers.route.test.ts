import { describe, expect, it, jest } from "@jest/globals";

const mockedGetBeerOffers = jest.fn<(query?: { serving?: string }) => Promise<unknown[]>>();

jest.mock("@/lib/query", () => ({
  createOfferOrPriceUpdateProposal: jest.fn(),
  getBeerOffers: mockedGetBeerOffers,
  getLocationContributionPermission: jest.fn(),
  getVariantContributionPermission: jest.fn(),
}));

describe("GET /api/v1/beers", () => {
  it("returns 400 when query params are invalid", async () => {
    const { GET } = await import("@/app/api/v1/beers/route");
    const request = new Request("http://localhost/api/v1/beers?sizeMl=-1&serving=draft");
    const response = await GET(request);
    const body = (await response.json()) as {
      status: string;
      error: {
        code: string;
        details?: Array<{ path?: string; message: string }>;
      };
    };

    expect(response.status).toBe(400);
    expect(body.status).toBe("error");
    expect(body.error.code).toBe("INVALID_QUERY");
    expect(body.error.details?.some((detail) => detail.path === "sizeMl")).toBe(true);
    expect(body.error.details?.some((detail) => detail.path === "serving")).toBe(true);
    expect(mockedGetBeerOffers).not.toHaveBeenCalled();
  });

  it("returns filtered offers when query params are valid", async () => {
    mockedGetBeerOffers.mockResolvedValueOnce([
      {
        id: "offer-1",
        brand: "Dithmarscher",
        variant: "Pilsener",
        variantId: "variant-1",
        style: "Pilsner",
        sizeMl: 500,
        serving: "tap",
        priceEur: 4.9,
        locationId: "location-1",
        status: "approved",
        createdById: null,
        location: {
          id: "location-1",
          name: "Zum Test",
          locationType: "pub",
          district: "Mitte",
          address: "Teststrasse 1",
          status: "approved",
          createdById: null,
        },
      },
    ]);

    const { GET } = await import("@/app/api/v1/beers/route");
    const request = new Request("http://localhost/api/v1/beers?serving=tap");
    const response = await GET(request);
    const body = (await response.json()) as {
      status: string;
      data: {
        count: number;
        filters: { serving?: string };
        offers: Array<{ id: string }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data.count).toBe(1);
    expect(body.data.filters).toEqual({ serving: "tap" });
    expect(body.data.offers[0]?.id).toBe("offer-1");
    expect(mockedGetBeerOffers).toHaveBeenCalledWith({ serving: "tap" });
  });
});
