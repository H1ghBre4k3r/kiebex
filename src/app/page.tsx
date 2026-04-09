import { Suspense } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { AdminOfferActions } from "@/components/admin-offer-actions";
import { getCurrentAuthUser } from "@/lib/auth";
import {
  formatEur,
  getBeerBrands,
  getBeerOffers,
  getBeerStyles,
  getLocationReviewSummaries,
  getBeerVariants,
  getLocations,
  getServingLabel,
  locationTypeLabel,
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

  // Brand chips — removing a brand also removes its variants
  for (const brandId of map.brandId ?? []) {
    const brand = brands.find((b) => b.id === brandId);
    const brandVariantIds = new Set(variants.filter((v) => v.brandId === brandId).map((v) => v.id));
    let nextMap = removeOneValue(map, "brandId", brandId);
    const nextVariants = (nextMap.variantId ?? []).filter((v) => !brandVariantIds.has(v));
    if (nextVariants.length > 0) {
      nextMap = { ...nextMap, variantId: nextVariants };
    } else {
      delete nextMap.variantId;
    }
    chips.push({
      label: `Brand: ${brand?.name ?? brandId}`,
      removeUrl: rawMapToUrl(nextMap),
    });
  }

  // Variant chips
  for (const variantId of map.variantId ?? []) {
    const variant = variants.find((v) => v.id === variantId);
    chips.push({
      label: `Variant: ${variant?.name ?? variantId}`,
      removeUrl: rawMapToUrl(removeOneValue(map, "variantId", variantId)),
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
      label: `Serving: ${getServingLabel(serving as "tap" | "bottle" | "can")}`,
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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const rawSearchParams = await searchParams;
  const parsedQuery = parseBeerQueryRecord(rawSearchParams);
  const query = parsedQuery.success ? parsedQuery.data : {};

  const [offers, allOffers, locations, authUser, brands, stylesList, variants] = await Promise.all([
    getBeerOffers(query),
    getBeerOffers(),
    getLocations(),
    getCurrentAuthUser(),
    getBeerBrands(),
    getBeerStyles(),
    getBeerVariants(),
  ]);

  const reviewSummaryByLocation = await getLocationReviewSummaries([
    ...new Set(offers.map((offer) => offer.location.id)),
  ]);

  const sizes = [...new Set(allOffers.map((offer) => offer.sizeMl))].sort((a, b) => a - b);
  const activeChips = buildActiveChips(rawSearchParams, brands, stylesList, variants, locations);
  const sortDesc = query.sort === "price_desc";

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Public Price Tracker</p>
        <h1>Kiel Beer Index</h1>
        <p>
          Compare beer prices across pubs, bars, restaurants, and supermarkets in Kiel. Filter by
          brand, variant, style, serving, and size to find the best offer quickly.
        </p>
        <div className={styles.authRow}>
          {authUser ? (
            <>
              <p className={styles.authStatus}>Signed in as {authUser.displayName}</p>
              <div className={styles.authLinks}>
                <Link href="/contribute" className={styles.authLink}>
                  Contribute
                </Link>
                <Link href="/profile" className={styles.authLink}>
                  Profile
                </Link>
                {authUser.role === "moderator" && (
                  <Link href="/moderation" className={styles.authLink}>
                    Moderation
                  </Link>
                )}
                {authUser.role === "admin" && (
                  <Link href="/admin" className={styles.authLink}>
                    Admin
                  </Link>
                )}
                <LogoutButton className={styles.authButton} />
              </div>
            </>
          ) : (
            <>
              <p className={styles.authStatus}>Contributors can add offers and location reviews.</p>
              <div className={styles.authLinks}>
                <Link href="/login" className={styles.authLink}>
                  Sign In
                </Link>
                <Link href="/register" className={styles.authLink}>
                  Create Account
                </Link>
              </div>
            </>
          )}
        </div>
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
          <h2 id="results-heading">Offers ({offers.length})</h2>

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
            <ul className={styles.offerList}>
              {offers.map((offer, index) => (
                <li key={offer.id} className={styles.offerItem}>
                  <article>
                    <div className={styles.offerHead}>
                      <h3>
                        {offer.brand} {offer.variant}
                      </h3>
                      <p className={styles.price}>{formatEur(offer.priceEur)}</p>
                    </div>

                    {index === 0 && (
                      <p className={styles.cheapest}>
                        {sortDesc
                          ? "Highest price in current result"
                          : "Lowest price in current result"}
                      </p>
                    )}

                    <dl className={styles.meta}>
                      <div>
                        <dt>Style</dt>
                        <dd>{offer.style}</dd>
                      </div>
                      <div>
                        <dt>Size</dt>
                        <dd>{offer.sizeMl} ml</dd>
                      </div>
                      <div>
                        <dt>Serving</dt>
                        <dd>{getServingLabel(offer.serving)}</dd>
                      </div>
                      <div>
                        <dt>Location</dt>
                        <dd>
                          <Link href={`/locations/${offer.location.id}`}>
                            {offer.location.name}
                          </Link>
                        </dd>
                      </div>
                      <div>
                        <dt>Type</dt>
                        <dd>{locationTypeLabel(offer.location.locationType)}</dd>
                      </div>
                      <div>
                        <dt>Reviews</dt>
                        <dd>
                          {(() => {
                            const summary = reviewSummaryByLocation.get(offer.location.id);

                            if (
                              !summary ||
                              summary.reviewCount === 0 ||
                              summary.averageRating === null
                            ) {
                              return "No reviews";
                            }

                            return `${summary.averageRating.toFixed(1)}/5 (${summary.reviewCount})`;
                          })()}
                        </dd>
                      </div>
                    </dl>

                    {authUser?.role === "admin" && (
                      <AdminOfferActions
                        offerId={offer.id}
                        currentPriceCents={Math.round(offer.priceEur * 100)}
                        className={styles.adminActions}
                        buttonClassName={undefined}
                        errorClassName={styles.adminError}
                      />
                    )}
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
