import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatEur,
  getLocationById,
  getLocationOffers,
  getServingLabel,
  locationTypeLabel,
} from "@/lib/query";
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

  const offers = await getLocationOffers(locationId);

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
      </header>

      <section aria-labelledby="location-offers-heading" className={styles.panel}>
        <h2 id="location-offers-heading">Offers ({offers.length})</h2>
        {offers.length === 0 ? (
          <p>No offers available for this location yet.</p>
        ) : (
          <ul className={styles.list}>
            {offers.map((offer) => (
              <li key={offer.id} className={styles.item}>
                <h3>
                  {offer.brand} {offer.variant}
                </h3>
                <p>{formatEur(offer.priceEur)}</p>
                <p>
                  {offer.sizeMl} ml - {getServingLabel(offer.serving)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
