/**
 * Playwright global setup — seeds a verified test user with a known password
 * so that auth lifecycle specs can sign in without relying on email verification.
 *
 * Uses raw pg (no Prisma) to avoid path-alias resolution issues in the Playwright
 * test runner context. Implements the same scrypt hash format as src/lib/auth.ts.
 */

import "dotenv/config";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const scrypt = promisify(scryptCallback);

export const E2E_AUTH_USER_ID = "e2e-auth-test-user";
export const E2E_AUTH_EMAIL = "e2e-auth-test@example.com";
export const E2E_AUTH_PASSWORD = "TestPass123!";
export const E2E_AUTH_DISPLAY_NAME = "E2E Auth Tester";

export const E2E_UNVERIFIED_USER_ID = "e2e-unverified-test-user";
export const E2E_UNVERIFIED_EMAIL = "e2e-unverified@example.com";
export const E2E_UNVERIFIED_PASSWORD = "TestPass123!";
export const E2E_UNVERIFIED_DISPLAY_NAME = "E2E Unverified";

export const E2E_MODERATOR_USER_ID = "e2e-moderator-test-user";
export const E2E_MODERATOR_EMAIL = "e2e-moderator@example.com";
export const E2E_MODERATOR_PASSWORD = "TestPass123!";
export const E2E_MODERATOR_DISPLAY_NAME = "E2E Moderator";

export const E2E_REPORTER_USER_ID = "e2e-reporter-test-user";
export const E2E_REPORTER_EMAIL = "e2e-reporter@example.com";
export const E2E_REPORTER_PASSWORD = "TestPass123!";
export const E2E_REPORTER_DISPLAY_NAME = "E2E Reporter";

export const E2E_USER_IDS = [
  E2E_AUTH_USER_ID,
  E2E_UNVERIFIED_USER_ID,
  E2E_MODERATOR_USER_ID,
  E2E_REPORTER_USER_ID,
] as const;

async function cleanupE2EData(pool: pg.Pool): Promise<void> {
  await pool.query(`DELETE FROM "Report" WHERE "reporterId" = ANY($1::text[])`, [E2E_USER_IDS]);
  await pool.query(`DELETE FROM "ModerationAuditLog" WHERE "moderatorId" = ANY($1::text[])`, [
    E2E_USER_IDS,
  ]);
  await pool.query(`DELETE FROM "Review" WHERE "userId" = ANY($1::text[])`, [E2E_USER_IDS]);
  await pool.query(`DELETE FROM "PriceUpdateProposal" WHERE "createdById" = ANY($1::text[])`, [
    E2E_USER_IDS,
  ]);
  await pool.query(`DELETE FROM "BeerOffer" WHERE "createdById" = ANY($1::text[])`, [E2E_USER_IDS]);
  await pool.query(`DELETE FROM "BeerVariant" WHERE "createdById" = ANY($1::text[])`, [
    E2E_USER_IDS,
  ]);
  await pool.query(`DELETE FROM "BeerBrand" WHERE "createdById" = ANY($1::text[])`, [E2E_USER_IDS]);
  await pool.query(`DELETE FROM "Location" WHERE "createdById" = ANY($1::text[])`, [E2E_USER_IDS]);
  await pool.query(`DELETE FROM "User" WHERE id = ANY($1::text[])`, [E2E_USER_IDS]);
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export default async function globalSetup(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before running E2E tests.");
  }

  const pool = new pg.Pool({ connectionString });

  try {
    await cleanupE2EData(pool);

    const verifiedHash = await hashPassword(E2E_AUTH_PASSWORD);
    const unverifiedHash = await hashPassword(E2E_UNVERIFIED_PASSWORD);
    const moderatorHash = await hashPassword(E2E_MODERATOR_PASSWORD);
    const reporterHash = await hashPassword(E2E_REPORTER_PASSWORD);

    // Verified user — can sign in immediately.
    await pool.query(
      `INSERT INTO "User" (id, email, "displayName", role, "passwordHash", "emailVerified", "isBanned", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'user', $4, true, false, NOW(), NOW())`,
      [E2E_AUTH_USER_ID, E2E_AUTH_EMAIL, E2E_AUTH_DISPLAY_NAME, verifiedHash],
    );

    // Unverified user — login should surface the "email not verified" error.
    await pool.query(
      `INSERT INTO "User" (id, email, "displayName", role, "passwordHash", "emailVerified", "isBanned", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'user', $4, false, false, NOW(), NOW())`,
      [E2E_UNVERIFIED_USER_ID, E2E_UNVERIFIED_EMAIL, E2E_UNVERIFIED_DISPLAY_NAME, unverifiedHash],
    );

    await pool.query(
      `INSERT INTO "User" (id, email, "displayName", role, "passwordHash", "emailVerified", "isBanned", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'moderator', $4, true, false, NOW(), NOW())`,
      [E2E_MODERATOR_USER_ID, E2E_MODERATOR_EMAIL, E2E_MODERATOR_DISPLAY_NAME, moderatorHash],
    );

    await pool.query(
      `INSERT INTO "User" (id, email, "displayName", role, "passwordHash", "emailVerified", "isBanned", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'user', $4, true, false, NOW(), NOW())`,
      [E2E_REPORTER_USER_ID, E2E_REPORTER_EMAIL, E2E_REPORTER_DISPLAY_NAME, reporterHash],
    );
  } finally {
    await pool.end();
  }
}
