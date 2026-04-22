import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminOfferActions } from "@/components/admin-offer-actions";
import { LocationOfferSummary } from "@/components/offer-display";
import { getCurrentAuthUser } from "@/lib/auth";
import { locationTypeLabel } from "@/lib/display";
import {
  getLocationById,
  getLocationOffers,
  getLocationReviews,
  getOfferPriceHistoryBatch,
} from "@/lib/query";
import { AdminLocationActions } from "./admin-location-actions";
import { ReviewsSection } from "./reviews-section";
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
  const historyByOfferId = await getOfferPriceHistoryBatch(offers.map((offer) => offer.id));

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
              const history = historyByOfferId.get(offer.id) ?? [];

              return (
                <li key={offer.id} className={styles.item}>
                  <LocationOfferSummary offer={offer} history={history} />

                  {isAdmin && (
                    <AdminOfferActions
                      offerId={offer.id}
                      currentPriceCents={Math.round(offer.priceEur * 100)}
                      className={styles.adminActions}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="location-reviews-heading" className={styles.panel}>
        <ReviewsSection
          locationId={location.id}
          initialReviews={reviews}
          authUser={authUser ? { id: authUser.id, displayName: authUser.displayName } : null}
          isModerator={isModerator}
        />
      </section>
    </main>
  );
}
