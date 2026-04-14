import { Suspense } from "react";
import Link from "next/link";
import { AdminOfferActions } from "@/components/admin-offer-actions";
import { UserOfferActions } from "@/components/offer-user-actions";
import { OfferSummary } from "@/components/offer-display";
import { getCurrentAuthUser } from "@/lib/auth";
import { servingLabel, locationTypeLabel } from "@/lib/display";
import {
  getBeerBrands,
  getBeerOffers,
  getBeerOffersPage,
  BEER_OFFERS_PAGE_SIZE,
  getBeerStyles,
  getLocationReviewSummaries,
  getBeerVariants,
  getLocations,
} from "@/lib/query";
import { parseBeerQueryRecord } from "@/lib/validation";
import type { BeerBrand, BeerStyle, BeerVariant, Location } from "@/lib/types";
import { FilterPanel } from "./filter-panel";
import styles from "./page.module.css";

type SearchValue = string | string[] | undefined;

type RawMap = Record<string, string[]>;

function toRawMap(raw: Record<string, SearchValue>): RawMap {
  const map: RawMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      const compact = value.filter(Boolean);
      if (compact.length > 0) map[key] = compact;
    } else if (value) {
      map[key] = [value];
    }
  }
  return map;
}

function rawMapToUrl(map: RawMap): string {
  const params = new URLSearchParams();
  for (const [key, values] of Object.entries(map)) {
    for (const value of values) {
      params.append(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

function removeOneValue(map: RawMap, key: string, value: string): RawMap {
  const next = { ...map };
  next[key] = (next[key] ?? []).filter((v) => v !== value);
  if (next[key].length === 0) delete next[key];
  return next;
}

type ActiveChip = { label: string; removeUrl: string };

function buildActiveChips(
  raw: Record<string, SearchValue>,
  brands: BeerBrand[],
  stylesList: BeerStyle[],
  variants: BeerVariant[],
  locations: Location[],
): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const map = toRawMap(raw);

  // Brand chips
  for (const brandId of map.brandId ?? []) {
    const brand = brands.find((b) => b.id === brandId);
    chips.push({
      label: `Brand: ${brand?.name ?? brandId}`,
      removeUrl: rawMapToUrl(removeOneValue(map, "brandId", brandId)),
    });
  }

  // Variant chips — group by name so "Pils" (3 IDs) produces one chip, not three
  const selectedVariantIds = new Set(map.variantId ?? []);
  const variantChipGroups = new Map<string, string[]>();
  for (const variant of variants) {
    if (selectedVariantIds.has(variant.id)) {
      const existing = variantChipGroups.get(variant.name) ?? [];
      variantChipGroups.set(variant.name, [...existing, variant.id]);
    }
  }
  for (const [name, ids] of variantChipGroups.entries()) {
    let nextMap = map;
    for (const id of ids) {
      nextMap = removeOneValue(nextMap, "variantId", id);
    }
    chips.push({
      label: `Variant: ${name}`,
      removeUrl: rawMapToUrl(nextMap),
    });
  }

  // Style chips
  for (const styleId of map.styleId ?? []) {
    const style = stylesList.find((s) => s.id === styleId);
    chips.push({
      label: `Style: ${style?.name ?? styleId}`,
      removeUrl: rawMapToUrl(removeOneValue(map, "styleId", styleId)),
    });
  }

  // Size chips
  for (const sizeMl of map.sizeMl ?? []) {
    chips.push({
      label: `Size: ${sizeMl} ml`,
      removeUrl: rawMapToUrl(removeOneValue(map, "sizeMl", sizeMl)),
    });
  }

  // Serving chips
  for (const serving of map.serving ?? []) {
    chips.push({
      label: `Serving: ${servingLabel(serving as "tap" | "bottle" | "can")}`,
      removeUrl: rawMapToUrl(removeOneValue(map, "serving", serving)),
    });
  }

  // Location type chips
  for (const locationType of map.locationType ?? []) {
    chips.push({
      label: `Type: ${locationTypeLabel(locationType as "pub" | "bar" | "restaurant" | "supermarket")}`,
      removeUrl: rawMapToUrl(removeOneValue(map, "locationType", locationType)),
    });
  }

  // Location chips
  for (const locationId of map.locationId ?? []) {
    const location = locations.find((l) => l.id === locationId);
    chips.push({
      label: `Location: ${location?.name ?? locationId}`,
      removeUrl: rawMapToUrl(removeOneValue(map, "locationId", locationId)),
    });
  }

  // Sort chip — only when not the default
  const sort = (map.sort ?? [])[0];
  if (sort && sort !== "price_asc") {
    chips.push({
      label: "Sort: Price High to Low",
      removeUrl: rawMapToUrl(removeOneValue(map, "sort", sort)),
    });
  }

  return chips;
}

function buildPageUrl(raw: Record<string, SearchValue>, targetPage: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (key === "page") continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else if (value) {
      params.append(key, value);
    }
  }
  if (targetPage > 1) params.set("page", String(targetPage));
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const rawSearchParams = await searchParams;
  const parsedQuery = parseBeerQueryRecord(rawSearchParams);
  const query = parsedQuery.success ? parsedQuery.data : {};

  const rawPage = rawSearchParams.page;
  const page = Math.max(
    1,
    parseInt(String(Array.isArray(rawPage) ? rawPage[0] : (rawPage ?? "1")), 10) || 1,
  );

  const [pageResult, allOffers, locations, authUser, brands, stylesList, variants] =
    await Promise.all([
      getBeerOffersPage(query, page),
      getBeerOffers(),
      getLocations(),
      getCurrentAuthUser(),
      getBeerBrands(),
      getBeerStyles(),
      getBeerVariants(),
    ]);

  const { offers, total } = pageResult;
  const totalPages = Math.ceil(total / BEER_OFFERS_PAGE_SIZE);

  const reviewSummaryByLocation = await getLocationReviewSummaries([
    ...new Set(offers.map((offer) => offer.location.id)),
  ]);

  const sizes = [...new Set(allOffers.map((offer) => offer.sizeMl))].sort((a, b) => a - b);
  const activeChips = buildActiveChips(rawSearchParams, brands, stylesList, variants, locations);
  const sortDesc = query.sort === "price_desc";

  const approvedBrands = brands
    .filter((b) => b.status === "approved")
    .map((b) => ({ id: b.id, name: b.name }));
  const approvedVariants = variants
    .filter((v) => v.status === "approved")
    .map((v) => ({ id: v.id, name: v.name, brandId: v.brandId }));

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Public Price Tracker</p>
        <h1>Kiel Beer Index</h1>
        <p>
          Compare beer prices across pubs, bars, restaurants, and supermarkets in Kiel. Filter by
          brand, variant, style, serving, and size to find the best offer quickly.
        </p>
      </header>

      <main className={styles.main}>
        <Suspense
          fallback={
            <section className={styles.panel} aria-labelledby="filter-heading">
              <h2 id="filter-heading">Filter Offers</h2>
            </section>
          }
        >
          <FilterPanel
            brands={brands.map((b) => ({ id: b.id, name: b.name }))}
            variants={variants.map((v) => ({ id: v.id, name: v.name, brandId: v.brandId }))}
            stylesList={stylesList.map((s) => ({ id: s.id, name: s.name }))}
            sizes={sizes}
            locations={locations.map((l) => ({ id: l.id, name: l.name }))}
          />
        </Suspense>

        <section className={styles.panel} aria-labelledby="results-heading">
          <h2 id="results-heading">Offers ({total})</h2>

          {!parsedQuery.success && (
            <div className={styles.errorBox} role="alert" aria-live="polite">
              <p>Some filters were invalid and ignored:</p>
              <ul>
                {parsedQuery.error.issues.map((issue) => (
                  <li key={`${issue.path.join(".")}-${issue.code}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          )}

          {activeChips.length > 0 && (
            <div className={styles.chips} aria-label="Active filters">
              {activeChips.map((chip) => (
                <Link key={chip.label} href={chip.removeUrl} className={styles.chip}>
                  {chip.label} <span aria-hidden="true">×</span>
                </Link>
              ))}
              {activeChips.length > 1 && (
                <Link href="/" className={styles.chipClear}>
                  Clear all ×
                </Link>
              )}
            </div>
          )}

          {offers.length === 0 ? (
            <p className={styles.emptyState}>
              No offers match your current filter set. Try broadening your search.
            </p>
          ) : (
            <>
              <ul className={styles.offerList}>
                {offers.map((offer, index) => (
                  <li key={offer.id} className={styles.offerItem}>
                    <article>
                      <OfferSummary
                        offer={offer}
                        reviewSummary={reviewSummaryByLocation.get(offer.location.id) ?? null}
                      />

                      {index === 0 && (
                        <p className={styles.cheapest}>
                          {sortDesc
                            ? "Highest price in current result"
                            : "Lowest price in current result"}
                        </p>
                      )}

                      {authUser?.role === "admin" && (
                        <AdminOfferActions
                          offerId={offer.id}
                          currentPriceCents={Math.round(offer.priceEur * 100)}
                          className={styles.adminActions}
                        />
                      )}
                      {authUser && authUser.role !== "admin" && (
                        <UserOfferActions
                          offer={offer}
                          brands={approvedBrands}
                          variants={approvedVariants}
                        />
                      )}
                    </article>
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <nav className={styles.pagination} aria-label="Offer pages">
                  {page > 1 ? (
                    <Link
                      href={buildPageUrl(rawSearchParams, page - 1)}
                      className={styles.pageLink}
                    >
                      &larr; Prev
                    </Link>
                  ) : (
                    <span className={styles.pageLinkDisabled}>&larr; Prev</span>
                  )}
                  <span className={styles.pageInfo}>
                    Page {page} of {totalPages}
                  </span>
                  {page < totalPages ? (
                    <Link
                      href={buildPageUrl(rawSearchParams, page + 1)}
                      className={styles.pageLink}
                    >
                      Next &rarr;
                    </Link>
                  ) : (
                    <span className={styles.pageLinkDisabled}>Next &rarr;</span>
                  )}
                </nav>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
