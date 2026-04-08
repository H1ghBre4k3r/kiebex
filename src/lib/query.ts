import { db } from "@/lib/db";
import type {
  BeerBrand,
  BeerOfferWithLocation,
  BeerQuery,
  BeerStyle,
  BeerVariant,
  CreateBeerBrandInput,
  CreateBeerOfferInput,
  CreateReviewInput,
  CreateBeerVariantInput,
  CreateLocationInput,
  Location,
  ModerationStatusDecision,
  OfferPriceHistory,
  PendingBeerBrandSubmission,
  PendingBeerOfferSubmission,
  PendingBeerVariantSubmission,
  PendingLocationSubmission,
  PendingPriceUpdateProposal,
  PriceUpdateProposal,
  LocationReviewSummary,
  Review,
  ReviewWithAuthor,
  ServingType,
  SubmissionStatus,
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

function mapLocation(location: {
  id: string;
  name: string;
  locationType: Location["locationType"];
  district: string;
  address: string;
  status: SubmissionStatus;
  createdById: string | null;
}): Location {
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

function mapBeerStyle(style: { id: string; name: string }): BeerStyle {
  return {
    id: style.id,
    name: style.name,
  };
}

function mapBeerBrand(brand: {
  id: string;
  name: string;
  status: SubmissionStatus;
  createdById: string | null;
}): BeerBrand {
  return {
    id: brand.id,
    name: brand.name,
    status: brand.status,
    createdById: brand.createdById,
  };
}

function mapBeerVariant(variant: {
  id: string;
  name: string;
  brandId: string;
  styleId: string;
  status: SubmissionStatus;
  createdById: string | null;
  brand?: {
    id: string;
    name: string;
    status: SubmissionStatus;
    createdById: string | null;
  };
  style?: {
    id: string;
    name: string;
  };
}): BeerVariant {
  return {
    id: variant.id,
    name: variant.name,
    brandId: variant.brandId,
    styleId: variant.styleId,
    status: variant.status,
    createdById: variant.createdById,
    brand: variant.brand ? mapBeerBrand(variant.brand) : undefined,
    style: variant.style ? mapBeerStyle(variant.style) : undefined,
  };
}

function mapOfferWithLocation(offer: {
  id: string;
  variantId: string;
  sizeMl: number;
  serving: ServingType;
  priceCents: number;
  locationId: string;
  status: SubmissionStatus;
  createdById: string | null;
  location: {
    id: string;
    name: string;
    locationType: Location["locationType"];
    district: string;
    address: string;
    status: SubmissionStatus;
    createdById: string | null;
  };
  variantRef: {
    id: string;
    name: string;
    status: SubmissionStatus;
    brand: {
      id: string;
      name: string;
      status: SubmissionStatus;
      createdById: string | null;
    };
    style: {
      id: string;
      name: string;
    };
  };
}): BeerOfferWithLocation {
  return {
    id: offer.id,
    brand: offer.variantRef.brand.name,
    variant: offer.variantRef.name,
    variantId: offer.variantId,
    style: offer.variantRef.style.name,
    sizeMl: offer.sizeMl,
    serving: offer.serving,
    priceEur: offer.priceCents / 100,
    locationId: offer.locationId,
    status: offer.status,
    createdById: offer.createdById,
    location: mapLocation(offer.location),
  };
}

function mapReview(review: {
  id: string;
  locationId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    displayName: string;
  };
}): ReviewWithAuthor {
  return {
    id: review.id,
    locationId: review.locationId,
    userId: review.userId,
    rating: review.rating,
    title: review.title,
    body: review.body,
    status: review.status,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    author: {
      id: review.user.id,
      displayName: review.user.displayName,
    },
  };
}

function offerInclude() {
  return {
    location: true,
    variantRef: {
      include: {
        brand: true,
        style: true,
      },
    },
  } as const;
}

export async function getLocations(): Promise<Location[]> {
  const locations = await db.location.findMany({
    where: { status: "approved" },
    orderBy: [{ name: "asc" }],
  });

  return locations.map(mapLocation);
}

export async function getContributableLocations(userId: string): Promise<Location[]> {
  const locations = await db.location.findMany({
    where: {
      OR: [{ status: "approved" }, { status: "pending", createdById: userId }],
    },
    orderBy: [{ name: "asc" }],
  });

  return locations.map(mapLocation);
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
  const location = await db.location.findUnique({ where: { id: locationId } });

  if (!location || location.status !== "approved") {
    return undefined;
  }

  return mapLocation(location);
}

export async function getBeerStyles(): Promise<BeerStyle[]> {
  const styles = await db.beerStyle.findMany({ orderBy: [{ name: "asc" }] });
  return styles.map(mapBeerStyle);
}

export async function getBeerBrands(): Promise<BeerBrand[]> {
  const brands = await db.beerBrand.findMany({
    where: { status: "approved" },
    orderBy: [{ name: "asc" }],
  });

  return brands.map(mapBeerBrand);
}

export async function getContributableBeerBrands(userId: string): Promise<BeerBrand[]> {
  const brands = await db.beerBrand.findMany({
    where: {
      OR: [{ status: "approved" }, { status: "pending", createdById: userId }],
    },
    orderBy: [{ name: "asc" }],
  });

  return brands.map(mapBeerBrand);
}

export async function getBeerVariants(options?: {
  brandId?: string;
  includePendingForUserId?: string;
}): Promise<BeerVariant[]> {
  const variants = await db.beerVariant.findMany({
    where: {
      brandId: options?.brandId,
      OR: options?.includePendingForUserId
        ? [
            { status: "approved" },
            { status: "pending", createdById: options.includePendingForUserId },
          ]
        : [{ status: "approved" }],
    },
    include: {
      brand: true,
      style: true,
    },
    orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
  });

  return variants.map(mapBeerVariant);
}

export async function getContributableBeerVariants(
  userId: string,
  options?: { brandId?: string },
): Promise<BeerVariant[]> {
  const variants = await db.beerVariant.findMany({
    where: {
      brandId: options?.brandId,
      OR: [{ status: "approved" }, { status: "pending", createdById: userId }],
    },
    include: {
      brand: true,
      style: true,
    },
    orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
  });

  return variants.map(mapBeerVariant);
}

export async function getBrandContributionPermission(
  userId: string,
  brandId: string,
): Promise<"allowed" | "missing" | "forbidden"> {
  const brand = await db.beerBrand.findUnique({
    where: { id: brandId },
    select: {
      status: true,
      createdById: true,
    },
  });

  if (!brand) {
    return "missing";
  }

  if (brand.status === "approved") {
    return "allowed";
  }

  if (brand.status === "pending" && brand.createdById === userId) {
    return "allowed";
  }

  return "forbidden";
}

export async function getVariantContributionPermission(
  userId: string,
  variantId: string,
): Promise<"allowed" | "missing" | "forbidden"> {
  const variant = await db.beerVariant.findUnique({
    where: { id: variantId },
    select: {
      status: true,
      createdById: true,
      brand: {
        select: {
          status: true,
          createdById: true,
        },
      },
    },
  });

  if (!variant) {
    return "missing";
  }

  if (variant.status === "approved" && variant.brand.status === "approved") {
    return "allowed";
  }

  if (
    variant.status === "pending" &&
    variant.createdById === userId &&
    (variant.brand.status === "approved" || variant.brand.createdById === userId)
  ) {
    return "allowed";
  }

  return "forbidden";
}

export async function getBeerOffers(query: BeerQuery = {}): Promise<BeerOfferWithLocation[]> {
  const offers = await db.beerOffer.findMany({
    where: {
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
      variantRef: {
        id: query.variantId,
        brandId: query.brandId,
        styleId: query.styleId,
        status: "approved",
        brand: {
          status: "approved",
        },
      },
    },
    include: offerInclude(),
    orderBy: [{ priceCents: "asc" }],
  });

  return offers.map(mapOfferWithLocation);
}

export async function getLocationOffers(locationId: string): Promise<BeerOfferWithLocation[]> {
  return getBeerOffers({ locationId });
}

export async function getLocationReviewPermission(
  locationId: string,
): Promise<"allowed" | "missing" | "forbidden"> {
  const location = await db.location.findUnique({
    where: { id: locationId },
    select: {
      status: true,
    },
  });

  if (!location) {
    return "missing";
  }

  if (location.status !== "approved") {
    return "forbidden";
  }

  return "allowed";
}

export async function getLocationReviews(locationId: string): Promise<ReviewWithAuthor[]> {
  const reviews = await db.review.findMany({
    where: {
      locationId,
      status: "approved",
      location: {
        status: "approved",
      },
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return reviews.map(mapReview);
}

export async function getLocationReviewSummaries(
  locationIds: string[],
): Promise<Map<string, LocationReviewSummary>> {
  if (locationIds.length === 0) {
    return new Map();
  }

  const aggregates = await db.review.groupBy({
    by: ["locationId"],
    where: {
      locationId: {
        in: locationIds,
      },
      status: "approved",
      location: {
        status: "approved",
      },
    },
    _count: {
      _all: true,
    },
    _avg: {
      rating: true,
    },
  });

  const map = new Map<string, LocationReviewSummary>();

  for (const aggregate of aggregates) {
    map.set(aggregate.locationId, {
      locationId: aggregate.locationId,
      reviewCount: aggregate._count._all,
      averageRating: aggregate._avg.rating,
    });
  }

  return map;
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

  return mapLocation(location);
}

export async function createBeerBrand(input: CreateBeerBrandInput): Promise<BeerBrand> {
  const brand = await db.beerBrand.create({
    data: {
      name: input.name.trim(),
      createdById: input.createdById,
      status: input.status ?? "pending",
    },
  });

  return mapBeerBrand(brand);
}

export async function createBeerVariant(input: CreateBeerVariantInput): Promise<BeerVariant> {
  const variant = await db.beerVariant.create({
    data: {
      name: input.name.trim(),
      brandId: input.brandId,
      styleId: input.styleId,
      createdById: input.createdById,
      status: input.status ?? "pending",
    },
    include: {
      brand: true,
      style: true,
    },
  });

  return mapBeerVariant(variant);
}

export async function createBeerOffer(input: CreateBeerOfferInput): Promise<BeerOfferWithLocation> {
  const variant = await db.beerVariant.findUnique({
    where: { id: input.variantId },
    include: {
      brand: true,
      style: true,
    },
  });

  if (!variant) {
    throw new Error("Variant not found.");
  }

  const offer = await db.beerOffer.create({
    data: {
      brand: variant.brand.name,
      variant: variant.name,
      variantId: variant.id,
      sizeMl: input.sizeMl,
      serving: input.serving,
      priceCents: input.priceCents,
      locationId: input.locationId,
      createdById: input.createdById,
      status: input.status ?? "pending",
    },
    include: offerInclude(),
  });

  return mapOfferWithLocation(offer);
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const review = await db.review.create({
    data: {
      locationId: input.locationId,
      userId: input.userId,
      rating: input.rating,
      title: input.title?.trim() ? input.title.trim() : null,
      body: input.body?.trim() ? input.body.trim() : null,
      status: input.status ?? "approved",
    },
  });

  return {
    id: review.id,
    locationId: review.locationId,
    userId: review.userId,
    rating: review.rating,
    title: review.title,
    body: review.body,
    status: review.status,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export async function createPriceUpdateProposal(input: {
  beerOfferId: string;
  proposedPriceCents: number;
  createdById?: string;
  status?: SubmissionStatus;
}): Promise<PriceUpdateProposal> {
  const proposal = await db.priceUpdateProposal.create({
    data: {
      beerOfferId: input.beerOfferId,
      proposedPriceCents: input.proposedPriceCents,
      createdById: input.createdById,
      status: input.status ?? "pending",
    },
  });

  return {
    id: proposal.id,
    beerOfferId: proposal.beerOfferId,
    proposedPriceEur: proposal.proposedPriceCents / 100,
    status: proposal.status,
    createdById: proposal.createdById,
    createdAt: proposal.createdAt,
    updatedAt: proposal.updatedAt,
  };
}

export async function createOfferOrPriceUpdateProposal(
  input: CreateBeerOfferInput,
): Promise<
  | { outcome: "offer"; offer: BeerOfferWithLocation }
  | { outcome: "price_update"; proposal: PriceUpdateProposal; offer: BeerOfferWithLocation }
  | { outcome: "same_price"; offer: BeerOfferWithLocation }
  | { outcome: "existing_offer_not_approved"; offer: BeerOfferWithLocation }
> {
  const existing = await db.beerOffer.findUnique({
    where: {
      locationId_variantId_sizeMl_serving: {
        locationId: input.locationId,
        variantId: input.variantId,
        sizeMl: input.sizeMl,
        serving: input.serving,
      },
    },
    include: offerInclude(),
  });

  if (!existing) {
    const offer = await createBeerOffer(input);
    return { outcome: "offer", offer };
  }

  const existingOffer = mapOfferWithLocation(existing);

  if (existing.status !== "approved") {
    return {
      outcome: "existing_offer_not_approved",
      offer: existingOffer,
    };
  }

  if (existing.priceCents === input.priceCents) {
    return {
      outcome: "same_price",
      offer: existingOffer,
    };
  }

  const proposal = await createPriceUpdateProposal({
    beerOfferId: existing.id,
    proposedPriceCents: input.priceCents,
    createdById: input.createdById,
    status: input.status ?? "pending",
  });

  return {
    outcome: "price_update",
    proposal,
    offer: existingOffer,
  };
}

export async function getOfferPriceHistory(beerOfferId: string): Promise<OfferPriceHistory[]> {
  const entries = await db.offerPriceHistory.findMany({
    where: {
      beerOfferId,
    },
    orderBy: [{ effectiveAt: "desc" }],
  });

  return entries.map((entry) => ({
    id: entry.id,
    beerOfferId: entry.beerOfferId,
    priceEur: entry.priceCents / 100,
    effectiveAt: entry.effectiveAt,
    priceUpdateProposalId: entry.priceUpdateProposalId,
    createdAt: entry.createdAt,
  }));
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
    ...mapLocation(location),
    createdAt: location.createdAt,
    submitter: location.createdBy,
  }));
}

export async function getPendingBeerBrandSubmissions(): Promise<PendingBeerBrandSubmission[]> {
  const brands = await db.beerBrand.findMany({
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

  return brands.map((brand) => ({
    ...mapBeerBrand(brand),
    createdAt: brand.createdAt,
    submitter: brand.createdBy,
  }));
}

export async function getPendingBeerVariantSubmissions(): Promise<PendingBeerVariantSubmission[]> {
  const variants = await db.beerVariant.findMany({
    where: {
      status: "pending",
    },
    include: {
      brand: true,
      style: true,
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

  return variants.map((variant) => ({
    ...mapBeerVariant(variant),
    createdAt: variant.createdAt,
    submitter: variant.createdBy,
  }));
}

export async function getPendingBeerOfferSubmissions(): Promise<PendingBeerOfferSubmission[]> {
  const offers = await db.beerOffer.findMany({
    where: {
      status: "pending",
    },
    include: {
      ...offerInclude(),
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
    ...mapOfferWithLocation(offer),
    createdAt: offer.createdAt,
    submitter: offer.createdBy,
  }));
}

export async function getPendingPriceUpdateProposals(): Promise<PendingPriceUpdateProposal[]> {
  const proposals = await db.priceUpdateProposal.findMany({
    where: {
      status: "pending",
    },
    include: {
      beerOffer: {
        include: offerInclude(),
      },
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

  return proposals.map((proposal) => ({
    id: proposal.id,
    beerOfferId: proposal.beerOfferId,
    proposedPriceEur: proposal.proposedPriceCents / 100,
    status: proposal.status,
    createdById: proposal.createdById,
    createdAt: proposal.createdAt,
    updatedAt: proposal.updatedAt,
    offer: mapOfferWithLocation(proposal.beerOffer),
    submitter: proposal.createdBy,
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

          await transaction.priceUpdateProposal.updateMany({
            where: {
              status: "pending",
              beerOffer: {
                locationId,
              },
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

  return mapLocation(updatedLocation);
}

export async function moderateBeerBrandSubmission(
  brandId: string,
  status: ModerationStatusDecision,
): Promise<BeerBrand | null> {
  const brand = await db.beerBrand.findUnique({
    where: {
      id: brandId,
    },
  });

  if (!brand || brand.status !== "pending") {
    return null;
  }

  const updatedBrand = await db.beerBrand.update({
    where: {
      id: brandId,
    },
    data: {
      status,
    },
  });

  return mapBeerBrand(updatedBrand);
}

export async function moderateBeerVariantSubmission(
  variantId: string,
  status: ModerationStatusDecision,
): Promise<
  { outcome: "updated"; variant: BeerVariant } | { outcome: "missing" | "brand_not_approved" }
> {
  const variant = await db.beerVariant.findUnique({
    where: {
      id: variantId,
    },
    include: {
      brand: true,
      style: true,
    },
  });

  if (!variant || variant.status !== "pending") {
    return { outcome: "missing" };
  }

  if (status === "approved" && variant.brand.status !== "approved") {
    return { outcome: "brand_not_approved" };
  }

  const updatedVariant = await db.beerVariant.update({
    where: {
      id: variantId,
    },
    data: {
      status,
    },
    include: {
      brand: true,
      style: true,
    },
  });

  return {
    outcome: "updated",
    variant: mapBeerVariant(updatedVariant),
  };
}

export async function moderateBeerOfferSubmission(
  offerId: string,
  status: ModerationStatusDecision,
): Promise<
  | { outcome: "updated"; offer: BeerOfferWithLocation }
  | { outcome: "missing" | "location_not_approved" | "variant_not_approved" }
> {
  const offer = await db.beerOffer.findUnique({
    where: {
      id: offerId,
    },
    include: offerInclude(),
  });

  if (!offer || offer.status !== "pending") {
    return { outcome: "missing" };
  }

  if (status === "approved" && offer.location.status !== "approved") {
    return { outcome: "location_not_approved" };
  }

  if (
    status === "approved" &&
    (offer.variantRef.status !== "approved" || offer.variantRef.brand.status !== "approved")
  ) {
    return { outcome: "variant_not_approved" };
  }

  const updatedOffer =
    status === "approved"
      ? await db.$transaction(async (transaction) => {
          const moderatedOffer = await transaction.beerOffer.update({
            where: {
              id: offerId,
            },
            data: {
              status,
            },
            include: offerInclude(),
          });

          await transaction.offerPriceHistory.create({
            data: {
              beerOfferId: offerId,
              priceCents: moderatedOffer.priceCents,
            },
          });

          return moderatedOffer;
        })
      : await db.beerOffer.update({
          where: {
            id: offerId,
          },
          data: {
            status,
          },
          include: offerInclude(),
        });

  return {
    outcome: "updated",
    offer: mapOfferWithLocation(updatedOffer),
  };
}

export async function moderatePriceUpdateProposal(
  proposalId: string,
  status: ModerationStatusDecision,
): Promise<
  | { outcome: "updated"; proposal: PriceUpdateProposal; offer: BeerOfferWithLocation }
  | { outcome: "missing" | "offer_not_approved" | "location_not_approved" | "variant_not_approved" }
> {
  const proposal = await db.priceUpdateProposal.findUnique({
    where: {
      id: proposalId,
    },
    include: {
      beerOffer: {
        include: offerInclude(),
      },
    },
  });

  if (!proposal || proposal.status !== "pending") {
    return { outcome: "missing" };
  }

  if (status === "approved" && proposal.beerOffer.status !== "approved") {
    return { outcome: "offer_not_approved" };
  }

  if (status === "approved" && proposal.beerOffer.location.status !== "approved") {
    return { outcome: "location_not_approved" };
  }

  if (
    status === "approved" &&
    (proposal.beerOffer.variantRef.status !== "approved" ||
      proposal.beerOffer.variantRef.brand.status !== "approved")
  ) {
    return { outcome: "variant_not_approved" };
  }

  const { updatedProposal, updatedOffer } =
    status === "approved"
      ? await db.$transaction(async (transaction) => {
          const proposalUpdate = await transaction.priceUpdateProposal.update({
            where: {
              id: proposalId,
            },
            data: {
              status,
            },
          });

          const offerUpdate = await transaction.beerOffer.update({
            where: {
              id: proposal.beerOfferId,
            },
            data: {
              priceCents: proposal.proposedPriceCents,
            },
            include: offerInclude(),
          });

          await transaction.offerPriceHistory.create({
            data: {
              beerOfferId: offerUpdate.id,
              priceCents: proposal.proposedPriceCents,
              priceUpdateProposalId: proposalId,
            },
          });

          return {
            updatedProposal: proposalUpdate,
            updatedOffer: offerUpdate,
          };
        })
      : {
          updatedProposal: await db.priceUpdateProposal.update({
            where: {
              id: proposalId,
            },
            data: {
              status,
            },
          }),
          updatedOffer: proposal.beerOffer,
        };

  return {
    outcome: "updated",
    proposal: {
      id: updatedProposal.id,
      beerOfferId: updatedProposal.beerOfferId,
      proposedPriceEur: updatedProposal.proposedPriceCents / 100,
      status: updatedProposal.status,
      createdById: updatedProposal.createdById,
      createdAt: updatedProposal.createdAt,
      updatedAt: updatedProposal.updatedAt,
    },
    offer: mapOfferWithLocation(updatedOffer),
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
