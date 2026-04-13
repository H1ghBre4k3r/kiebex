import { requireAdminPageUser } from "@/lib/page-auth";
import { getAllBeerVariantsForAdmin, getBeerBrands, getBeerStyles } from "@/lib/query";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { VariantsManagement } from "./variants-management";
import styles from "./variants.module.css";

export default async function AdminVariantsPage() {
  const authUser = await requireAdminPageUser();

  const [variants, beerStyles, brands] = await Promise.all([
    getAllBeerVariantsForAdmin(),
    getBeerStyles(),
    getBeerBrands(),
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
        <h1>Variant Management</h1>
        <p>Edit or delete beer variants in the catalog.</p>
        <p className={styles.notice}>
          Signed in as <strong>{authUser.displayName}</strong> (admin).
        </p>
      </section>

      <section className={styles.panel}>
        <h2>All Variants ({variants.length})</h2>
        <VariantsManagement
          variants={variants.map((v) => ({
            id: v.id,
            name: v.name,
            brandId: v.brandId,
            styleId: v.styleId,
            status: v.status,
            brandName: v.brand?.name ?? "Unknown",
            styleName: v.style?.name ?? "Unknown",
          }))}
          beerStyles={beerStyles.map((s) => ({ id: s.id, name: s.name }))}
          brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        />
      </section>
    </main>
  );
}
