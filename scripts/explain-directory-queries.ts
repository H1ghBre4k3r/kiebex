import "dotenv/config";

import { Pool } from "pg";

type ExplainCase = {
  title: string;
  sql: string;
  params: unknown[];
};

type RepresentativeInputs = {
  brandId: string;
  brandName: string;
  variantId: string;
  variantName: string;
  variantBrandId: string;
  variantStyleId: string;
  styleId: string;
  styleName: string;
  locationType: string;
  sizeMl: number;
};

const APPROVED_SUBMISSION = "approved";
const PAGE_SIZE = 20;

function printSection(title: string): void {
  console.log(`\n### ${title}`);
}

function buildOffersJoinWhereClause(filterClause?: string): string {
  const clauses = [
    '"public"."BeerOffer"."status" = CAST($1::text AS "public"."SubmissionStatus")',
    '"j0"."status" = CAST($2::text AS "public"."SubmissionStatus") AND ("j0"."id" IS NOT NULL)',
    '"j1"."status" = CAST($3::text AS "public"."SubmissionStatus") AND ("j2"."status" = CAST($4::text AS "public"."SubmissionStatus") AND ("j2"."id" IS NOT NULL)) AND ("j1"."id" IS NOT NULL)',
  ];

  if (filterClause) {
    clauses.push(filterClause);
  }

  return clauses.join(" AND ");
}

function buildCountSql(filterClause?: string, offsetParamIndex = 5): string {
  return `
SELECT COUNT(*) AS "_count$_all"
FROM (
  SELECT "public"."BeerOffer"."id"
  FROM "public"."BeerOffer"
  LEFT JOIN "public"."Location" AS "j0"
    ON ("j0"."id") = ("public"."BeerOffer"."locationId")
  LEFT JOIN "public"."BeerVariant" AS "j1"
    ON ("j1"."id") = ("public"."BeerOffer"."variantId")
  LEFT JOIN "public"."BeerBrand" AS "j2"
    ON ("j2"."id") = ("j1"."brandId")
  WHERE ${buildOffersJoinWhereClause(filterClause)}
  OFFSET $${offsetParamIndex}
) AS "sub"
`.trim();
}

function buildPageSql(orderByClause: string, filterClause?: string, limitParamIndex = 5): string {
  const offsetParamIndex = limitParamIndex + 1;

  return `
SELECT
  "public"."BeerOffer"."id",
  "public"."BeerOffer"."brand",
  "public"."BeerOffer"."variant",
  "public"."BeerOffer"."variantId",
  "public"."BeerOffer"."sizeMl",
  "public"."BeerOffer"."serving"::text,
  "public"."BeerOffer"."priceCents",
  "public"."BeerOffer"."locationId",
  "public"."BeerOffer"."status"::text,
  "public"."BeerOffer"."createdById",
  "public"."BeerOffer"."createdAt",
  "public"."BeerOffer"."updatedAt"
FROM "public"."BeerOffer"
LEFT JOIN "public"."Location" AS "j0"
  ON ("j0"."id") = ("public"."BeerOffer"."locationId")
LEFT JOIN "public"."BeerVariant" AS "j1"
  ON ("j1"."id") = ("public"."BeerOffer"."variantId")
LEFT JOIN "public"."BeerBrand" AS "j2"
  ON ("j2"."id") = ("j1"."brandId")
WHERE ${buildOffersJoinWhereClause(filterClause)}
ORDER BY ${orderByClause}
LIMIT $${limitParamIndex}
OFFSET $${offsetParamIndex}
`.trim();
}

function buildDistinctSizesSql(): string {
  return `
SELECT "public"."BeerOffer"."id", "public"."BeerOffer"."sizeMl"
FROM "public"."BeerOffer"
LEFT JOIN "public"."Location" AS "j0"
  ON ("j0"."id") = ("public"."BeerOffer"."locationId")
LEFT JOIN "public"."BeerVariant" AS "j1"
  ON ("j1"."id") = ("public"."BeerOffer"."variantId")
LEFT JOIN "public"."BeerBrand" AS "j2"
  ON ("j2"."id") = ("j1"."brandId")
WHERE ${buildOffersJoinWhereClause()}
ORDER BY "public"."BeerOffer"."sizeMl" ASC
OFFSET $5
`.trim();
}

async function getRepresentativeInputs(pool: Pool): Promise<RepresentativeInputs> {
  const [brandResult, variantResult, styleResult, locationResult, sizeResult] = await Promise.all([
    pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM "public"."BeerBrand" WHERE status = $1 ORDER BY name ASC LIMIT 1`,
      [APPROVED_SUBMISSION],
    ),
    pool.query<{ id: string; name: string; brandId: string; styleId: string }>(
      `
        SELECT bv.id, bv.name, bv."brandId", bv."styleId"
        FROM "public"."BeerVariant" bv
        WHERE bv.status = $1
        ORDER BY bv.name ASC
        LIMIT 1
      `,
      [APPROVED_SUBMISSION],
    ),
    pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM "public"."BeerStyle" ORDER BY name ASC LIMIT 1`,
      [],
    ),
    pool.query<{ locationType: string }>(
      `
        SELECT "locationType"::text AS "locationType"
        FROM "public"."Location"
        WHERE status = $1
        ORDER BY name ASC
        LIMIT 1
      `,
      [APPROVED_SUBMISSION],
    ),
    pool.query<{ sizeMl: number }>(
      `
        SELECT DISTINCT bo."sizeMl"
        FROM "public"."BeerOffer" bo
        INNER JOIN "public"."Location" l ON l.id = bo."locationId" AND l.status = $1
        INNER JOIN "public"."BeerVariant" bv ON bv.id = bo."variantId" AND bv.status = $2
        INNER JOIN "public"."BeerBrand" bb ON bb.id = bv."brandId" AND bb.status = $3
        WHERE bo.status = $4
        ORDER BY bo."sizeMl" ASC
        LIMIT 1
      `,
      [APPROVED_SUBMISSION, APPROVED_SUBMISSION, APPROVED_SUBMISSION, APPROVED_SUBMISSION],
    ),
  ]);

  const brand = brandResult.rows[0];
  const variant = variantResult.rows[0];
  const style = styleResult.rows[0];
  const location = locationResult.rows[0];
  const size = sizeResult.rows[0];

  if (!brand || !variant || !style || !location || !size) {
    throw new Error("Could not load representative inputs for EXPLAIN capture.");
  }

  return {
    brandId: brand.id,
    brandName: brand.name,
    variantId: variant.id,
    variantName: variant.name,
    variantBrandId: variant.brandId,
    variantStyleId: variant.styleId,
    styleId: style.id,
    styleName: style.name,
    locationType: location.locationType,
    sizeMl: size.sizeMl,
  };
}

function buildExplainCases(inputs: RepresentativeInputs): ExplainCase[] {
  const baseParams = [
    APPROVED_SUBMISSION,
    APPROVED_SUBMISSION,
    APPROVED_SUBMISSION,
    APPROVED_SUBMISSION,
  ];

  return [
    {
      title: "No filters, default sort, count",
      sql: buildCountSql(),
      params: [...baseParams, 0],
    },
    {
      title: "No filters, default sort, page",
      sql: buildPageSql('"public"."BeerOffer"."priceCents" ASC'),
      params: [...baseParams, PAGE_SIZE, 0],
    },
    {
      title: "Price descending sort, page",
      sql: buildPageSql('"public"."BeerOffer"."priceCents" DESC'),
      params: [...baseParams, PAGE_SIZE, 0],
    },
    {
      title: `Brand-only filter (${inputs.brandName}), count`,
      sql: buildCountSql('"j1"."brandId" IN ($5)', 6),
      params: [...baseParams, inputs.brandId, 0],
    },
    {
      title: `Brand-only filter (${inputs.brandName}), page`,
      sql: buildPageSql('"public"."BeerOffer"."priceCents" ASC', '"j1"."brandId" IN ($5)', 6),
      params: [...baseParams, inputs.brandId, PAGE_SIZE, 0],
    },
    {
      title: `Variant-only filter (${inputs.variantName}), page`,
      sql: buildPageSql('"public"."BeerOffer"."priceCents" ASC', '"j1"."id" IN ($5)', 6),
      params: [...baseParams, inputs.variantId, PAGE_SIZE, 0],
    },
    {
      title: `Style-only filter (${inputs.styleName}), page`,
      sql: buildPageSql('"public"."BeerOffer"."priceCents" ASC', '"j1"."styleId" IN ($5)', 6),
      params: [...baseParams, inputs.styleId, PAGE_SIZE, 0],
    },
    {
      title: `Location-type-only filter (${inputs.locationType}), page`,
      sql: buildPageSql('"public"."BeerOffer"."priceCents" ASC', '"j0"."locationType" IN (CAST($5::text AS "public"."LocationType"))', 6),
      params: [...baseParams, inputs.locationType, PAGE_SIZE, 0],
    },
    {
      title: `Representative multi-filter (${inputs.variantName}, ${inputs.sizeMl} ml), count`,
      sql: buildCountSql(
        '"public"."BeerOffer"."sizeMl" IN ($5) AND "j1"."id" IN ($6) AND "j1"."brandId" IN ($7) AND "j1"."styleId" IN ($8)',
        9,
      ),
      params: [
        ...baseParams,
        inputs.sizeMl,
        inputs.variantId,
        inputs.variantBrandId,
        inputs.variantStyleId,
        0,
      ],
    },
    {
      title: `Representative multi-filter (${inputs.variantName}, ${inputs.sizeMl} ml), page`,
      sql: buildPageSql(
        '"public"."BeerOffer"."priceCents" DESC',
        '"public"."BeerOffer"."sizeMl" IN ($5) AND "j1"."id" IN ($6) AND "j1"."brandId" IN ($7) AND "j1"."styleId" IN ($8)',
        9,
      ),
      params: [
        ...baseParams,
        inputs.sizeMl,
        inputs.variantId,
        inputs.variantBrandId,
        inputs.variantStyleId,
        PAGE_SIZE,
        0,
      ],
    },
    {
      title: "Distinct approved offer sizes",
      sql: buildDistinctSizesSql(),
      params: [...baseParams, 0],
    },
  ];
}

async function runExplain(pool: Pool, explainCase: ExplainCase): Promise<void> {
  const explainSql = `EXPLAIN (ANALYZE, BUFFERS) ${explainCase.sql}`;
  const result = await pool.query<{ "QUERY PLAN": string }>(explainSql, explainCase.params);

  printSection(explainCase.title);
  for (const row of result.rows) {
    console.log(row["QUERY PLAN"]);
  }
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to capture EXPLAIN plans.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    printSection("Representative Directory Query EXPLAIN");

    const inputs = await getRepresentativeInputs(pool);
    const explainCases = buildExplainCases(inputs);

    for (const explainCase of explainCases) {
      await runExplain(pool, explainCase);
    }

    printSection("EXPLAIN Complete");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
