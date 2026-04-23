import { describe, expect, it } from "@jest/globals";

import { getDirectoryPageSliceTake, toDirectoryPageSlice } from "@/lib/directory-page-slice";
import type { BeerOfferWithLocation } from "@/lib/types";

function buildOffer(id: string): BeerOfferWithLocation {
  return {
    id,
    brand: "Brand",
    variant: "Variant",
    variantId: "variant-1",
    style: "Pils",
    sizeMl: 500,
    serving: "tap",
    priceEur: 4.5,
    locationId: "location-1",
    status: "approved",
    createdById: null,
    location: {
      id: "location-1",
      name: "Pub",
      locationType: "pub",
      district: "Mitte",
      address: "Example Street 1",
      status: "approved",
      createdById: null,
    },
  };
}

describe("directory page slice", () => {
  it("requests one extra row to detect a next page", () => {
    expect(getDirectoryPageSliceTake(20)).toBe(21);
  });

  it("returns all rows when there is no next page", () => {
    const rows = [buildOffer("offer-1"), buildOffer("offer-2")];

    expect(toDirectoryPageSlice(rows, 20)).toEqual({
      offers: rows,
      hasNextPage: false,
    });
  });

  it("trims the extra row when there is a next page", () => {
    const rows = [buildOffer("offer-1"), buildOffer("offer-2"), buildOffer("offer-3")];

    expect(toDirectoryPageSlice(rows, 2)).toEqual({
      offers: [rows[0], rows[1]],
      hasNextPage: true,
    });
  });
});
