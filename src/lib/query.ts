import { db } from "@/lib/db";
import type {
  AuditDetailsMap,
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
  ModerationAction,
  ModerationAuditLogEntry,
  ModerationContentType,
  ModerationReview,
  ModerationStatusDecision,
  OfferPriceHistory,
  OpenReport,
  PendingBeerBrandSubmission,
  PendingBeerOfferSubmission,
  PendingBeerVariantSubmission,
  PendingLocationSubmission,
  PendingPriceUpdateProposal,
  PriceUpdateProposal,
  LocationReviewSummary,
  Report,
  ReportContentType,
  ReportReason,
  ReportStatus,
  Review,
  ReviewStatus,
  ReviewWithAuthor,
  ServingType,
  SubmissionStatus,
  User,
  UserRole,
} from "@/lib/types";

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
  status: "new" | "pending" | "approved" | "rejected";
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

export async function getAllBeerBrandsForAdmin(): Promise<BeerBrand[]> {
  const brands = await db.beerBrand.findMany({
    orderBy: [{ name: "asc" }],
  });

  return brands.map(mapBeerBrand);
}

export async function getAllBeerVariantsForAdmin(): Promise<BeerVariant[]> {
  const variants = await db.beerVariant.findMany({
    include: { brand: true, style: true },
    orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
  });

  return variants.map(mapBeerVariant);
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

export const BEER_OFFERS_PAGE_SIZE = 20;

function buildBeerOffersWhere(query: BeerQuery) {
  return {
    sizeMl: query.sizeMl?.length ? { in: query.sizeMl } : undefined,
    serving: query.serving?.length ? { in: query.serving } : undefined,
    locationId: query.locationId?.length ? { in: query.locationId } : undefined,
    status: "approved" as const,
    location: {
      locationType: query.locationType?.length ? { in: query.locationType } : undefined,
      status: "approved" as const,
    },
    variantRef: {
      id: query.variantId?.length ? { in: query.variantId } : undefined,
      brandId: query.brandId?.length ? { in: query.brandId } : undefined,
      styleId: query.styleId?.length ? { in: query.styleId } : undefined,
      status: "approved" as const,
      brand: { status: "approved" as const },
    },
  };
}

export async function getBeerOffers(query: BeerQuery = {}): Promise<BeerOfferWithLocation[]> {
  const offers = await db.beerOffer.findMany({
    where: buildBeerOffersWhere(query),
    include: offerInclude(),
    orderBy: [{ priceCents: query.sort === "price_desc" ? "desc" : "asc" }],
  });

  return offers.map(mapOfferWithLocation);
}

export async function getBeerOffersPage(
  query: BeerQuery,
  page: number,
): Promise<{ offers: BeerOfferWithLocation[]; total: number }> {
  const where = buildBeerOffersWhere(query);

  const [total, rows] = await Promise.all([
    db.beerOffer.count({ where }),
    db.beerOffer.findMany({
      where,
      include: offerInclude(),
      orderBy: [{ priceCents: query.sort === "price_desc" ? "desc" : "asc" }],
      skip: (page - 1) * BEER_OFFERS_PAGE_SIZE,
      take: BEER_OFFERS_PAGE_SIZE,
    }),
  ]);

  return { offers: rows.map(mapOfferWithLocation), total };
}

export async function getLocationOffers(locationId: string): Promise<BeerOfferWithLocation[]> {
  return getBeerOffers({ locationId: [locationId] });
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
      status: { in: ["new", "approved"] },
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
      status: { in: ["new", "approved"] },
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
      status: input.status ?? "new",
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

export async function updateReview(
  reviewId: string,
  callerId: string,
  input: {
    rating: number;
    title?: string | null;
    body?: string | null;
  },
): Promise<ReviewWithAuthor | null> {
  const existing = await db.review.findUnique({
    where: { id: reviewId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== callerId) {
    return null;
  }

  const review = await db.review.update({
    where: { id: reviewId },
    data: {
      rating: input.rating,
      title: input.title?.trim() ? input.title.trim() : null,
      body: input.body?.trim() ? input.body.trim() : null,
    },
    select: {
      id: true,
      locationId: true,
      userId: true,
      rating: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, displayName: true } },
    },
  });

  return mapReview(review);
}

export async function deleteReview(reviewId: string, callerId: string): Promise<boolean> {
  const existing = await db.review.findUnique({
    where: { id: reviewId },
    select: { userId: true },
  });

  if (!existing || existing.userId !== callerId) {
    return false;
  }

  await db.review.delete({ where: { id: reviewId } });

  return true;
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

export async function getPendingQueueCount(): Promise<number> {
  const [locations, brands, variants, offers, priceUpdates, reviews, reports] = await Promise.all([
    db.location.count({ where: { status: "pending" } }),
    db.beerBrand.count({ where: { status: "pending" } }),
    db.beerVariant.count({ where: { status: "pending" } }),
    db.beerOffer.count({ where: { status: "pending" } }),
    db.priceUpdateProposal.count({ where: { status: "pending" } }),
    db.review.count({ where: { status: { in: ["new", "pending"] } } }),
    db.report.count({ where: { status: "open" } }),
  ]);

  return locations + brands + variants + offers + priceUpdates + reviews + reports;
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
  | {
      outcome: "updated";
      proposal: PriceUpdateProposal;
      offer: BeerOfferWithLocation;
      previousPriceEur: number;
    }
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
    previousPriceEur: proposal.beerOffer.priceCents / 100,
  };
}

export async function getUserPendingEmail(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { pendingEmail: true },
  });

  return user?.pendingEmail ?? null;
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
    emailVerified: user.emailVerified,
    isBanned: user.isBanned,
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
      emailVerified: updatedUser.emailVerified,
      isBanned: updatedUser.isBanned,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    },
  };
}

export async function verifyUserByAdmin(params: {
  targetUserId: string;
}): Promise<
  { outcome: "verified"; user: User } | { outcome: "not_found" } | { outcome: "already_verified" }
> {
  const targetUser = await db.user.findUnique({
    where: { id: params.targetUserId },
  });

  if (!targetUser) {
    return { outcome: "not_found" };
  }

  if (targetUser.emailVerified) {
    return { outcome: "already_verified" };
  }

  const updatedUser = await db.user.update({
    where: { id: params.targetUserId },
    data: {
      emailVerified: true,
      emailVerificationTokens: { deleteMany: {} },
    },
  });

  return {
    outcome: "verified",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      role: updatedUser.role,
      passwordHash: null,
      emailVerified: updatedUser.emailVerified,
      isBanned: updatedUser.isBanned,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    },
  };
}

// ---------------------------------------------------------------------------
// Moderation audit log
// ---------------------------------------------------------------------------

export async function banUserByAdmin(params: {
  targetUserId: string;
  actingAdminId: string;
}): Promise<
  | { outcome: "banned"; user: User }
  | { outcome: "not_found" }
  | { outcome: "already_banned" }
  | { outcome: "cannot_ban_self" }
> {
  if (params.targetUserId === params.actingAdminId) {
    return { outcome: "cannot_ban_self" };
  }

  const targetUser = await db.user.findUnique({
    where: { id: params.targetUserId },
  });

  if (!targetUser) {
    return { outcome: "not_found" };
  }

  if (targetUser.isBanned) {
    return { outcome: "already_banned" };
  }

  // Invalidate all sessions so the user is immediately signed out.
  const updatedUser = await db.user.update({
    where: { id: params.targetUserId },
    data: {
      isBanned: true,
      sessions: { deleteMany: {} },
    },
  });

  return {
    outcome: "banned",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      role: updatedUser.role,
      passwordHash: null,
      emailVerified: updatedUser.emailVerified,
      isBanned: updatedUser.isBanned,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    },
  };
}

export async function unbanUserByAdmin(params: {
  targetUserId: string;
}): Promise<
  { outcome: "unbanned"; user: User } | { outcome: "not_found" } | { outcome: "not_banned" }
> {
  const targetUser = await db.user.findUnique({
    where: { id: params.targetUserId },
  });

  if (!targetUser) {
    return { outcome: "not_found" };
  }

  if (!targetUser.isBanned) {
    return { outcome: "not_banned" };
  }

  const updatedUser = await db.user.update({
    where: { id: params.targetUserId },
    data: { isBanned: false },
  });

  return {
    outcome: "unbanned",
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      role: updatedUser.role,
      passwordHash: null,
      emailVerified: updatedUser.emailVerified,
      isBanned: updatedUser.isBanned,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    },
  };
}

export async function deleteUserByAdmin(params: {
  targetUserId: string;
  actingAdminId: string;
}): Promise<
  | { outcome: "deleted"; email: string; displayName: string }
  | { outcome: "not_found" }
  | { outcome: "cannot_delete_self" }
  | { outcome: "cannot_delete_last_admin" }
> {
  if (params.targetUserId === params.actingAdminId) {
    return { outcome: "cannot_delete_self" };
  }

  const targetUser = await db.user.findUnique({
    where: { id: params.targetUserId },
  });

  if (!targetUser) {
    return { outcome: "not_found" };
  }

  if (targetUser.role === "admin") {
    const adminCount = await db.user.count({ where: { role: "admin" } });

    if (adminCount <= 1) {
      return { outcome: "cannot_delete_last_admin" };
    }
  }

  await db.user.delete({ where: { id: params.targetUserId } });

  return {
    outcome: "deleted",
    email: targetUser.email,
    displayName: targetUser.displayName,
  };
}

export async function logModerationAction<T extends ModerationContentType>(params: {
  moderatorId: string;
  moderatorName: string;
  action: ModerationAction;
  contentType: T;
  contentId: string;
  details?: AuditDetailsMap[T];
}): Promise<void> {
  await db.moderationAuditLog.create({
    data: {
      moderatorId: params.moderatorId,
      moderatorName: params.moderatorName,
      action: params.action,
      contentType: params.contentType,
      contentId: params.contentId,
      details: params.details ? JSON.stringify(params.details) : null,
    },
  });
}

export async function getModerationAuditLog(limit = 100): Promise<ModerationAuditLogEntry[]> {
  const entries = await db.moderationAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { moderator: { select: { displayName: true } } },
  });

  return entries.map((entry) => ({
    id: entry.id,
    moderatorId: entry.moderatorId,
    moderatorName: entry.moderatorName,
    currentModeratorName: entry.moderator?.displayName ?? null,
    action: entry.action as ModerationAction,
    contentType: entry.contentType as ModerationContentType,
    contentId: entry.contentId,
    details: entry.details,
    createdAt: entry.createdAt,
  }));
}

export async function getModerationAuditLogPage(
  page: number,
  pageSize: number,
): Promise<{ entries: ModerationAuditLogEntry[]; total: number }> {
  const skip = (page - 1) * pageSize;

  const [entries, total] = await Promise.all([
    db.moderationAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: { moderator: { select: { displayName: true } } },
    }),
    db.moderationAuditLog.count(),
  ]);

  return {
    entries: entries.map((entry) => ({
      id: entry.id,
      moderatorId: entry.moderatorId,
      moderatorName: entry.moderatorName,
      currentModeratorName: entry.moderator?.displayName ?? null,
      action: entry.action as ModerationAction,
      contentType: entry.contentType as ModerationContentType,
      contentId: entry.contentId,
      details: entry.details,
      createdAt: entry.createdAt,
    })),
    total,
  };
}

// ---------------------------------------------------------------------------
// Reviews for moderation
// ---------------------------------------------------------------------------

export async function getAllReviewsForModeration(): Promise<ModerationReview[]> {
  const reviews = await db.review.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      locationId: true,
      userId: true,
      rating: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, displayName: true } },
      location: { select: { name: true } },
    },
  });

  return reviews.map((review) => ({
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
    locationName: review.location.name,
  }));
}

export async function getReviewStatusById(reviewId: string): Promise<ReviewStatus | null> {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { status: true },
  });
  return review?.status ?? null;
}

export async function moderateReviewDecision(
  reviewId: string,
  status: ReviewStatus,
): Promise<ModerationReview | null> {
  const existing = await db.review.findUnique({
    where: { id: reviewId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const review = await db.review.update({
    where: { id: reviewId },
    data: { status },
    select: {
      id: true,
      locationId: true,
      userId: true,
      rating: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, displayName: true } },
      location: { select: { name: true } },
    },
  });

  return {
    ...mapReview(review),
    locationName: review.location.name,
  };
}

export async function editModerationReview(
  reviewId: string,
  input: {
    rating?: number;
    title?: string | null;
    body?: string | null;
  },
): Promise<ModerationReview | null> {
  const existing = await db.review.findUnique({
    where: { id: reviewId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  const review = await db.review.update({
    where: { id: reviewId },
    data: {
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.title !== undefined
        ? { title: input.title?.trim() ? input.title.trim() : null }
        : {}),
      ...(input.body !== undefined ? { body: input.body?.trim() ? input.body.trim() : null } : {}),
    },
    select: {
      id: true,
      locationId: true,
      userId: true,
      rating: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, displayName: true } },
      location: { select: { name: true } },
    },
  });

  return {
    ...mapReview(review),
    locationName: review.location.name,
  };
}

export async function deleteModerationReview(
  reviewId: string,
): Promise<
  | { deleted: false }
  | { deleted: true; rating: number; title: string | null; author: string; locationName: string }
> {
  const existing = await db.review.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      rating: true,
      title: true,
      user: { select: { displayName: true } },
      location: { select: { name: true } },
    },
  });

  if (!existing) {
    return { deleted: false };
  }

  await db.review.delete({ where: { id: reviewId } });

  return {
    deleted: true,
    rating: existing.rating,
    title: existing.title,
    author: existing.user.displayName,
    locationName: existing.location.name,
  };
}

// ---------------------------------------------------------------------------
// Delete submissions (any status, moderator override)
// ---------------------------------------------------------------------------

export async function deleteModerationLocation(
  locationId: string,
): Promise<
  | { deleted: false }
  | { deleted: true; name: string; locationType: string; district: string; address: string }
> {
  const existing = await db.location.findUnique({
    where: { id: locationId },
    select: { id: true, name: true, locationType: true, district: true, address: true },
  });

  if (!existing) {
    return { deleted: false };
  }

  await db.location.delete({ where: { id: locationId } });

  return {
    deleted: true,
    name: existing.name,
    locationType: existing.locationType,
    district: existing.district,
    address: existing.address,
  };
}

export async function deleteModerationBrand(
  brandId: string,
): Promise<{ deleted: false } | { deleted: true; name: string }> {
  const existing = await db.beerBrand.findUnique({
    where: { id: brandId },
    select: { id: true, name: true },
  });

  if (!existing) {
    return { deleted: false };
  }

  await db.beerBrand.delete({ where: { id: brandId } });

  return { deleted: true, name: existing.name };
}

export async function deleteModerationVariant(
  variantId: string,
): Promise<{ deleted: false } | { deleted: true; name: string; brand: string; style: string }> {
  const existing = await db.beerVariant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      name: true,
      brand: { select: { name: true } },
      style: { select: { name: true } },
    },
  });

  if (!existing) {
    return { deleted: false };
  }

  await db.beerVariant.delete({ where: { id: variantId } });

  return {
    deleted: true,
    name: existing.name,
    brand: existing.brand.name,
    style: existing.style.name,
  };
}

export async function deleteModerationOffer(offerId: string): Promise<
  | { deleted: false }
  | {
      deleted: true;
      variant: string;
      brand: string;
      style: string;
      sizeMl: number;
      serving: string;
      location: string;
      priceEur: number;
    }
> {
  const existing = await db.beerOffer.findUnique({
    where: { id: offerId },
    include: offerInclude(),
  });

  if (!existing) {
    return { deleted: false };
  }

  await db.beerOffer.delete({ where: { id: offerId } });

  return {
    deleted: true,
    variant: existing.variantRef.name,
    brand: existing.variantRef.brand.name,
    style: existing.variantRef.style.name,
    sizeMl: existing.sizeMl,
    serving: existing.serving,
    location: existing.location.name,
    priceEur: existing.priceCents / 100,
  };
}

export async function deleteModerationPriceUpdateProposal(proposalId: string): Promise<
  | { deleted: false }
  | {
      deleted: true;
      variant: string;
      brand: string;
      location: string;
      proposedPriceEur: number;
      currentPriceEur: number;
    }
> {
  const existing = await db.priceUpdateProposal.findUnique({
    where: { id: proposalId },
    include: { beerOffer: { include: offerInclude() } },
  });

  if (!existing) {
    return { deleted: false };
  }

  await db.priceUpdateProposal.delete({ where: { id: proposalId } });

  return {
    deleted: true,
    variant: existing.beerOffer.variantRef.name,
    brand: existing.beerOffer.variantRef.brand.name,
    location: existing.beerOffer.location.name,
    proposedPriceEur: existing.proposedPriceCents / 100,
    currentPriceEur: existing.beerOffer.priceCents / 100,
  };
}

// ---------------------------------------------------------------------------
// Edit accepted submissions (moderator override)
// ---------------------------------------------------------------------------

export async function editModerationLocation(
  locationId: string,
  input: {
    name?: string;
    locationType?: Location["locationType"];
    district?: string;
    address?: string;
  },
): Promise<{
  location: Location;
  previousName: string;
  previousLocationType: string;
  previousDistrict: string;
  previousAddress: string;
} | null> {
  const existing = await db.location.findUnique({
    where: { id: locationId },
    select: { id: true, name: true, locationType: true, district: true, address: true },
  });

  if (!existing) {
    return null;
  }

  const updated = await db.location.update({
    where: { id: locationId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.locationType !== undefined ? { locationType: input.locationType } : {}),
      ...(input.district !== undefined ? { district: input.district.trim() } : {}),
      ...(input.address !== undefined ? { address: input.address.trim() } : {}),
    },
  });

  return {
    location: mapLocation(updated),
    previousName: existing.name,
    previousLocationType: existing.locationType,
    previousDistrict: existing.district,
    previousAddress: existing.address,
  };
}

export async function editModerationOffer(
  offerId: string,
  priceCents: number,
): Promise<{ offer: BeerOfferWithLocation; previousPriceEur: number } | null> {
  const existing = await db.beerOffer.findUnique({
    where: { id: offerId },
    select: { id: true, status: true, priceCents: true },
  });

  if (!existing) {
    return null;
  }

  const updated = await db.$transaction(async (transaction) => {
    const updatedOffer = await transaction.beerOffer.update({
      where: { id: offerId },
      data: { priceCents },
      include: offerInclude(),
    });

    // Record a price history entry if the offer is approved.
    if (existing.status === "approved") {
      await transaction.offerPriceHistory.create({
        data: {
          beerOfferId: offerId,
          priceCents,
        },
      });
    }

    return updatedOffer;
  });

  return { offer: mapOfferWithLocation(updated), previousPriceEur: existing.priceCents / 100 };
}

export async function editAdminBrand(
  brandId: string,
  name: string,
): Promise<{ brand: BeerBrand; previousName: string } | null> {
  const existing = await db.beerBrand.findUnique({
    where: { id: brandId },
    select: { id: true, name: true },
  });

  if (!existing) {
    return null;
  }

  const updated = await db.beerBrand.update({
    where: { id: brandId },
    data: { name: name.trim() },
  });

  return { brand: mapBeerBrand(updated), previousName: existing.name };
}

export async function editAdminVariant(
  variantId: string,
  input: { name?: string; styleId?: string },
): Promise<{ variant: BeerVariant; previousName: string; previousStyle: string } | null> {
  const existing = await db.beerVariant.findUnique({
    where: { id: variantId },
    select: { id: true, name: true, style: { select: { name: true } } },
  });

  if (!existing) {
    return null;
  }

  const updated = await db.beerVariant.update({
    where: { id: variantId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.styleId !== undefined ? { styleId: input.styleId } : {}),
    },
    include: { brand: true, style: true },
  });

  return {
    variant: mapBeerVariant(updated),
    previousName: existing.name,
    previousStyle: existing.style.name,
  };
}

// ---------------------------------------------------------------------------
// Beer style admin management
// ---------------------------------------------------------------------------

export async function getAllBeerStylesForAdmin(): Promise<
  Array<BeerStyle & { variantCount: number }>
> {
  const styles = await db.beerStyle.findMany({
    orderBy: [{ name: "asc" }],
    include: { _count: { select: { variants: true } } },
  });

  return styles.map((s) => ({
    id: s.id,
    name: s.name,
    variantCount: s._count.variants,
  }));
}

export async function createAdminStyle(name: string): Promise<BeerStyle | null> {
  const existing = await db.beerStyle.findUnique({
    where: { name: name.trim() },
    select: { id: true },
  });

  if (existing) {
    return null;
  }

  const created = await db.beerStyle.create({ data: { name: name.trim() } });
  return mapBeerStyle(created);
}

export async function editAdminStyle(
  styleId: string,
  name: string,
): Promise<{ style: BeerStyle; previousName: string } | null> {
  const existing = await db.beerStyle.findUnique({
    where: { id: styleId },
    select: { id: true, name: true },
  });

  if (!existing) {
    return null;
  }

  const updated = await db.beerStyle.update({
    where: { id: styleId },
    data: { name: name.trim() },
  });

  return { style: mapBeerStyle(updated), previousName: existing.name };
}

export async function deleteAdminStyle(
  styleId: string,
): Promise<{ deleted: false } | { deleted: true; name: string }> {
  const existing = await db.beerStyle.findUnique({
    where: { id: styleId },
    select: { id: true, name: true },
  });

  if (!existing) {
    return { deleted: false };
  }

  await db.beerStyle.delete({ where: { id: styleId } });
  return { deleted: true, name: existing.name };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

function mapReport(r: {
  id: string;
  reporterId: string | null;
  contentType: string;
  contentId: string;
  reason: string;
  note: string | null;
  status: string;
  resolvedById: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Report {
  return {
    id: r.id,
    reporterId: r.reporterId,
    contentType: r.contentType as ReportContentType,
    contentId: r.contentId,
    reason: r.reason as ReportReason,
    note: r.note,
    status: r.status as ReportStatus,
    resolvedById: r.resolvedById,
    resolvedAt: r.resolvedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function createReport(input: {
  reporterId: string;
  contentType: ReportContentType;
  contentId: string;
  reason: ReportReason;
  note?: string;
}): Promise<Report> {
  const created = await db.report.create({
    data: {
      reporterId: input.reporterId,
      contentType: input.contentType,
      contentId: input.contentId,
      reason: input.reason,
      note: input.note ?? null,
      status: "open",
    },
  });

  return mapReport(created);
}

export async function getOpenReports(): Promise<OpenReport[]> {
  const reports = await db.report.findMany({
    where: { status: "open" },
    orderBy: { createdAt: "asc" },
    include: {
      reporter: { select: { id: true, displayName: true } },
    },
  });

  // Resolve location IDs for review reports so we can build deep-link URLs.
  const reviewIds = reports.filter((r) => r.contentType === "review").map((r) => r.contentId);

  const reviewLocationMap = new Map<string, string>();

  if (reviewIds.length > 0) {
    const reviews = await db.review.findMany({
      where: { id: { in: reviewIds } },
      select: { id: true, locationId: true },
    });
    for (const review of reviews) {
      reviewLocationMap.set(review.id, review.locationId);
    }
  }

  return reports.map((r) => ({
    ...mapReport(r),
    reporter: r.reporter ? { id: r.reporter.id, displayName: r.reporter.displayName } : null,
    reviewLocationId:
      r.contentType === "review" ? (reviewLocationMap.get(r.contentId) ?? null) : undefined,
  }));
}

export async function getResolvedReports(): Promise<ResolvedReport[]> {
  const reports = await db.report.findMany({
    where: { status: { in: ["dismissed", "actioned"] } },
    orderBy: { resolvedAt: "desc" },
    include: {
      reporter: { select: { id: true, displayName: true } },
      resolvedBy: { select: { id: true, displayName: true } },
    },
    take: 50,
  });

  // Resolve location IDs for review reports so we can build deep-link URLs.
  const reviewIds = reports.filter((r) => r.contentType === "review").map((r) => r.contentId);

  const reviewLocationMap = new Map<string, string>();

  if (reviewIds.length > 0) {
    const reviews = await db.review.findMany({
      where: { id: { in: reviewIds } },
      select: { id: true, locationId: true },
    });
    for (const review of reviews) {
      reviewLocationMap.set(review.id, review.locationId);
    }
  }

  return reports.map((r) => ({
    ...mapReport(r),
    reporter: r.reporter ? { id: r.reporter.id, displayName: r.reporter.displayName } : null,
    resolvedBy: r.resolvedBy ? { id: r.resolvedBy.id, displayName: r.resolvedBy.displayName } : null,
    reviewLocationId:
      r.contentType === "review" ? (reviewLocationMap.get(r.contentId) ?? null) : undefined,
  }));
}

export async function resolveReport(
  reportId: string,
  decision: "dismissed" | "actioned",
  resolvedById: string,
): Promise<Report | null> {
  const existing = await db.report.findUnique({
    where: { id: reportId },
    select: { id: true, status: true },
  });

  if (!existing || existing.status !== "open") {
    return null;
  }

  const updated = await db.report.update({
    where: { id: reportId },
    data: {
      status: decision,
      resolvedById,
      resolvedAt: new Date(),
    },
  });

  return mapReport(updated);
}

export async function getReportById(reportId: string): Promise<
  | (Report & {
      reporter: { id: string; displayName: string } | null;
    })
  | null
> {
  const report = await db.report.findUnique({
    where: { id: reportId },
    include: { reporter: { select: { id: true, displayName: true } } },
  });

  if (!report) {
    return null;
  }

  return {
    ...mapReport(report),
    reporter: report.reporter
      ? { id: report.reporter.id, displayName: report.reporter.displayName }
      : null,
  };
}

export async function hasUserReportedContent(
  userId: string,
  contentType: ReportContentType,
  contentId: string,
): Promise<boolean> {
  const existing = await db.report.findFirst({
    where: { reporterId: userId, contentType, contentId },
    select: { id: true },
  });

  return existing !== null;
}
