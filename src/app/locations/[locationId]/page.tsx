import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import {
  formatEur,
  getLocationById,
  getLocationOffers,
  getLocationReviews,
  getOfferPriceHistory,
  getServingLabel,
  locationTypeLabel,
} from "@/lib/query";
import { AdminOfferActions } from "@/components/admin-offer-actions";
import { AdminLocationActions } from "./admin-location-actions";
import { OwnReviewActions } from "./own-review-actions";
import { ReviewForm } from "./review-form";
import styles from "./page.module.css";

export default async function LocationPage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  const location = await getLocationById(locationId);

  if (!location) {
    notFound();
  }

  const [offers, reviews, authUser] = await Promise.all([
    getLocationOffers(locationId),
    getLocationReviews(locationId),
    getCurrentAuthUser(),
  ]);
  const historyMap = new Map<string, Awaited<ReturnType<typeof getOfferPriceHistory>>>();

  await Promise.all(
    offers.map(async (offer) => {
      const history = await getOfferPriceHistory(offer.id);
      historyMap.set(offer.id, history);
    }),
  );

  const isModerator = authUser?.role === "moderator" || authUser?.role === "admin";
  const isAdmin = authUser?.role === "admin";

  return (
    <main className={styles.page}>
      <p>
        <Link href="/">Back to all offers</Link>
      </p>

      <header className={styles.header}>
        <h1>{location.name}</h1>
        <p>{location.address}</p>
        <p>
          {locationTypeLabel(location.locationType)} in {location.district}
        </p>

        {isAdmin && <AdminLocationActions location={location} />}
      </header>

      <section aria-labelledby="location-offers-heading" className={styles.panel}>
        <h2 id="location-offers-heading">Offers ({offers.length})</h2>
        {offers.length === 0 ? (
          <p>No offers available for this location yet.</p>
        ) : (
          <ul className={styles.list}>
            {offers.map((offer) => {
              const history = historyMap.get(offer.id) ?? [];

              return (
                <li key={offer.id} className={styles.item}>
                  <h3>
                    {offer.brand} {offer.variant}
                  </h3>
                  <p>{formatEur(offer.priceEur)}</p>
                  <p>{offer.style}</p>
                  <p>
                    {offer.sizeMl} ml - {getServingLabel(offer.serving)}
                  </p>
                  <p>Price history ({history.length})</p>
                  {history.length > 0 ? (
                    <ul>
                      {history.map((entry) => (
                        <li key={entry.id}>
                          <p>{formatEur(entry.priceEur)}</p>
                          <p>{new Date(entry.effectiveAt).toLocaleDateString("en-GB")}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No tracked price history yet.</p>
                  )}

                  {isAdmin && (
                    <AdminOfferActions
                      offerId={offer.id}
                      currentPriceCents={Math.round(offer.priceEur * 100)}
                      className={styles.adminActions}
                      errorClassName={styles.error}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="location-reviews-heading" className={styles.panel}>
        <h2 id="location-reviews-heading">Reviews ({reviews.length})</h2>

        {authUser ? (
          <ReviewForm locationId={location.id} />
        ) : (
          <p>
            <Link href="/login">Sign in</Link> to add a review.
          </p>
        )}

        {reviews.length === 0 ? (
          <p>No reviews yet for this location.</p>
        ) : (
          <ul className={styles.reviewList}>
            {reviews.map((review) => (
              <OwnReviewActions
                key={review.id}
                review={review}
                authUserId={authUser?.id ?? null}
                isModerator={isModerator}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
