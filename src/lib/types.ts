export type ServingType = "tap" | "bottle" | "can";

export type LocationType = "pub" | "bar" | "restaurant" | "supermarket";

export type BeerOffer = {
  id: string;
  brand: string;
  variant: string;
  sizeMl: number;
  serving: ServingType;
  priceEur: number;
  locationId: string;
  status: SubmissionStatus;
  createdById?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
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

export type UserRole = "user" | "moderator" | "admin";

export type User = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  passwordHash?: string | null;
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

export type ReviewStatus = "pending" | "approved" | "rejected";

export type SubmissionStatus = "pending" | "approved" | "rejected";

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

export type BeerOfferWithLocation = BeerOffer & {
  location: Location;
};

export type BeerQuery = {
  brand?: string;
  variant?: string;
  sizeMl?: number;
  serving?: ServingType;
  locationType?: LocationType;
  locationId?: string;
};

export type CreateLocationInput = {
  name: string;
  locationType: LocationType;
  district: string;
  address: string;
  createdById?: string;
  status?: SubmissionStatus;
};

export type CreateBeerOfferInput = {
  brand: string;
  variant: string;
  sizeMl: number;
  serving: ServingType;
  priceCents: number;
  locationId: string;
  createdById?: string;
  status?: SubmissionStatus;
};
