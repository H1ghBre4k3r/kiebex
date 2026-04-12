import { requireAdminPageUser } from "@/lib/page-auth";
import { getAllBeerStylesForAdmin } from "@/lib/query";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { StylesManagement } from "./styles-management";
import styles from "./styles.module.css";

export default async function AdminStylesPage() {
  const authUser = await requireAdminPageUser();

  const beerStyles = await getAllBeerStylesForAdmin();

  return (
    <main className={styles.page}>
      <Breadcrumbs
        crumbs={[
          { label: "Back to offer directory", href: "/" },
          { label: "Admin Hub", href: "/admin" },
        ]}
      />

      <section className={styles.panel}>
        <h1>Style Management</h1>
        <p>Create, rename, or delete beer styles. Styles in use by variants cannot be deleted.</p>
        <p className={styles.notice}>
          Signed in as <strong>{authUser.displayName}</strong> (admin).
        </p>
      </section>

      <section className={styles.panel}>
        <h2>All Styles ({beerStyles.length})</h2>
        <StylesManagement
          beerStyles={beerStyles.map((s) => ({
            id: s.id,
            name: s.name,
            variantCount: s.variantCount,
          }))}
        />
      </section>
    </main>
  );
}
