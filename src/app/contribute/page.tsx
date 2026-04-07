import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import { getContributableLocations, locationTypeLabel } from "@/lib/query";
import { LocationForm } from "./location-form";
import { OfferForm } from "./offer-form";
import styles from "./contribute.module.css";

export default async function ContributePage() {
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const locations = await getContributableLocations(authUser.id);
  const locationOptions = locations.map((location) => ({
    id: location.id,
    name: `${location.name} - ${locationTypeLabel(location.locationType)}`,
    locationType: location.locationType,
    status: location.status,
    createdById: location.createdById,
  }));

  return (
    <main className={styles.page}>
      <p>
        <Link href="/">Back to offer directory</Link>
      </p>

      <section className={styles.panel}>
        <h1>Contribute</h1>
        <p>Submit new locations and offers. Submissions are stored as pending until moderated.</p>
        <p className={styles.notice}>
          Signed in as <strong>{authUser.displayName}</strong>. You can submit offers for approved
          locations and for your own pending locations.
        </p>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="submit-location-heading">
          <h2 id="submit-location-heading">Submit Location</h2>
          <LocationForm />
        </section>

        <section className={styles.panel} aria-labelledby="submit-offer-heading">
          <h2 id="submit-offer-heading">Submit Offer</h2>
          {locationOptions.length === 0 ? (
            <p className={styles.notice}>
              No available locations yet. Submit a location first, then add offers for it.
            </p>
          ) : (
            <OfferForm locations={locationOptions} />
          )}
        </section>
      </div>
    </main>
  );
}
