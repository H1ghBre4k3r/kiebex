import Link from "next/link";
import { formatDate, formatEur, servingLabel, locationTypeLabel } from "@/lib/display";
import type { BeerOfferWithLocation, LocationReviewSummary, OfferPriceHistory } from "@/lib/types";
import styles from "./offer-display.module.css";

function formatReviewSummary(summary?: LocationReviewSummary): string {
  if (!summary || summary.reviewCount === 0 || summary.averageRating === null) {
    return "No reviews";
  }

  return `${summary.averageRating.toFixed(1)}/5 (${summary.reviewCount})`;
}

export function OfferSummary({
  offer,
  reviewSummary,
  showLocationLink = true,
}: {
  offer: BeerOfferWithLocation;
  reviewSummary?: LocationReviewSummary | null;
  showLocationLink?: boolean;
}) {
  return (
    <div>
      <div className={styles.offerHead}>
        <h3 className={styles.offerTitle}>
          {offer.brand} {offer.variant}
        </h3>
        <p className={styles.price}>{formatEur(offer.priceEur)}</p>
      </div>

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
          <dd>{servingLabel(offer.serving)}</dd>
        </div>
        {showLocationLink && (
          <>
            <div>
              <dt>Location</dt>
              <dd>
                <Link href={`/locations/${offer.location.id}`} prefetch={false}>
                  {offer.location.name}
                </Link>
              </dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{locationTypeLabel(offer.location.locationType)}</dd>
            </div>
            {reviewSummary !== undefined && (
              <div>
                <dt>Reviews</dt>
                <dd>{formatReviewSummary(reviewSummary ?? undefined)}</dd>
              </div>
            )}
          </>
        )}
      </dl>
    </div>
  );
}

export function LocationOfferSummary({
  offer,
  history,
}: {
  offer: BeerOfferWithLocation;
  history: OfferPriceHistory[];
}) {
  return (
    <div className={styles.offerCard}>
      <OfferSummary offer={offer} showLocationLink={false} />

      <div className={styles.historySection}>
        <p className={styles.historyTitle}>History ({history.length})</p>
        {history.length > 0 ? (
          <ul className={styles.historyList}>
            {history.map((entry) => (
              <li key={entry.id} className={styles.historyItem}>
                <div className={styles.historyMeta}>
                  <p>{formatEur(entry.priceEur)}</p>
                  <p>{formatDate(entry.effectiveAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontSize: "0.75rem", color: "var(--ink-muted)" }}>No price history yet.</p>
        )}
      </div>
    </div>
  );
}
