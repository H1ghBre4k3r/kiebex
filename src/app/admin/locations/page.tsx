import { requireAdminPageUser } from "@/lib/page-auth";
import { getLocations } from "@/lib/query";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { LocationsManagement } from "./locations-management";
import styles from "./locations.module.css";

export default async function AdminLocationsPage() {
  const authUser = await requireAdminPageUser();

  const locations = await getLocations();

  return (
    <main className={styles.page}>
      <Breadcrumbs
        crumbs={[
          { label: "Back to offer directory", href: "/" },
          { label: "Admin Hub", href: "/admin" },
        ]}
      />

      <section className={styles.panel}>
        <h1>Location Management</h1>
        <p>Edit or delete approved locations.</p>
        <p className={styles.notice}>
          Signed in as <strong>{authUser.displayName}</strong> (admin).
        </p>
      </section>

      <section className={styles.panel}>
        <h2>All Locations ({locations.length})</h2>
        <LocationsManagement
          locations={locations.map((l) => ({
            id: l.id,
            name: l.name,
            locationType: l.locationType,
            district: l.district,
            address: l.address,
            status: l.status,
          }))}
        />
      </section>
    </main>
  );
}
