import { db } from "@/lib/db";
import type {
  BeerOfferWithLocation,
  BeerQuery,
  CreateBeerOfferInput,
  CreateLocationInput,
  Location,
  ServingType,
} from "@/lib/types";

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
    where: {
      status: "approved",
    },
    orderBy: [{ name: "asc" }],
  });

  return locations.map((location) => ({
    id: location.id,
    name: location.name,
    locationType: location.locationType,
    district: location.district,
    address: location.address,
    status: location.status,
    createdById: location.createdById,
  }));
}

export async function getContributableLocations(userId: string): Promise<Location[]> {
  const locations = await db.location.findMany({
    where: {
      OR: [
        { status: "approved" },
        {
          status: "pending",
          createdById: userId,
        },
      ],
    },
    orderBy: [{ name: "asc" }],
  });

  return locations.map((location) => ({
    id: location.id,
    name: location.name,
    locationType: location.locationType,
    district: location.district,
    address: location.address,
    status: location.status,
    createdById: location.createdById,
  }));
}

export async function getLocationContributionPermission(
  userId: string,
  locationId: string,
): Promise<"allowed" | "missing" | "forbidden"> {
  const location = await db.location.findUnique({
    where: { id: locationId },
    select: {
      status: true,
      createdById: true,
    },
  });

  if (!location) {
    return "missing";
  }

  if (location.status === "approved") {
    return "allowed";
  }

  if (location.status === "pending" && location.createdById === userId) {
    return "allowed";
  }

  return "forbidden";
}

export async function getLocationById(locationId: string): Promise<Location | undefined> {
  const location = await db.location.findUnique({
    where: { id: locationId },
  });

  if (!location || location.status !== "approved") {
    return undefined;
  }

  return {
    id: location.id,
    name: location.name,
    locationType: location.locationType,
    district: location.district,
    address: location.address,
    status: location.status,
    createdById: location.createdById,
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
      status: "approved",
      location: query.locationType
        ? {
            locationType: query.locationType,
            status: "approved",
          }
        : {
            status: "approved",
          },
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
      status: offer.location.status,
      createdById: offer.location.createdById,
    },
    status: offer.status,
    createdById: offer.createdById,
  }));
}

export async function getLocationOffers(locationId: string): Promise<BeerOfferWithLocation[]> {
  return getBeerOffers({ locationId });
}

export async function createLocation(input: CreateLocationInput): Promise<Location> {
  const location = await db.location.create({
    data: {
      name: input.name.trim(),
      locationType: input.locationType,
      district: input.district.trim(),
      address: input.address.trim(),
      createdById: input.createdById,
      status: input.status ?? "pending",
    },
  });

  return {
    id: location.id,
    name: location.name,
    locationType: location.locationType,
    district: location.district,
    address: location.address,
    status: location.status,
    createdById: location.createdById,
  };
}

export async function createBeerOffer(input: CreateBeerOfferInput): Promise<BeerOfferWithLocation> {
  const offer = await db.beerOffer.create({
    data: {
      brand: input.brand.trim(),
      variant: input.variant.trim(),
      sizeMl: input.sizeMl,
      serving: input.serving,
      priceCents: input.priceCents,
      locationId: input.locationId,
      createdById: input.createdById,
      status: input.status ?? "pending",
    },
    include: {
      location: true,
    },
  });

  return {
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
      status: offer.location.status,
      createdById: offer.location.createdById,
    },
    status: offer.status,
    createdById: offer.createdById,
  };
}
