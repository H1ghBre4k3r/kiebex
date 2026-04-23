import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    prefetch,
    children,
    ...props
  }: React.ComponentProps<"a"> & { href: string; prefetch?: boolean }) =>
    React.createElement(
      "a",
      {
        href,
        "data-prefetch": prefetch === undefined ? "default" : String(prefetch),
        ...props,
      },
      children,
    ),
}));

jest.mock("@/app/filter-panel.module.css", () => ({}));
jest.mock("@/components/offer-display.module.css", () => ({}));

describe("public directory links", () => {
  it("disables prefetching on filter navigation links", async () => {
    const { FilterPanel } = await import("@/app/filter-panel");

    const markup = renderToStaticMarkup(
      <FilterPanel
        brands={[{ id: "brand-1", name: "Brand A" }]}
        variants={[{ id: "variant-1", name: "Pils", brandId: "brand-1" }]}
        stylesList={[{ id: "style-1", name: "Pilsner" }]}
        sizes={[500]}
        locations={[{ id: "location-1", name: "Pub One" }]}
        searchParams={{ brandId: ["brand-1"] }}
      />,
    );

    expect(markup).toContain("Clear All");
    expect(markup).toContain('data-prefetch="false"');
    expect(markup).toContain("Brand A");
    expect(markup).toContain("Pub One");
  });

  it("disables prefetching on dense offer-list location links", async () => {
    const { OfferSummary } = await import("@/components/offer-display");

    const markup = renderToStaticMarkup(
      <OfferSummary
        offer={{
          id: "offer-1",
          brand: "Brand A",
          variant: "Pils",
          variantId: "variant-1",
          style: "Pilsner",
          sizeMl: 500,
          serving: "tap",
          priceEur: 4.5,
          locationId: "location-1",
          status: "approved",
          createdById: null,
          location: {
            id: "location-1",
            name: "Pub One",
            locationType: "pub",
            district: "Mitte",
            address: "Street 1",
            status: "approved",
            createdById: null,
          },
        }}
        reviewSummary={null}
      />,
    );

    expect(markup).toContain('href="/locations/location-1"');
    expect(markup).toContain('data-prefetch="false"');
  });
});
