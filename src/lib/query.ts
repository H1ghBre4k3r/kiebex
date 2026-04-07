import { db } from "@/lib/db";
import type {
  BeerOfferWithLocation,
  BeerQuery,
  CreateBeerOfferInput,
  CreateLocationInput,
  Location,
  ModerationStatusDecision,
  PendingBeerOfferSubmission,
  PendingLocationSubmission,
  ServingType,
  User,
  UserRole,
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

export async function getPendingLocationSubmissions(): Promise<PendingLocationSubmission[]> {
  const locations = await db.location.findMany({
    where: {
      status: "pending",
    },
    include: {
      createdBy: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  return locations.map((location) => ({
    id: location.id,
    name: location.name,
    locationType: location.locationType,
    district: location.district,
    address: location.address,
    status: location.status,
    createdById: location.createdById,
    createdAt: location.createdAt,
    submitter: location.createdBy,
  }));
}

export async function getPendingBeerOfferSubmissions(): Promise<PendingBeerOfferSubmission[]> {
  const offers = await db.beerOffer.findMany({
    where: {
      status: "pending",
    },
    include: {
      location: true,
      createdBy: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  return offers.map((offer) => ({
    id: offer.id,
    brand: offer.brand,
    variant: offer.variant,
    sizeMl: offer.sizeMl,
    serving: offer.serving,
    priceEur: offer.priceCents / 100,
    locationId: offer.locationId,
    status: offer.status,
    createdById: offer.createdById,
    createdAt: offer.createdAt,
    location: {
      id: offer.location.id,
      name: offer.location.name,
      locationType: offer.location.locationType,
      district: offer.location.district,
      address: offer.location.address,
      status: offer.location.status,
      createdById: offer.location.createdById,
    },
    submitter: offer.createdBy,
  }));
}

export async function moderateLocationSubmission(
  locationId: string,
  status: ModerationStatusDecision,
): Promise<Location | null> {
  const location = await db.location.findUnique({
    where: {
      id: locationId,
    },
  });

  if (!location || location.status !== "pending") {
    return null;
  }

  const updatedLocation =
    status === "rejected"
      ? await db.$transaction(async (transaction) => {
          const moderatedLocation = await transaction.location.update({
            where: {
              id: locationId,
            },
            data: {
              status,
            },
          });

          await transaction.beerOffer.updateMany({
            where: {
              locationId,
              status: "pending",
            },
            data: {
              status: "rejected",
            },
          });

          return moderatedLocation;
        })
      : await db.location.update({
          where: {
            id: locationId,
          },
          data: {
            status,
          },
        });

  return {
    id: updatedLocation.id,
    name: updatedLocation.name,
    locationType: updatedLocation.locationType,
    district: updatedLocation.district,
    address: updatedLocation.address,
    status: updatedLocation.status,
    createdById: updatedLocation.createdById,
  };
}

export async function moderateBeerOfferSubmission(
  offerId: string,
  status: ModerationStatusDecision,
): Promise<
  | { outcome: "updated"; offer: BeerOfferWithLocation }
  | { outcome: "missing" | "location_not_approved" }
> {
  const offer = await db.beerOffer.findUnique({
    where: {
      id: offerId,
    },
    include: {
      location: true,
    },
  });

  if (!offer || offer.status !== "pending") {
    return { outcome: "missing" };
  }

  if (status === "approved" && offer.location.status !== "approved") {
    return { outcome: "location_not_approved" };
  }

  const updatedOffer = await db.beerOffer.update({
    where: {
      id: offerId,
    },
    data: {
      status,
    },
    include: {
      location: true,
    },
  });

  return {
    outcome: "updated",
    offer: {
      id: updatedOffer.id,
      brand: updatedOffer.brand,
      variant: updatedOffer.variant,
      sizeMl: updatedOffer.sizeMl,
      serving: updatedOffer.serving,
      priceEur: updatedOffer.priceCents / 100,
      locationId: updatedOffer.locationId,
      status: updatedOffer.status,
      createdById: updatedOffer.createdById,
      location: {
        id: updatedOffer.location.id,
        name: updatedOffer.location.name,
        locationType: updatedOffer.location.locationType,
        district: updatedOffer.location.district,
        address: updatedOffer.location.address,
        status: updatedOffer.location.status,
        createdById: updatedOffer.location.createdById,
      },
    },
  };
}

export async function getUsersForAdmin(): Promise<User[]> {
  const users = await db.user.findMany({
    orderBy: [{ createdAt: "asc" }],
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    passwordHash: null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));
}

export async function updateUserRoleByAdmin(params: {
  targetUserId: string;
  role: UserRole;
  actingAdminId: string;
}): Promise<
  | { outcome: "updated"; user: User }
  | { outcome: "not_found" }
  | { outcome: "cannot_demote_last_admin" }
> {
  const targetUser = await db.user.findUnique({
    where: { id: params.targetUserId },
  });

  if (!targetUser) {
    return { outcome: "not_found" };
  }

  if (targetUser.id === params.actingAdminId && params.role !== "admin") {
    const adminCount = await db.user.count({
      where: { role: "admin" },
    });

    if (adminCount <= 1) {
      return { outcome: "cannot_demote_last_admin" };
    }
  }

  const updatedUser = await db.user.update({
    where: { id: params.targetUserId },
    data: { role: params.role },
  });

  return {
    outcome: "updated",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      role: updatedUser.role,
      passwordHash: null,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    },
  };
}
