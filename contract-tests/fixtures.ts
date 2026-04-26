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
}

export async function cleanupContractFixtures(): Promise<void> {
  const client = getDb();

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
