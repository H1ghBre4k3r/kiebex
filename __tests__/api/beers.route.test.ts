import { describe, expect, it, jest } from "@jest/globals";

const mockedGetBeerOffersPage =
  jest.fn<
    (query?: { serving?: string }, page?: number) => Promise<{ offers: unknown[]; total: number }>
  >();

jest.mock("@/lib/query", () => ({
  createOfferOrPriceUpdateProposal: jest.fn(),
  getBeerOffersPage: mockedGetBeerOffersPage,
  BEER_OFFERS_PAGE_SIZE: 20,
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
    expect(body.error.details?.some((detail) => detail.path === "sizeMl.0")).toBe(true);
    expect(body.error.details?.some((detail) => detail.path === "serving.0")).toBe(true);
    expect(mockedGetBeerOffersPage).not.toHaveBeenCalled();
  });

  it("returns filtered offers with pagination metadata when query params are valid", async () => {
    const offer = {
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
    };
    mockedGetBeerOffersPage.mockResolvedValueOnce({ offers: [offer], total: 1 });

    const { GET } = await import("@/app/api/v1/beers/route");
    const request = new Request("http://localhost/api/v1/beers?serving=tap");
    const response = await GET(request);
    const body = (await response.json()) as {
      status: string;
      data: {
        filters: { serving?: string };
        pagination: { page: number; pageSize: number; total: number; totalPages: number };
        offers: Array<{ id: string }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data.filters).toEqual({ serving: ["tap"] });
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.pageSize).toBe(20);
    expect(body.data.pagination.total).toBe(1);
    expect(body.data.pagination.totalPages).toBe(1);
    expect(body.data.offers[0]?.id).toBe("offer-1");
    expect(mockedGetBeerOffersPage).toHaveBeenCalledWith(
      expect.objectContaining({ serving: ["tap"] }),
      1,
    );
  });
});
