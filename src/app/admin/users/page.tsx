import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import { getUsersForAdmin } from "@/lib/query";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { UsersManagement } from "./users-management";
import styles from "./users.module.css";

export default async function AdminUsersPage() {
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  if (authUser.role !== "admin") {
    redirect("/");
  }

  const users = await getUsersForAdmin();

  return (
    <main className={styles.page}>
      <Breadcrumbs
        crumbs={[
          { label: "Back to offer directory", href: "/" },
          { label: "Admin Hub", href: "/admin" },
        ]}
      />

      <section className={styles.panel}>
        <h1>User Management</h1>
        <p>Assign roles for contributors, moderators, and admins.</p>
        <p className={styles.notice}>
          Signed in as <strong>{authUser.displayName}</strong> (admin).
        </p>
      </section>

      <UsersManagement
        currentAdminId={authUser.id}
        users={users.map((user) => ({
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
