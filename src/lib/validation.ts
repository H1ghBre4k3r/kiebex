import { z } from "zod";

const servingTypes = ["tap", "bottle", "can"] as const;
const locationTypes = ["pub", "bar", "restaurant", "supermarket"] as const;

export const beerQuerySchema = z.object({
  brand: z.string().trim().min(1).max(80).optional(),
  variant: z.string().trim().min(1).max(80).optional(),
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
    brand: compactString(firstValue(record.brand)),
    variant: compactString(firstValue(record.variant)),
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
    brand: compactString(searchParams.get("brand") ?? undefined),
    variant: compactString(searchParams.get("variant") ?? undefined),
    sizeMl: compactString(searchParams.get("sizeMl") ?? undefined),
    serving: compactString(searchParams.get("serving") ?? undefined),
    locationType: compactString(searchParams.get("locationType") ?? undefined),
    locationId: compactString(searchParams.get("locationId") ?? undefined),
  });
}
