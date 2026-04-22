import pg from "pg";

type CleanupTestDataOptions = {
  idPrefixes?: string[];
  namePrefixes?: string[];
  userIds?: string[];
  userEmails?: string[];
};

function unique(values: readonly string[] | undefined): string[] {
  if (!values) {
    return [];
  }

  return [...new Set(values.filter((value) => value.length > 0))];
}

function toStartsWithPatterns(values: readonly string[] | undefined): string[] {
  return unique(values).map((value) => `${value}%`);
}

export function createTestDatabasePool(connectionString = process.env.DATABASE_URL): pg.Pool {
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before running database-backed tests.");
  }

  return new pg.Pool({ connectionString });
}

export async function cleanupTestData(
  pool: pg.Pool,
  options: CleanupTestDataOptions,
): Promise<void> {
  const idPatterns = toStartsWithPatterns(options.idPrefixes);
  const namePatterns = toStartsWithPatterns(options.namePrefixes);
  const userIds = unique(options.userIds);
  const userEmails = unique(options.userEmails);

  await pool.query(
    `DELETE FROM "Report"
     WHERE "contentId" LIKE ANY($1::text[])
        OR "reporterId" LIKE ANY($1::text[])
        OR "resolvedById" LIKE ANY($1::text[])
        OR "snapshotAuthorId" LIKE ANY($1::text[])
        OR "reporterId" = ANY($2::text[])
        OR "resolvedById" = ANY($2::text[])
        OR "snapshotAuthorId" = ANY($2::text[])`,
    [idPatterns, userIds],
  );

  await pool.query(
    `DELETE FROM "ModerationAuditLog"
     WHERE "contentId" LIKE ANY($1::text[])
        OR "moderatorId" LIKE ANY($1::text[])
        OR "moderatorId" = ANY($2::text[])
        OR "moderatorName" LIKE ANY($3::text[])`,
    [idPatterns, userIds, namePatterns],
  );

  await pool.query(
    `DELETE FROM "Review"
     WHERE id LIKE ANY($1::text[])
        OR "locationId" LIKE ANY($1::text[])
        OR "userId" LIKE ANY($1::text[])
        OR "userId" = ANY($2::text[])`,
    [idPatterns, userIds],
  );

  await pool.query(
    `DELETE FROM "OfferPriceHistory"
     WHERE id LIKE ANY($1::text[])
        OR "beerOfferId" LIKE ANY($1::text[])
        OR "priceUpdateProposalId" LIKE ANY($1::text[])`,
    [idPatterns],
  );

  await pool.query(
    `DELETE FROM "PriceUpdateProposal"
     WHERE id LIKE ANY($1::text[])
        OR "beerOfferId" LIKE ANY($1::text[])
        OR "createdById" LIKE ANY($1::text[])
        OR "createdById" = ANY($2::text[])`,
    [idPatterns, userIds],
  );

  await pool.query(
    `DELETE FROM "BeerOffer"
     WHERE id LIKE ANY($1::text[])
        OR "locationId" LIKE ANY($1::text[])
        OR "variantId" LIKE ANY($1::text[])
        OR "createdById" LIKE ANY($1::text[])
        OR "createdById" = ANY($2::text[])
        OR brand LIKE ANY($3::text[])
        OR variant LIKE ANY($3::text[])`,
    [idPatterns, userIds, namePatterns],
  );

  await pool.query(
    `DELETE FROM "BeerVariant"
     WHERE id LIKE ANY($1::text[])
        OR "brandId" LIKE ANY($1::text[])
        OR "styleId" LIKE ANY($1::text[])
        OR "createdById" LIKE ANY($1::text[])
        OR "createdById" = ANY($2::text[])
        OR name LIKE ANY($3::text[])`,
    [idPatterns, userIds, namePatterns],
  );

  await pool.query(
    `DELETE FROM "BeerBrand"
     WHERE id LIKE ANY($1::text[])
        OR "createdById" LIKE ANY($1::text[])
        OR "createdById" = ANY($2::text[])
        OR name LIKE ANY($3::text[])`,
    [idPatterns, userIds, namePatterns],
  );

  await pool.query(
    `DELETE FROM "BeerStyle"
     WHERE id LIKE ANY($1::text[])
        OR name LIKE ANY($2::text[])`,
    [idPatterns, namePatterns],
  );

  await pool.query(
    `DELETE FROM "Location"
     WHERE id LIKE ANY($1::text[])
        OR "createdById" LIKE ANY($1::text[])
        OR "createdById" = ANY($2::text[])
        OR name LIKE ANY($3::text[])`,
    [idPatterns, userIds, namePatterns],
  );

  await pool.query(
    `DELETE FROM "Session"
     WHERE "userId" LIKE ANY($1::text[])
        OR "userId" = ANY($2::text[])`,
    [idPatterns, userIds],
  );
  await pool.query(
    `DELETE FROM "EmailVerificationToken"
     WHERE "userId" LIKE ANY($1::text[])
        OR "userId" = ANY($2::text[])`,
    [idPatterns, userIds],
  );
  await pool.query(
    `DELETE FROM "PasswordResetToken"
     WHERE "userId" LIKE ANY($1::text[])
        OR "userId" = ANY($2::text[])`,
    [idPatterns, userIds],
  );

  await pool.query(
    `DELETE FROM "User"
     WHERE id LIKE ANY($3::text[])
        OR id = ANY($1::text[])
        OR email = ANY($2::text[])
        OR email LIKE ANY($3::text[])
        OR "displayName" LIKE ANY($4::text[])`,
    [userIds, userEmails, idPatterns, namePatterns],
  );
}
