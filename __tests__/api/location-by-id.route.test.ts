import { describe, expect, it, jest } from "@jest/globals";

const mockedGetLocationById = jest.fn<
  (locationId: string) => Promise<
    | {
        id: string;
        name: string;
        locationType: "pub" | "bar" | "restaurant" | "supermarket";
        district: string;
        address: string;
        status: "pending" | "approved" | "rejected";
        createdById: string | null;
      }
    | undefined
  >
>();
const mockedGetLocationOffers = jest.fn<(locationId: string) => Promise<unknown[]>>();
const mockedGetLocationReviews = jest.fn<(locationId: string) => Promise<unknown[]>>();
const mockedGetOfferPriceHistory = jest.fn<(offerId: string) => Promise<unknown[]>>();

jest.mock("@/lib/query", () => ({
  getLocationById: mockedGetLocationById,
  getLocationOffers: mockedGetLocationOffers,
  getLocationReviews: mockedGetLocationReviews,
  getOfferPriceHistory: mockedGetOfferPriceHistory,
}));

describe("GET /api/v1/locations/[locationId]", () => {
  it("returns 404 for unknown location", async () => {
    mockedGetLocationById.mockResolvedValueOnce(undefined);

    const { GET } = await import("@/app/api/v1/locations/[locationId]/route");
    const response = await GET(new Request("http://localhost/api/v1/locations/unknown"), {
      params: Promise.resolve({ locationId: "unknown" }),
    });

    const body = (await response.json()) as {
      status: string;
      error: { code: string };
    };

    expect(response.status).toBe(404);
    expect(body.status).toBe("error");
    expect(body.error.code).toBe("LOCATION_NOT_FOUND");
    expect(mockedGetLocationOffers).not.toHaveBeenCalled();
  });

  it("returns location payload with offers, price history, and reviews", async () => {
    mockedGetLocationById.mockResolvedValueOnce({
      id: "loc-1",
      name: "Test Pub",
      locationType: "pub",
      district: "Mitte",
      address: "Teststrasse 1",
      status: "approved",
      createdById: null,
    });
    mockedGetLocationOffers.mockResolvedValueOnce([
      {
        id: "offer-1",
        brand: "Brand",
        variant: "Variant",
        variantId: "variant-1",
        style: "Style",
        sizeMl: 500,
        serving: "tap",
        priceEur: 4.5,
        locationId: "loc-1",
        status: "approved",
        createdById: null,
        location: {
          id: "loc-1",
          name: "Test Pub",
          locationType: "pub",
          district: "Mitte",
          address: "Teststrasse 1",
          status: "approved",
          createdById: null,
        },
      },
    ]);
    mockedGetLocationReviews.mockResolvedValueOnce([
      {
        id: "review-1",
        locationId: "loc-1",
        userId: "user-1",
        rating: 5,
        title: "Great",
        body: "Loved it",
        status: "approved",
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        author: {
          id: "user-1",
          displayName: "Tester",
        },
      },
    ]);
    mockedGetOfferPriceHistory.mockResolvedValueOnce([
      {
        id: "history-1",
        beerOfferId: "offer-1",
        priceEur: 4.5,
        effectiveAt: new Date("2024-01-01T00:00:00.000Z"),
        priceUpdateProposalId: null,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
      },
    ]);

    const { GET } = await import("@/app/api/v1/locations/[locationId]/route");
    const response = await GET(new Request("http://localhost/api/v1/locations/loc-1"), {
      params: Promise.resolve({ locationId: "loc-1" }),
    });
    const body = (await response.json()) as {
      status: string;
      data: {
        location: { id: string };
        count: number;
        reviewCount: number;
        offers: Array<{ id: string; priceHistory: Array<{ id: string }> }>;
      };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.data.location.id).toBe("loc-1");
    expect(body.data.count).toBe(1);
    expect(body.data.reviewCount).toBe(1);
    expect(body.data.offers[0]?.priceHistory[0]?.id).toBe("history-1");
    expect(mockedGetOfferPriceHistory).toHaveBeenCalledWith("offer-1");
  });
});
