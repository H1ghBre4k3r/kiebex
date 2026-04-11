// Idempotent admin seeding script.
// Runs after `prisma migrate deploy` in the migration Job.
//
// Reads ADMIN_EMAIL and ADMIN_PASSWORD from the environment and creates an
// admin user if none exists yet. On every subsequent run the existing admin is
// detected and the script exits without making any changes — so rotating the
// secret value has no effect after the first deployment. Password changes must
// go through the application's profile UI.
//
// Password hashing mirrors src/lib/auth.ts exactly:
//   format: scrypt$<hex-salt>$<hex-derived-key>
//   params: N=16384 r=8 p=1 keylen=64  (Node crypto defaults)

import { randomBytes, randomUUID, scrypt as _scrypt } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const scrypt = promisify(_scrypt);
const { Client } = pg;

const { DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log("ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin seed.");
  process.exit(0);
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(key).toString("hex")}`;
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query(`SELECT id FROM "User" WHERE role = 'admin' LIMIT 1`);

    if (rows.length > 0) {
      console.log("Admin user already exists — skipping seed.");
      return;
    }

    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    const email = ADMIN_EMAIL.trim().toLowerCase();

    await client.query(
      `INSERT INTO "User" (id, email, "displayName", role, "passwordHash", "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, 'Admin', 'admin', $3, true, NOW(), NOW())`,
      [randomUUID(), email, passwordHash],
    );

    console.log(`Admin user created: ${email}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Admin seed failed:", err);
  process.exit(1);
});
