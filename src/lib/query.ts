import { beerOffers, locations } from "@/lib/data";
import type { BeerOfferWithLocation, BeerQuery, Location, ServingType } from "@/lib/types";

function equalsIgnoreCase(left: string, right: string): boolean {
  return left.toLocaleLowerCase("en-US") === right.toLocaleLowerCase("en-US");
}

function servingLabel(serving: ServingType): string {
  if (serving === "tap") {
    return "On Tap";
  }

  if (serving === "bottle") {
    return "Bottle";
  }

  return "Can";
}

export function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

export function locationTypeLabel(locationType: Location["locationType"]): string {
  if (locationType === "pub") {
    return "Pub";
  }

  if (locationType === "bar") {
    return "Bar";
  }

  if (locationType === "restaurant") {
    return "Restaurant";
  }

  return "Supermarket";
}

export function getServingLabel(serving: ServingType): string {
  return servingLabel(serving);
}

export function getLocations(): Location[] {
  return locations;
}

export function getLocationById(locationId: string): Location | undefined {
  return locations.find((location) => location.id === locationId);
}

export function getBeerOffers(query: BeerQuery = {}): BeerOfferWithLocation[] {
  const locationById = new Map(locations.map((location) => [location.id, location]));

  const enriched = beerOffers
    .map((offer) => {
      const location = locationById.get(offer.locationId);

      if (!location) {
        return undefined;
      }

      return {
        ...offer,
        location,
      } satisfies BeerOfferWithLocation;
    })
    .filter((offer): offer is BeerOfferWithLocation => offer !== undefined);

  return enriched
    .filter((offer) => {
      if (query.brand && !equalsIgnoreCase(offer.brand, query.brand)) {
        return false;
      }

      if (query.variant && !equalsIgnoreCase(offer.variant, query.variant)) {
        return false;
      }

      if (query.sizeMl && offer.sizeMl !== query.sizeMl) {
        return false;
      }

      if (query.serving && offer.serving !== query.serving) {
        return false;
      }

      if (query.locationType && offer.location.locationType !== query.locationType) {
        return false;
      }

      if (query.locationId && offer.location.id !== query.locationId) {
        return false;
      }

      return true;
    })
    .sort((left, right) => {
      if (left.priceEur !== right.priceEur) {
        return left.priceEur - right.priceEur;
      }

      return left.brand.localeCompare(right.brand, "en-US");
    });
}

export function getLocationOffers(locationId: string): BeerOfferWithLocation[] {
  return getBeerOffers({ locationId });
}
