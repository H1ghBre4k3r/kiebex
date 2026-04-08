import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { ProfileForm } from "./profile-form";
import styles from "../auth.module.css";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentAuthUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className={styles.page}>
      <p>
        <Link href="/">Back to offer directory</Link>
      </p>

      <section className={styles.panel} aria-labelledby="profile-heading">
        <h1 id="profile-heading">Your Profile</h1>
        <p>
          Signed in as <strong>{user.email}</strong> &middot; Role: {user.role}
        </p>
        <div className={styles.actions}>
          <LogoutButton className={styles.secondaryLink} />
        </div>
      </section>

      <ProfileForm initialDisplayName={user.displayName} />
    </main>
  );
}
