/**
 * Playwright global teardown — removes test users seeded by global-setup.ts.
 */

import "dotenv/config";
import pg from "pg";
import { E2E_AUTH_USER_ID, E2E_UNVERIFIED_USER_ID } from "./global-setup";

export default async function globalTeardown(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return;
  }

  const pool = new pg.Pool({ connectionString });

  try {
    await pool.query(`DELETE FROM "User" WHERE id IN ($1, $2)`, [
      E2E_AUTH_USER_ID,
      E2E_UNVERIFIED_USER_ID,
    ]);
  } finally {
    await pool.end();
  }
}
