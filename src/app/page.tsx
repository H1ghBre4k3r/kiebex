import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentAuthUser } from "@/lib/auth";
import {
  getBeerOffers,
  getLocations,
  getServingLabel,
  locationTypeLabel,
  formatEur,
} from "@/lib/query";
import { parseBeerQueryRecord } from "@/lib/validation";
import styles from "./page.module.css";

type SearchValue = string | string[] | undefined;

const LOCATION_TYPES = ["pub", "bar", "restaurant", "supermarket"] as const;
const SERVING_TYPES = ["tap", "bottle", "can"] as const;

function firstValue(value: SearchValue): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchValue>>;
}) {
  const rawSearchParams = await searchParams;
  const parsedQuery = parseBeerQueryRecord(rawSearchParams);
  const query = parsedQuery.success ? parsedQuery.data : {};

  const offers = await getBeerOffers(query);
  const allOffers = await getBeerOffers();
  const locations = await getLocations();
  const authUser = await getCurrentAuthUser();

  const brands = [...new Set(allOffers.map((offer) => offer.brand))].sort((a, b) =>
    a.localeCompare(b, "en-US"),
  );
  const variants = [...new Set(allOffers.map((offer) => offer.variant))].sort((a, b) =>
    a.localeCompare(b, "en-US"),
  );
  const sizes = [...new Set(allOffers.map((offer) => offer.sizeMl))].sort((a, b) => a - b);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Public Price Tracker</p>
        <h1>Kiel Beer Index</h1>
        <p>
          Compare beer prices across pubs, bars, restaurants, and supermarkets in Kiel. Filter by
          brand, beer style, serving, and size to find the best offer quickly.
        </p>
        <div className={styles.authRow}>
          {authUser ? (
            <>
              <p className={styles.authStatus}>Signed in as {authUser.displayName}</p>
              <div className={styles.authLinks}>
                <Link href="/contribute" className={styles.authLink}>
                  Contribute
                </Link>
                <LogoutButton className={styles.authButton} />
              </div>
            </>
          ) : (
            <>
              <p className={styles.authStatus}>Contributors can add and review offers.</p>
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
        <section className={styles.panel} aria-labelledby="filter-heading">
          <h2 id="filter-heading">Filter Offers</h2>

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

          <form className={styles.filters} method="get">
            <label>
              Brand
              <select name="brand" defaultValue={firstValue(rawSearchParams.brand)}>
                <option value="">Any</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Variant
              <select name="variant" defaultValue={firstValue(rawSearchParams.variant)}>
                <option value="">Any</option>
                {variants.map((variant) => (
                  <option key={variant} value={variant}>
                    {variant}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Size (ml)
              <select name="sizeMl" defaultValue={firstValue(rawSearchParams.sizeMl)}>
                <option value="">Any</option>
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {size} ml
                  </option>
                ))}
              </select>
            </label>

            <label>
              Serving
              <select name="serving" defaultValue={firstValue(rawSearchParams.serving)}>
                <option value="">Any</option>
                {SERVING_TYPES.map((serving) => (
                  <option key={serving} value={serving}>
                    {getServingLabel(serving)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Location Type
              <select name="locationType" defaultValue={firstValue(rawSearchParams.locationType)}>
                <option value="">Any</option>
                {LOCATION_TYPES.map((locationType) => (
                  <option key={locationType} value={locationType}>
                    {locationTypeLabel(locationType)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Location
              <select name="locationId" defaultValue={firstValue(rawSearchParams.locationId)}>
                <option value="">Any</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.actions}>
              <button type="submit">Apply Filters</button>
              <Link href="/" className={styles.resetLink}>
                Clear
              </Link>
            </div>
          </form>
        </section>

        <section className={styles.panel} aria-labelledby="results-heading">
          <h2 id="results-heading">Offers ({offers.length})</h2>

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
                      <p className={styles.cheapest}>Lowest price in current result</p>
                    )}

                    <dl className={styles.meta}>
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
                    </dl>
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
