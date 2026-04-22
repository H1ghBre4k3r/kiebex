import { db } from "@/lib/db";
import { clearCurrentSession, createSession, hashPassword } from "@/lib/auth";
import {
  buildCatalogFixture,
  buildUser,
  cleanupTestData,
  createTestDatabasePool,
  createTestNamespace,
  type TestNamespace,
} from "../test";

const resetPool = createTestDatabasePool();

type CatalogFixtureOverrides = NonNullable<Parameters<typeof buildCatalogFixture>[2]>;

export function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function fail(message: string): never {
  throw new Error(message);
}

type SeedAuthUserOptions = {
  id?: string;
  email?: string;
  displayName?: string;
  role?: "user" | "moderator" | "admin";
  emailVerified?: boolean;
  isBanned?: boolean;
  pendingEmail?: string | null;
  password?: string;
};

export async function seedAuthUser(
  namespace: TestNamespace,
  label: string,
  options: SeedAuthUserOptions = {},
): Promise<{ user: ReturnType<typeof buildUser>; password: string }> {
  const password = options.password ?? "Password123!";
  const user = buildUser(namespace, label, {
    ...(options.id !== undefined ? { id: options.id } : {}),
    ...(options.email !== undefined ? { email: options.email } : {}),
    ...(options.displayName !== undefined ? { displayName: options.displayName } : {}),
    ...(options.role !== undefined ? { role: options.role } : {}),
    emailVerified: options.emailVerified ?? true,
    isBanned: options.isBanned ?? false,
    passwordHash: await hashPassword(password),
  });

  await db.user.create({
    data: {
      ...user,
      pendingEmail: options.pendingEmail ?? null,
    },
  });

  return { user, password };
}

export async function startAuthenticatedSession(userId: string): Promise<void> {
  await clearCurrentSession();
  await createSession(userId);
}

export async function cleanupIntegrationData(prefix: string): Promise<void> {
  await cleanupTestData(resetPool, {
    idPrefixes: [prefix],
    namePrefixes: [prefix],
  });
}

export async function closeIntegrationTestResources(): Promise<void> {
  await resetPool.end();
}

export async function seedCatalogFixture(
  namespace: TestNamespace,
  label: string,
  overrides: CatalogFixtureOverrides = {},
) {
  const fixture = buildCatalogFixture(namespace, label, overrides);

  await db.beerStyle.create({ data: fixture.style });
  await db.beerBrand.create({ data: fixture.brand });
  await db.beerVariant.create({ data: fixture.variant });
  await db.location.create({ data: fixture.location });

  if (fixture.offer) {
    await db.beerOffer.create({ data: fixture.offer });
  }

  return fixture;
}

export async function seedCatalogOfferFixture(
  namespace: TestNamespace,
  label: string,
  overrides: Omit<CatalogFixtureOverrides, "offer"> & {
    offer?: Exclude<CatalogFixtureOverrides["offer"], false | undefined>;
  } = {},
) {
  const fixture = await seedCatalogFixture(namespace, label, {
    ...overrides,
    offer: overrides.offer ?? {},
  });

  if (!fixture.offer) {
    throw new Error("Expected catalog fixture to include an offer.");
  }

  return {
    ...fixture,
    offer: fixture.offer,
  };
}

export async function runIntegrationTest(
  name: string,
  fn: (context: { namespace: TestNamespace }) => Promise<void>,
): Promise<void> {
  const namespace = createTestNamespace(name);

  await clearCurrentSession();
  await cleanupIntegrationData(namespace.prefix);

  try {
    await fn({ namespace });
  } finally {
    await clearCurrentSession();
    await cleanupIntegrationData(namespace.prefix);
  }
}
