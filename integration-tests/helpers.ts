import { db } from "@/lib/db";
import { clearCurrentSession, createSession, hashPassword } from "@/lib/auth";
import { createTestNamespace, type TestNamespace } from "../test/factories";
import { buildUser } from "../test/factories";

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
  await db.report.deleteMany({
    where: {
      OR: [
        { contentId: { startsWith: prefix } },
        { reporterId: { startsWith: prefix } },
        { resolvedById: { startsWith: prefix } },
        { snapshotAuthorId: { startsWith: prefix } },
      ],
    },
  });

  await db.moderationAuditLog.deleteMany({
    where: {
      OR: [
        { contentId: { startsWith: prefix } },
        { moderatorId: { startsWith: prefix } },
        { moderatorName: { startsWith: prefix } },
      ],
    },
  });

  await db.review.deleteMany({
    where: {
      OR: [
        { id: { startsWith: prefix } },
        { locationId: { startsWith: prefix } },
        { userId: { startsWith: prefix } },
      ],
    },
  });

  await db.offerPriceHistory.deleteMany({
    where: {
      OR: [
        { id: { startsWith: prefix } },
        { beerOfferId: { startsWith: prefix } },
        { priceUpdateProposalId: { startsWith: prefix } },
      ],
    },
  });

  await db.priceUpdateProposal.deleteMany({
    where: {
      OR: [
        { id: { startsWith: prefix } },
        { beerOfferId: { startsWith: prefix } },
        { createdById: { startsWith: prefix } },
      ],
    },
  });

  await db.beerOffer.deleteMany({
    where: {
      OR: [
        { id: { startsWith: prefix } },
        { locationId: { startsWith: prefix } },
        { variantId: { startsWith: prefix } },
        { createdById: { startsWith: prefix } },
      ],
    },
  });

  await db.beerVariant.deleteMany({
    where: {
      OR: [
        { id: { startsWith: prefix } },
        { brandId: { startsWith: prefix } },
        { styleId: { startsWith: prefix } },
        { createdById: { startsWith: prefix } },
      ],
    },
  });

  await db.beerBrand.deleteMany({
    where: {
      OR: [
        { id: { startsWith: prefix } },
        { name: { startsWith: prefix } },
        { createdById: { startsWith: prefix } },
      ],
    },
  });

  await db.beerStyle.deleteMany({
    where: {
      OR: [{ id: { startsWith: prefix } }, { name: { startsWith: prefix } }],
    },
  });

  await db.location.deleteMany({
    where: {
      OR: [
        { id: { startsWith: prefix } },
        { name: { startsWith: prefix } },
        { createdById: { startsWith: prefix } },
      ],
    },
  });

  await db.user.deleteMany({
    where: {
      OR: [
        { id: { startsWith: prefix } },
        { email: { startsWith: prefix } },
        { displayName: { startsWith: prefix } },
      ],
    },
  });
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
