/**
 * Playwright global teardown — removes test users seeded by global-setup.ts.
 */

import "dotenv/config";
import pg from "pg";
import { E2E_DYNAMIC_USER_EMAILS, E2E_USER_IDS } from "./global-setup";

export default async function globalTeardown(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return;
  }

  const pool = new pg.Pool({ connectionString });

  try {
    await pool.query(`DELETE FROM "Report" WHERE "reporterId" = ANY($1::text[])`, [E2E_USER_IDS]);
    await pool.query(`DELETE FROM "ModerationAuditLog" WHERE "moderatorId" = ANY($1::text[])`, [
      E2E_USER_IDS,
    ]);
    await pool.query(`DELETE FROM "Review" WHERE "userId" = ANY($1::text[])`, [E2E_USER_IDS]);
    await pool.query(`DELETE FROM "PriceUpdateProposal" WHERE "createdById" = ANY($1::text[])`, [
      E2E_USER_IDS,
    ]);
    await pool.query(`DELETE FROM "BeerOffer" WHERE "createdById" = ANY($1::text[])`, [
      E2E_USER_IDS,
    ]);
    await pool.query(`DELETE FROM "BeerVariant" WHERE "createdById" = ANY($1::text[])`, [
      E2E_USER_IDS,
    ]);
    await pool.query(`DELETE FROM "BeerBrand" WHERE "createdById" = ANY($1::text[])`, [
      E2E_USER_IDS,
    ]);
    await pool.query(`DELETE FROM "Location" WHERE "createdById" = ANY($1::text[])`, [
      E2E_USER_IDS,
    ]);
    await pool.query(`DELETE FROM "User" WHERE email = ANY($1::text[])`, [E2E_DYNAMIC_USER_EMAILS]);
    await pool.query(`DELETE FROM "User" WHERE id = ANY($1::text[])`, [E2E_USER_IDS]);
  } finally {
    await pool.end();
  }
}
