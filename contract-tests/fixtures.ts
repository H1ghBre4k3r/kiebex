import "dotenv/config";

import { createHash } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "../src/generated/prisma/client";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const fixtureIds = {
  user: "contract_user",
  moderator: "contract_moderator",
  admin: "contract_admin",
  style: "contract_style",
  brand: "contract_brand",
  variant: "contract_variant",
  location: "contract_location",
  offer: "contract_offer",
  review: "contract_review",
  report: "contract_report",
  pendingLocation: "contract_pending_location",
  pendingBrand: "contract_pending_brand",
  pendingVariant: "contract_pending_variant",
  pendingOffer: "contract_pending_offer",
  pendingPriceUpdate: "contract_pending_price_update",
  pendingReview: "contract_pending_review",
  pendingReport: "contract_pending_report",
} as const;

export const fixtureCookies = {
  user: "kbi_session=contract_user_session_token",
  moderator: "kbi_session=contract_moderator_session_token",
  admin: "kbi_session=contract_admin_session_token",
} as const;

const sessionTokens = {
  user: "contract_user_session_token",
  moderator: "contract_moderator_session_token",
  admin: "contract_admin_session_token",
} as const;

const fixtureEmails = [
  "contract-user@example.com",
  "contract-moderator@example.com",
  "contract-admin@example.com",
];

let pool: Pool | undefined;
let db: PrismaClient | undefined;

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getDb(): PrismaClient {
  if (!db) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  }

  return db;
}

export async function setupContractFixtures(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed authenticated contract test fixtures.");
  }

  const client = getDb();
  await cleanupContractFixtures();

  await client.user.createMany({
    data: [
      {
        id: fixtureIds.user,
        email: fixtureEmails[0],
        displayName: "Contract User",
        role: "user",
        emailVerified: true,
      },
      {
        id: fixtureIds.moderator,
        email: fixtureEmails[1],
        displayName: "Contract Moderator",
        role: "moderator",
        emailVerified: true,
      },
      {
        id: fixtureIds.admin,
        email: fixtureEmails[2],
        displayName: "Contract Admin",
        role: "admin",
        emailVerified: true,
      },
    ],
  });

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await client.session.createMany({
    data: [
      {
        id: "contract_session_user",
        userId: fixtureIds.user,
        tokenHash: hashSessionToken(sessionTokens.user),
        expiresAt,
      },
      {
        id: "contract_session_moderator",
        userId: fixtureIds.moderator,
        tokenHash: hashSessionToken(sessionTokens.moderator),
        expiresAt,
      },
      {
        id: "contract_session_admin",
        userId: fixtureIds.admin,
        tokenHash: hashSessionToken(sessionTokens.admin),
        expiresAt,
      },
    ],
  });

  await client.beerStyle.create({
    data: { id: fixtureIds.style, name: "Contract Style" },
  });

  await client.beerBrand.createMany({
    data: [
      {
        id: fixtureIds.brand,
        name: "Contract Approved Brand",
        status: "approved",
        createdById: fixtureIds.admin,
      },
      {
        id: fixtureIds.pendingBrand,
        name: "Contract Pending Brand",
        status: "pending",
        createdById: fixtureIds.user,
      },
    ],
  });

  await client.beerVariant.createMany({
    data: [
      {
        id: fixtureIds.variant,
        name: "Contract Approved Variant",
        brandId: fixtureIds.brand,
        styleId: fixtureIds.style,
        status: "approved",
        createdById: fixtureIds.admin,
      },
      {
        id: fixtureIds.pendingVariant,
        name: "Contract Pending Variant",
        brandId: fixtureIds.brand,
        styleId: fixtureIds.style,
        status: "pending",
        createdById: fixtureIds.user,
      },
    ],
  });

  await client.location.createMany({
    data: [
      {
        id: fixtureIds.location,
        name: "Contract Approved Location",
        locationType: "pub",
        district: "Contract District",
        address: "Contract Street 1",
        status: "approved",
        createdById: fixtureIds.admin,
      },
      {
        id: fixtureIds.pendingLocation,
        name: "Contract Pending Location",
        locationType: "bar",
        district: "Contract District",
        address: "Contract Street 2",
        status: "pending",
        createdById: fixtureIds.user,
      },
    ],
  });

  await client.beerOffer.createMany({
    data: [
      {
        id: fixtureIds.offer,
        brand: "Contract Approved Brand",
        variant: "Contract Approved Variant",
        variantId: fixtureIds.variant,
        sizeMl: 500,
        serving: "tap",
        priceCents: 500,
        locationId: fixtureIds.location,
        status: "approved",
        createdById: fixtureIds.admin,
      },
      {
        id: fixtureIds.pendingOffer,
        brand: "Contract Approved Brand",
        variant: "Contract Approved Variant",
        variantId: fixtureIds.variant,
        sizeMl: 330,
        serving: "bottle",
        priceCents: 350,
        locationId: fixtureIds.location,
        status: "pending",
        createdById: fixtureIds.user,
      },
    ],
  });

  await client.offerPriceHistory.create({
    data: {
      id: "contract_offer_price_history",
      beerOfferId: fixtureIds.offer,
      priceCents: 500,
    },
  });

  await client.priceUpdateProposal.create({
    data: {
      id: fixtureIds.pendingPriceUpdate,
      beerOfferId: fixtureIds.offer,
      proposedPriceCents: 575,
      status: "pending",
      createdById: fixtureIds.user,
    },
  });

  await client.review.createMany({
    data: [
      {
        id: fixtureIds.review,
        locationId: fixtureIds.location,
        userId: fixtureIds.user,
        rating: 4,
        title: "Contract Review",
        body: "Contract review body.",
        status: "new",
      },
      {
        id: fixtureIds.pendingReview,
        locationId: fixtureIds.location,
        userId: fixtureIds.user,
        rating: 3,
        title: "Contract Pending Review",
        body: "Contract pending review body.",
        status: "pending",
      },
    ],
  });

  await client.report.createMany({
    data: [
      {
        id: fixtureIds.report,
        reporterId: fixtureIds.user,
        contentType: "review",
        contentId: fixtureIds.review,
        reason: "other",
        note: "Contract report note.",
        status: "open",
        snapshotAuthorId: fixtureIds.user,
        snapshotAuthorName: "Contract User",
        snapshotRating: 4,
        snapshotTitle: "Contract Review",
        snapshotBody: "Contract review body.",
      },
      {
        id: fixtureIds.pendingReport,
        reporterId: fixtureIds.user,
        contentType: "review",
        contentId: fixtureIds.pendingReview,
        reason: "spam",
        note: "Contract pending report note.",
        status: "open",
        snapshotAuthorId: fixtureIds.user,
        snapshotAuthorName: "Contract User",
        snapshotRating: 3,
        snapshotTitle: "Contract Pending Review",
        snapshotBody: "Contract pending review body.",
      },
    ],
  });
}

export async function cleanupContractFixtures(): Promise<void> {
  const client = getDb();

  await client.moderationAuditLog.deleteMany({
    where: {
      OR: [{ id: { startsWith: "contract_" } }, { contentId: { startsWith: "contract_" } }],
    },
  });
  await client.report.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "contract_" } },
        { contentId: { startsWith: "contract_" } },
        { reporterId: { startsWith: "contract_" } },
      ],
    },
  });
  await client.review.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "contract_" } },
        { userId: { startsWith: "contract_" } },
        { locationId: { startsWith: "contract_" } },
      ],
    },
  });
  await client.offerPriceHistory.deleteMany({
    where: {
      OR: [{ id: { startsWith: "contract_" } }, { beerOfferId: { startsWith: "contract_" } }],
    },
  });
  await client.priceUpdateProposal.deleteMany({
    where: {
      OR: [{ id: { startsWith: "contract_" } }, { beerOfferId: { startsWith: "contract_" } }],
    },
  });
  await client.beerOffer.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "contract_" } },
        { createdById: { startsWith: "contract_" } },
        { locationId: { startsWith: "contract_" } },
        { variantId: { startsWith: "contract_" } },
        { brand: { startsWith: "Contract " } },
      ],
    },
  });
  await client.beerVariant.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "contract_" } },
        { createdById: { startsWith: "contract_" } },
        { name: { startsWith: "Contract " } },
      ],
    },
  });
  await client.beerBrand.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "contract_" } },
        { createdById: { startsWith: "contract_" } },
        { name: { startsWith: "Contract " } },
      ],
    },
  });
  await client.beerStyle.deleteMany({
    where: { OR: [{ id: { startsWith: "contract_" } }, { name: { startsWith: "Contract " } }] },
  });
  await client.location.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "contract_" } },
        { createdById: { startsWith: "contract_" } },
        { name: { startsWith: "Contract " } },
      ],
    },
  });
  await client.session.deleteMany({ where: { id: { startsWith: "contract_" } } });
  await client.user.deleteMany({
    where: {
      OR: [{ id: { startsWith: "contract_" } }, { email: { in: fixtureEmails } }],
    },
  });
}

export async function disconnectContractFixtures(): Promise<void> {
  await db?.$disconnect();
  await pool?.end();
  db = undefined;
  pool = undefined;
}
