import Link from "next/link";
import { formatDate, formatEur, getServingLabel, locationTypeLabel } from "@/lib/display";
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
}: {
  offer: BeerOfferWithLocation;
  reviewSummary?: LocationReviewSummary;
}) {
  return (
    <>
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
          <dd>{getServingLabel(offer.serving)}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>
            <Link href={`/locations/${offer.location.id}`}>{offer.location.name}</Link>
          </dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{locationTypeLabel(offer.location.locationType)}</dd>
        </div>
        {reviewSummary !== undefined && (
          <div>
            <dt>Reviews</dt>
            <dd>{formatReviewSummary(reviewSummary)}</dd>
          </div>
        )}
      </dl>
    </>
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
      <OfferSummary offer={offer} />

      <div>
        <p>Price history ({history.length})</p>
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
          <p>No tracked price history yet.</p>
        )}
      </div>
    </div>
  );
}
