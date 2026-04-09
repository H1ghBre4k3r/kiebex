import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import {
  getAllReviewsForModeration,
  getModerationAuditLog,
  getPendingBeerBrandSubmissions,
  getPendingBeerOfferSubmissions,
  getPendingBeerVariantSubmissions,
  getPendingLocationSubmissions,
  getPendingPriceUpdateProposals,
} from "@/lib/query";
import { ModerationClient } from "./moderation-client";
import styles from "./moderation.module.css";

export default async function ModerationPage() {
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  if (authUser.role !== "moderator" && authUser.role !== "admin") {
    redirect("/");
  }

  const [
    pendingLocations,
    pendingBrands,
    pendingVariants,
    pendingOffers,
    pendingPriceUpdates,
    allReviews,
    auditLog,
  ] = await Promise.all([
    getPendingLocationSubmissions(),
    getPendingBeerBrandSubmissions(),
    getPendingBeerVariantSubmissions(),
    getPendingBeerOfferSubmissions(),
    getPendingPriceUpdateProposals(),
    getAllReviewsForModeration(),
    getModerationAuditLog(50),
  ]);

  return (
    <main className={styles.page}>
      <p>
        <Link href="/">Back to offer directory</Link>
      </p>

      <section className={styles.panel}>
        <h1>Moderation Queue</h1>
        <p>
          Review pending submissions for locations, beer catalog entries, offers, and price updates.
        </p>
        <p className={styles.notice}>
          Signed in as <strong>{authUser.displayName}</strong> ({authUser.role}).
        </p>
      </section>

      <ModerationClient
        pendingLocations={pendingLocations}
        pendingBrands={pendingBrands}
        pendingVariants={pendingVariants}
        pendingOffers={pendingOffers}
        pendingPriceUpdates={pendingPriceUpdates}
        allReviews={allReviews}
        auditLog={auditLog}
      />
    </main>
  );
}
