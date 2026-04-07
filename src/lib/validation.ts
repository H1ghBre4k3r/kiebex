import { z } from "zod";

const servingTypes = ["tap", "bottle", "can"] as const;
const locationTypes = ["pub", "bar", "restaurant", "supermarket"] as const;
const moderationStatuses = ["approved", "rejected"] as const;
const userRoles = ["user", "moderator", "admin"] as const;

export const beerQuerySchema = z.object({
  brandId: z.string().trim().min(1).max(100).optional(),
  variantId: z.string().trim().min(1).max(100).optional(),
  styleId: z.string().trim().min(1).max(100).optional(),
  sizeMl: z.coerce.number().int().positive().max(2000).optional(),
  serving: z.enum(servingTypes).optional(),
  locationType: z.enum(locationTypes).optional(),
  locationId: z.string().trim().min(1).max(100).optional(),
});

export const registerBodySchema = z.object({
  email: z.string().trim().email().max(255),
  displayName: z.string().trim().min(2).max(80),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, "Password must include at least one letter.")
    .regex(/[0-9]/, "Password must include at least one number."),
});

export const loginBodySchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});

export const createLocationBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  locationType: z.enum(locationTypes),
  district: z.string().trim().min(2).max(80),
  address: z.string().trim().min(5).max(200),
});

export const createBeerBrandBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const createBeerVariantBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  brandId: z.string().trim().min(1).max(100),
  styleId: z.string().trim().min(1).max(100),
});

export const createBeerOfferBodySchema = z.object({
  variantId: z.string().trim().min(1).max(100),
  sizeMl: z.number().int().positive().max(2000),
  serving: z.enum(servingTypes),
  priceCents: z.number().int().positive().max(50000),
  locationId: z.string().trim().min(1).max(100),
});

export const moderationDecisionSchema = z.object({
  status: z.enum(moderationStatuses),
});

export const userRoleUpdateSchema = z.object({
  role: z.enum(userRoles),
});

type SearchValue = string | string[] | undefined;

function firstValue(value: SearchValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function compactString(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseBeerQueryRecord(
  record: Record<string, SearchValue>,
): ReturnType<typeof beerQuerySchema.safeParse> {
  return beerQuerySchema.safeParse({
    brandId: compactString(firstValue(record.brandId)),
    variantId: compactString(firstValue(record.variantId)),
    styleId: compactString(firstValue(record.styleId)),
    sizeMl: compactString(firstValue(record.sizeMl)),
    serving: compactString(firstValue(record.serving)),
    locationType: compactString(firstValue(record.locationType)),
    locationId: compactString(firstValue(record.locationId)),
  });
}

export function parseBeerQueryParams(
  searchParams: URLSearchParams,
): ReturnType<typeof beerQuerySchema.safeParse> {
  return beerQuerySchema.safeParse({
    brandId: compactString(searchParams.get("brandId") ?? undefined),
    variantId: compactString(searchParams.get("variantId") ?? undefined),
    styleId: compactString(searchParams.get("styleId") ?? undefined),
    sizeMl: compactString(searchParams.get("sizeMl") ?? undefined),
    serving: compactString(searchParams.get("serving") ?? undefined),
    locationType: compactString(searchParams.get("locationType") ?? undefined),
    locationId: compactString(searchParams.get("locationId") ?? undefined),
  });
}
