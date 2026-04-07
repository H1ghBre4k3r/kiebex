import { db } from "@/lib/db";
import type { BeerOfferWithLocation, BeerQuery, Location, ServingType } from "@/lib/types";

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

export async function getLocations(): Promise<Location[]> {
  const locations = await db.location.findMany({
    orderBy: [{ name: "asc" }],
  });

  return locations.map((location) => ({
    id: location.id,
    name: location.name,
    locationType: location.locationType,
    district: location.district,
    address: location.address,
  }));
}

export async function getLocationById(locationId: string): Promise<Location | undefined> {
  const location = await db.location.findUnique({
    where: { id: locationId },
  });

  if (!location) {
    return undefined;
  }

  return {
    id: location.id,
    name: location.name,
    locationType: location.locationType,
    district: location.district,
    address: location.address,
  };
}

export async function getBeerOffers(query: BeerQuery = {}): Promise<BeerOfferWithLocation[]> {
  const offers = await db.beerOffer.findMany({
    where: {
      brand: query.brand ? { equals: query.brand, mode: "insensitive" } : undefined,
      variant: query.variant ? { equals: query.variant, mode: "insensitive" } : undefined,
      sizeMl: query.sizeMl,
      serving: query.serving,
      locationId: query.locationId,
      location: query.locationType
        ? {
            locationType: query.locationType,
          }
        : undefined,
    },
    include: {
      location: true,
    },
    orderBy: [{ priceCents: "asc" }, { brand: "asc" }],
  });

  return offers.map((offer) => ({
    id: offer.id,
    brand: offer.brand,
    variant: offer.variant,
    sizeMl: offer.sizeMl,
    serving: offer.serving,
    priceEur: offer.priceCents / 100,
    locationId: offer.locationId,
    location: {
      id: offer.location.id,
      name: offer.location.name,
      locationType: offer.location.locationType,
      district: offer.location.district,
      address: offer.location.address,
    },
  }));
}

export async function getLocationOffers(locationId: string): Promise<BeerOfferWithLocation[]> {
  return getBeerOffers({ locationId });
}
