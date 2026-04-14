import { requireModeratorPageUser } from "@/lib/page-auth";
import {
  getAllReviewsForModeration,
  getModerationAuditLog,
  getOpenReports,
  getResolvedReports,
  getPendingBeerBrandSubmissions,
  getPendingBeerOfferSubmissions,
  getPendingBeerVariantSubmissions,
  getPendingLocationSubmissions,
  getPendingPriceUpdateProposals,
} from "@/lib/query";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ModerationClient } from "./moderation-client";
import styles from "./moderation.module.css";

export default async function ModerationPage() {
  const authUser = await requireModeratorPageUser();

  const [
    pendingLocations,
    pendingBrands,
    pendingVariants,
    pendingOffers,
    pendingPriceUpdates,
    allReviews,
    openReports,
    resolvedReports,
    auditLog,
  ] = await Promise.all([
    getPendingLocationSubmissions(),
    getPendingBeerBrandSubmissions(),
    getPendingBeerVariantSubmissions(),
    getPendingBeerOfferSubmissions(),
    getPendingPriceUpdateProposals(),
    getAllReviewsForModeration(),
    getOpenReports(),
    getResolvedReports(),
    getModerationAuditLog(15),
  ]);

  const newReviews = allReviews.filter((r) => r.status === "new" || r.status === "pending");
  const approvedReviews = allReviews.filter((r) => r.status === "approved");

  return (
    <main className={styles.page}>
      <Breadcrumbs
        crumbs={[
          { label: "Back to offer directory", href: "/" },
          ...(authUser.role === "admin" ? [{ label: "Admin Hub", href: "/admin" }] : []),
        ]}
      />

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
        newReviews={newReviews}
        approvedReviews={approvedReviews}
        openReports={openReports}
        resolvedReports={resolvedReports}
        auditLog={auditLog}
      />
    </main>
  );
}
