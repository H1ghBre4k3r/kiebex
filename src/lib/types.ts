export const SERVING_TYPES = ["tap", "bottle", "can"] as const;
export type ServingType = (typeof SERVING_TYPES)[number];

export const LOCATION_TYPES = ["pub", "bar", "restaurant", "supermarket"] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export type UserRole = "user" | "moderator" | "admin";

export type ReviewStatus = "new" | "pending" | "approved" | "rejected";

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type ModerationStatusDecision = Exclude<SubmissionStatus, "pending">;

export type User = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  passwordHash?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthUser = Pick<User, "id" | "email" | "displayName" | "role">;

export type Session = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type Location = {
  id: string;
  name: string;
  locationType: LocationType;
  district: string;
  address: string;
  status: SubmissionStatus;
  createdById?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type BeerStyle = {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type BeerBrand = {
  id: string;
  name: string;
  status: SubmissionStatus;
  createdById?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type BeerVariant = {
  id: string;
  name: string;
  brandId: string;
  styleId: string;
  status: SubmissionStatus;
  createdById?: string | null;
  brand?: BeerBrand;
  style?: BeerStyle;
  createdAt?: Date;
  updatedAt?: Date;
};

export type BeerOffer = {
  id: string;
  brand: string;
  variant: string;
  variantId: string;
  style: string;
  sizeMl: number;
  serving: ServingType;
  priceEur: number;
  locationId: string;
  status: SubmissionStatus;
  createdById?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type BeerOfferWithLocation = BeerOffer & {
  location: Location;
};

export type OfferPriceHistory = {
  id: string;
  beerOfferId: string;
  priceEur: number;
  effectiveAt: Date;
  priceUpdateProposalId?: string | null;
  createdAt: Date;
};

export type PriceUpdateProposal = {
  id: string;
  beerOfferId: string;
  proposedPriceEur: number;
  status: SubmissionStatus;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Review = {
  id: string;
  locationId: string;
  userId: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewAuthor = {
  id: string;
  displayName: string;
};

export type ReviewWithAuthor = Review & {
  author: ReviewAuthor;
};

export type LocationReviewSummary = {
  locationId: string;
  reviewCount: number;
  averageRating: number | null;
};

export type BeerSort = "price_asc" | "price_desc";

export type BeerQuery = {
  brandId?: string[];
  variantId?: string[];
  styleId?: string[];
  sizeMl?: number[];
  serving?: ServingType[];
  locationType?: LocationType[];
  locationId?: string[];
  sort?: BeerSort;
};

export type CreateLocationInput = {
  name: string;
  locationType: LocationType;
  district: string;
  address: string;
  createdById?: string;
  status?: SubmissionStatus;
};

export type CreateBeerBrandInput = {
  name: string;
  createdById?: string;
  status?: SubmissionStatus;
};

export type CreateBeerVariantInput = {
  name: string;
  brandId: string;
  styleId: string;
  createdById?: string;
  status?: SubmissionStatus;
};

export type CreateBeerOfferInput = {
  variantId: string;
  sizeMl: number;
  serving: ServingType;
  priceCents: number;
  locationId: string;
  createdById?: string;
  status?: SubmissionStatus;
};

export type CreateReviewInput = {
  locationId: string;
  userId: string;
  rating: number;
  title?: string;
  body?: string;
  status?: ReviewStatus;
};

export type ModerationSubmitter = {
  id: string;
  displayName: string;
  email: string;
};

export type PendingLocationSubmission = Location & {
  createdAt: Date;
  submitter: ModerationSubmitter | null;
};

export type PendingBeerBrandSubmission = BeerBrand & {
  createdAt: Date;
  submitter: ModerationSubmitter | null;
};

export type PendingBeerVariantSubmission = BeerVariant & {
  createdAt: Date;
  submitter: ModerationSubmitter | null;
};

export type PendingBeerOfferSubmission = BeerOfferWithLocation & {
  createdAt: Date;
  submitter: ModerationSubmitter | null;
};

export type PendingPriceUpdateProposal = PriceUpdateProposal & {
  offer: BeerOfferWithLocation;
  submitter: ModerationSubmitter | null;
};

export type ModerationAction = "approve" | "reject" | "delete" | "edit";

export type ModerationContentType =
  | "location"
  | "brand"
  | "style"
  | "variant"
  | "offer"
  | "price_update"
  | "review";

// Per-content-type audit detail shapes
export type BrandAuditDetails = {
  name?: string;
  previousName?: string;
};

export type StyleAuditDetails = {
  name?: string;
  previousName?: string;
};

export type LocationAuditDetails = {
  name?: string;
  locationType?: string;
  district?: string;
  address?: string;
  previousName?: string;
  previousLocationType?: string;
  previousDistrict?: string;
  previousAddress?: string;
  fields?: string[];
};

export type VariantAuditDetails = {
  name?: string;
  brand?: string;
  style?: string;
  previousName?: string;
  previousStyle?: string;
  fields?: string[];
};

export type OfferAuditDetails = {
  variant?: string;
  brand?: string;
  location?: string;
  style?: string;
  sizeMl?: number;
  serving?: string;
  priceEur?: number;
  priceCents?: number;
  previousPriceEur?: number;
};

export type PriceUpdateAuditDetails = {
  variant?: string;
  brand?: string;
  location?: string;
  proposedPriceEur?: number;
  currentPriceEur?: number;
};

export type ReviewAuditDetails = {
  rating?: number;
  title?: string | null;
  author?: string;
  locationName?: string;
  fields?: string[];
};

export type AuditDetailsMap = {
  brand: BrandAuditDetails;
  style: StyleAuditDetails;
  location: LocationAuditDetails;
  variant: VariantAuditDetails;
  offer: OfferAuditDetails;
  price_update: PriceUpdateAuditDetails;
  review: ReviewAuditDetails;
};

export type AuditDetails = AuditDetailsMap[ModerationContentType];

export type ModerationAuditLogEntry = {
  id: string;
  moderatorId: string | null;
  moderatorName: string;
  currentModeratorName: string | null;
  action: ModerationAction;
  contentType: ModerationContentType;
  contentId: string;
  details: string | null;
  createdAt: Date;
};

export type ModerationReview = ReviewWithAuthor & {
  locationName: string;
};
