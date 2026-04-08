import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import { getUsersForAdmin } from "@/lib/query";
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
      <p>
        <Link href="/">Back to offer directory</Link>
      </p>

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
          createdAt: user.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
