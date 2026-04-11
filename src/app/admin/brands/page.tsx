import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import { getBeerBrands } from "@/lib/query";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BrandsManagement } from "./brands-management";
import styles from "./brands.module.css";

export default async function AdminBrandsPage() {
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  if (authUser.role !== "admin") {
    redirect("/");
  }

  const brands = await getBeerBrands();

  return (
    <main className={styles.page}>
      <Breadcrumbs
        crumbs={[
          { label: "Back to offer directory", href: "/" },
          { label: "Admin Hub", href: "/admin" },
        ]}
      />

      <section className={styles.panel}>
        <h1>Brand Management</h1>
        <p>Edit or delete beer brands in the catalog.</p>
        <p className={styles.notice}>
          Signed in as <strong>{authUser.displayName}</strong> (admin).
        </p>
      </section>

      <section className={styles.panel}>
        <h2>All Brands ({brands.length})</h2>
        <BrandsManagement
          brands={brands.map((b) => ({ id: b.id, name: b.name, status: b.status }))}
        />
      </section>
    </main>
  );
}
