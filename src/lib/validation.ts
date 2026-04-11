import { z } from "zod";

const servingTypes = ["tap", "bottle", "can"] as const;
const locationTypes = ["pub", "bar", "restaurant", "supermarket"] as const;
const moderationStatuses = ["approved", "rejected"] as const;
const userRoles = ["user", "moderator", "admin"] as const;
const reviewStatuses = ["approved", "rejected"] as const;
const sortOrders = ["price_asc", "price_desc"] as const;

export const beerQuerySchema = z.object({
  brandId: z.array(z.string().trim().min(1).max(100)).optional(),
  variantId: z.array(z.string().trim().min(1).max(100)).optional(),
  styleId: z.array(z.string().trim().min(1).max(100)).optional(),
  sizeMl: z.array(z.coerce.number().int().positive().max(2000)).optional(),
  serving: z.array(z.enum(servingTypes)).optional(),
  locationType: z.array(z.enum(locationTypes)).optional(),
  locationId: z.array(z.string().trim().min(1).max(100)).optional(),
  sort: z.enum(sortOrders).optional(),
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

export const createReviewBodySchema = z.object({
  locationId: z.string().trim().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(120).optional(),
  body: z.string().trim().min(1).max(1500).optional(),
});

export const reviewModerationDecisionSchema = z.object({
  status: z.enum(reviewStatuses),
});

export const reviewQuerySchema = z.object({
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

function allValues(value: SearchValue): string[] | undefined {
  const arr = Array.isArray(value) ? value : value !== undefined ? [value] : [];
  const compact = arr.map((v) => v.trim()).filter((v) => v.length > 0);
  return compact.length > 0 ? compact : undefined;
}

function getAllParam(params: URLSearchParams, key: string): string[] | undefined {
  const values = params
    .getAll(key)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  return values.length > 0 ? values : undefined;
}

export function parseBeerQueryRecord(
  record: Record<string, SearchValue>,
): ReturnType<typeof beerQuerySchema.safeParse> {
  return beerQuerySchema.safeParse({
    brandId: allValues(record.brandId),
    variantId: allValues(record.variantId),
    styleId: allValues(record.styleId),
    sizeMl: allValues(record.sizeMl),
    serving: allValues(record.serving),
    locationType: allValues(record.locationType),
    locationId: allValues(record.locationId),
    sort: compactString(firstValue(record.sort)),
  });
}

export function parseBeerQueryParams(
  searchParams: URLSearchParams,
): ReturnType<typeof beerQuerySchema.safeParse> {
  return beerQuerySchema.safeParse({
    brandId: getAllParam(searchParams, "brandId"),
    variantId: getAllParam(searchParams, "variantId"),
    styleId: getAllParam(searchParams, "styleId"),
    sizeMl: getAllParam(searchParams, "sizeMl"),
    serving: getAllParam(searchParams, "serving"),
    locationType: getAllParam(searchParams, "locationType"),
    locationId: getAllParam(searchParams, "locationId"),
    sort: compactString(searchParams.get("sort") ?? undefined),
  });
}

export function parseReviewQueryParams(
  searchParams: URLSearchParams,
): ReturnType<typeof reviewQuerySchema.safeParse> {
  return reviewQuerySchema.safeParse({
    locationId: compactString(searchParams.get("locationId") ?? undefined),
  });
}

export const resendVerificationBodySchema = z.object({
  email: z.string().trim().email().max(255),
});

export const updateProfileBodySchema = z
  .object({
    displayName: z.string().trim().min(2).max(80).optional(),
    currentPassword: z.string().min(1).max(128).optional(),
    newPassword: z
      .string()
      .min(8)
      .max(128)
      .regex(/[A-Za-z]/, "Password must include at least one letter.")
      .regex(/[0-9]/, "Password must include at least one number.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.displayName && !data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field to update is required.",
      });
    }

    if (data.newPassword && !data.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentPassword"],
        message: "Current password is required to set a new password.",
      });
    }
  });

export const updateReviewBodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(120).nullable().optional(),
  body: z.string().trim().min(1).max(1500).nullable().optional(),
});

export const editModerationLocationBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    locationType: z.enum(locationTypes).optional(),
    district: z.string().trim().min(2).max(80).optional(),
    address: z.string().trim().min(5).max(200).optional(),
  })
  .refine((data) => data.name ?? data.locationType ?? data.district ?? data.address, {
    message: "At least one field to update is required.",
  });

export const editModerationOfferBodySchema = z.object({
  priceCents: z.number().int().positive().max(50000),
});

export const editModerationReviewBodySchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().trim().min(1).max(120).nullable().optional(),
    body: z.string().trim().min(1).max(1500).nullable().optional(),
  })
  .refine(
    (data) => data.rating !== undefined || data.title !== undefined || data.body !== undefined,
    {
      message: "At least one field to update is required.",
    },
  );

export const editAdminBrandBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const editAdminVariantBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    styleId: z.string().min(1).optional(),
  })
  .refine((data) => data.name !== undefined || data.styleId !== undefined, {
    message: "At least one field to update is required.",
  });

export const createAdminStyleBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const editAdminStyleBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export const changeEmailBodySchema = z.object({
  newEmail: z.string().trim().email().max(255),
  currentPassword: z.string().min(1).max(128),
});
