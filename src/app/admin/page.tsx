import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import { Breadcrumbs } from "@/components/breadcrumbs";
import styles from "./admin.module.css";

export default async function AdminPage() {
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  if (authUser.role !== "admin") {
    redirect("/");
  }

  return (
    <main className={styles.page}>
      <Breadcrumbs crumbs={[{ label: "Back to offer directory", href: "/" }]} />

      <section className={styles.panel}>
        <h1>Admin</h1>
        <p>
          Signed in as <strong>{authUser.displayName}</strong> (admin).
        </p>
      </section>

      <section className={styles.panel}>
        <h2>Tools</h2>
        <ul className={styles.list} style={{ marginTop: "0.5rem" }}>
          <li className={styles.item}>
            <h3>Moderation Queue</h3>
            <p>Review pending submissions, manage reviews, and view the audit log.</p>
            <Link href="/moderation">Go to Moderation →</Link>
          </li>
          <li className={styles.item}>
            <h3>User Management</h3>
            <p>Assign roles for contributors, moderators, and admins.</p>
            <Link href="/admin/users">Go to Users →</Link>
          </li>
          <li className={styles.item}>
            <h3>Brand Management</h3>
            <p>Edit or delete beer brands in the catalog.</p>
            <Link href="/admin/brands">Go to Brands →</Link>
          </li>
          <li className={styles.item}>
            <h3>Style Management</h3>
            <p>Create, rename, or delete beer styles in the catalog.</p>
            <Link href="/admin/styles">Go to Styles →</Link>
          </li>
          <li className={styles.item}>
            <h3>Variant Management</h3>
            <p>Edit or delete beer variants in the catalog.</p>
            <Link href="/admin/variants">Go to Variants →</Link>
          </li>
          <li className={styles.item}>
            <h3>Location Management</h3>
            <p>Edit or delete approved locations.</p>
            <Link href="/admin/locations">Go to Locations →</Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
