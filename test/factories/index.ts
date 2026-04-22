function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type TestNamespace = {
  prefix: string;
  id: (label: string) => string;
  name: (label: string) => string;
  email: (label: string) => string;
};

export function createTestNamespace(scope: string): TestNamespace {
  const safeScope = slugify(scope) || "test";
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const prefix = `itest-${safeScope}-${runId}`;

  return {
    prefix,
    id(label: string) {
      const safeLabel = slugify(label) || "item";
      return `${prefix}-${safeLabel}`;
    },
    name(label: string) {
      return `${prefix}-${label.trim()}`;
    },
    email(label: string) {
      const safeLabel = slugify(label) || "user";
      return `${prefix}-${safeLabel}@example.com`;
    },
  };
}

export function buildUser(
  namespace: TestNamespace,
  label: string,
  overrides: Partial<{
    id: string;
    email: string;
    displayName: string;
    role: "user" | "moderator" | "admin";
    emailVerified: boolean;
    passwordHash: string | null;
    isBanned: boolean;
  }> = {},
) {
  return {
    id: namespace.id(`user-${label}`),
    email: namespace.email(label),
    displayName: namespace.name(label),
    role: "user" as const,
    emailVerified: true,
    passwordHash: null,
    isBanned: false,
    ...overrides,
  };
}

export function buildLocation(
  namespace: TestNamespace,
  label: string,
  overrides: Partial<{
    id: string;
    name: string;
    locationType: "pub" | "bar" | "restaurant" | "supermarket";
    district: string;
    address: string;
    status: "pending" | "approved" | "rejected";
    createdById: string | null;
  }> = {},
) {
  return {
    id: namespace.id(`location-${label}`),
    name: namespace.name(label),
    locationType: "pub" as const,
    district: "Mitte",
    address: `${namespace.name(label)} Street 1`,
    status: "approved" as const,
    createdById: null,
    ...overrides,
  };
}

export function buildBeerStyle(
  namespace: TestNamespace,
  label: string,
  overrides: Partial<{ id: string; name: string }> = {},
) {
  return {
    id: namespace.id(`style-${label}`),
    name: namespace.name(label),
    ...overrides,
  };
}

export function buildBeerBrand(
  namespace: TestNamespace,
  label: string,
  overrides: Partial<{
    id: string;
    name: string;
    status: "pending" | "approved" | "rejected";
    createdById: string | null;
  }> = {},
) {
  return {
    id: namespace.id(`brand-${label}`),
    name: namespace.name(label),
    status: "approved" as const,
    createdById: null,
    ...overrides,
  };
}

export function buildBeerVariant(
  namespace: TestNamespace,
  label: string,
  overrides: Partial<{
    id: string;
    name: string;
    brandId: string;
    styleId: string;
    status: "pending" | "approved" | "rejected";
    createdById: string | null;
  }> = {},
) {
  return {
    id: namespace.id(`variant-${label}`),
    name: namespace.name(label),
    brandId: overrides.brandId ?? namespace.id("brand-default"),
    styleId: overrides.styleId ?? namespace.id("style-default"),
    status: "approved" as const,
    createdById: null,
    ...overrides,
  };
}

export function buildBeerOffer(
  namespace: TestNamespace,
  label: string,
  overrides: Partial<{
    id: string;
    brand: string;
    variant: string;
    variantId: string;
    sizeMl: number;
    serving: "tap" | "bottle" | "can";
    priceCents: number;
    locationId: string;
    status: "pending" | "approved" | "rejected";
    createdById: string | null;
  }> = {},
) {
  return {
    id: namespace.id(`offer-${label}`),
    brand: namespace.name(`Brand ${label}`),
    variant: namespace.name(`Variant ${label}`),
    variantId: overrides.variantId ?? namespace.id("variant-default"),
    sizeMl: 500,
    serving: "tap" as const,
    priceCents: 450,
    locationId: overrides.locationId ?? namespace.id("location-default"),
    status: "approved" as const,
    createdById: null,
    ...overrides,
  };
}

export function buildCatalogFixture(
  namespace: TestNamespace,
  label: string,
  overrides: Partial<{
    style: Parameters<typeof buildBeerStyle>[2];
    brand: Parameters<typeof buildBeerBrand>[2];
    variant: Parameters<typeof buildBeerVariant>[2];
    location: Parameters<typeof buildLocation>[2];
    offer: false | Parameters<typeof buildBeerOffer>[2];
  }> = {},
) {
  const style = buildBeerStyle(namespace, `${label} style`, overrides.style);
  const brand = buildBeerBrand(namespace, `${label} brand`, overrides.brand);
  const variant = buildBeerVariant(namespace, `${label} variant`, {
    brandId: brand.id,
    styleId: style.id,
    ...overrides.variant,
  });
  const location = buildLocation(namespace, `${label} location`, overrides.location);
  const offer =
    overrides.offer === false
      ? undefined
      : buildBeerOffer(namespace, `${label} offer`, {
          brand: brand.name,
          variant: variant.name,
          variantId: variant.id,
          locationId: location.id,
          ...overrides.offer,
        });

  return {
    style,
    brand,
    variant,
    location,
    offer,
  };
}
