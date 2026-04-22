import { db } from "@/lib/db";
import { createTestNamespace, type TestNamespace } from "../test/factories";

export function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
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

  await cleanupIntegrationData(namespace.prefix);

  try {
    await fn({ namespace });
  } finally {
    await cleanupIntegrationData(namespace.prefix);
  }
}
