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
    // Remove any leftover test users from a previous run.
    await pool.query(`DELETE FROM "User" WHERE id IN ($1, $2)`, [
      E2E_AUTH_USER_ID,
      E2E_UNVERIFIED_USER_ID,
    ]);

    const verifiedHash = await hashPassword(E2E_AUTH_PASSWORD);
    const unverifiedHash = await hashPassword(E2E_UNVERIFIED_PASSWORD);

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
  } finally {
    await pool.end();
  }
}
