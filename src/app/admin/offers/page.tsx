import { requireAdminPageUser } from "@/lib/page-auth";
import { getBeerBrands, getBeerOffers, getBeerVariants, getLocations } from "@/lib/query";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OffersManagement } from "./offers-management";
import styles from "./offers.module.css";

export default async function AdminOffersPage() {
  const authUser = await requireAdminPageUser();

  const [offers, locations, brands, variants] = await Promise.all([
    getBeerOffers(),
    getLocations(),
    getBeerBrands(),
    getBeerVariants(),
  ]);

  return (
    <main className={styles.page}>
      <Breadcrumbs
        crumbs={[
          { label: "Back to offer directory", href: "/" },
          { label: "Admin Hub", href: "/admin" },
        ]}
      />

      <section className={styles.panel}>
        <h1>Offer Management</h1>
        <p>Create and delete approved offers in the catalog.</p>
        <p className={styles.notice}>
          Signed in as <strong>{authUser.displayName}</strong> (admin).
        </p>
      </section>

      <section className={styles.panel}>
        <h2>All Approved Offers ({offers.length})</h2>
        <OffersManagement
          offers={offers.map((o) => ({
            id: o.id,
            brand: o.brand,
            variant: o.variant,
            style: o.style,
            sizeMl: o.sizeMl,
            serving: o.serving,
            priceEur: o.priceEur,
            locationId: o.locationId,
            locationName: o.location.name,
          }))}
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
          brands={brands.map((b) => ({ id: b.id, name: b.name }))}
          variants={variants.map((v) => ({ id: v.id, name: v.name, brandId: v.brandId }))}
        />
      </section>
    </main>
  );
}
