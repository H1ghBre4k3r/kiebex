import "dotenv/config";

process.env.KBI_CAPTURE_DIRECTORY_SQL ??= "true";

import { randomUUID } from "node:crypto";
import { runWithContext } from "@/lib/request-context";

type QueryModule = typeof import("@/lib/query");

type Scenario = {
  name: string;
  run: (query: QueryModule) => Promise<void>;
};

function printSection(title: string): void {
  console.log(`\n### ${title}`);
}

async function buildScenarios(query: QueryModule): Promise<Scenario[]> {
  const [brands, variants, styles, locations, sizes] = await Promise.all([
    query.getBeerBrands(),
    query.getBeerVariants(),
    query.getBeerStyles(),
    query.getLocations(),
    query.getDistinctApprovedOfferSizes(),
  ]);

  const scenarios: Scenario[] = [
    {
      name: "No filters, default sort, page 1",
      run: async ({ getBeerOffersPage }) => {
        await getBeerOffersPage({}, 1);
      },
    },
    {
      name: "Price descending sort, page 1",
      run: async ({ getBeerOffersPage }) => {
        await getBeerOffersPage({ sort: "price_desc" }, 1);
      },
    },
  ];

  const brand = brands[0];
  if (brand) {
    scenarios.push({
      name: `Brand-only filter (${brand.name})`,
      run: async ({ getBeerOffersPage }) => {
        await getBeerOffersPage({ brandId: [brand.id] }, 1);
      },
    });
  }

  const variant = variants[0];
  if (variant) {
    scenarios.push({
      name: `Variant-only filter (${variant.name})`,
      run: async ({ getBeerOffersPage }) => {
        await getBeerOffersPage({ variantId: [variant.id] }, 1);
      },
    });
  }

  const style = styles[0];
  if (style) {
    scenarios.push({
      name: `Style-only filter (${style.name})`,
      run: async ({ getBeerOffersPage }) => {
        await getBeerOffersPage({ styleId: [style.id] }, 1);
      },
    });
  }

  const locationType = locations[0]?.locationType;
  if (locationType) {
    scenarios.push({
      name: `Location-type-only filter (${locationType})`,
      run: async ({ getBeerOffersPage }) => {
        await getBeerOffersPage({ locationType: [locationType] }, 1);
      },
    });
  }

  if (variant && sizes[0]) {
    scenarios.push({
      name: `Representative multi-filter (${variant.name}, ${sizes[0]} ml)`,
      run: async ({ getBeerOffersPage }) => {
        await getBeerOffersPage(
          {
            brandId: [variant.brandId],
            variantId: [variant.id],
            styleId: [variant.styleId],
            sizeMl: [sizes[0]],
            sort: "price_desc",
          },
          1,
        );
      },
    });
  }

  scenarios.push({
    name: "Distinct approved offer sizes",
    run: async ({ getDistinctApprovedOfferSizes }) => {
      await getDistinctApprovedOfferSizes();
    },
  });

  return scenarios;
}

async function main(): Promise<void> {
  const query = await import("@/lib/query");

  printSection("Directory Query SQL Capture");
  console.log(`KBI_CAPTURE_DIRECTORY_SQL=${process.env.KBI_CAPTURE_DIRECTORY_SQL}`);

  const scenarios = await buildScenarios(query);

  await runWithContext(
    {
      requestId: `capture-directory-sql-${randomUUID()}`,
    },
    async () => {
      for (const scenario of scenarios) {
        printSection(scenario.name);
        await scenario.run(query);
      }
    },
  );

  printSection("Capture Complete");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
