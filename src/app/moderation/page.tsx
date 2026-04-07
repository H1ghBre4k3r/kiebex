import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import { getPendingBeerOfferSubmissions, getPendingLocationSubmissions } from "@/lib/query";
import { ModerationClient } from "./moderation-client";
import styles from "./moderation.module.css";

export default async function ModerationPage() {
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  if (authUser.role !== "moderator" && authUser.role !== "admin") {
    redirect("/");
  }

  const [pendingLocations, pendingOffers] = await Promise.all([
    getPendingLocationSubmissions(),
    getPendingBeerOfferSubmissions(),
  ]);

  return (
    <main className={styles.page}>
      <p>
        <Link href="/">Back to offer directory</Link>
      </p>

      <section className={styles.panel}>
        <h1>Moderation Queue</h1>
        <p>Review pending location and offer submissions from the community.</p>
        <p className={styles.notice}>
          Signed in as <strong>{authUser.displayName}</strong> ({authUser.role}).
        </p>
      </section>

      <ModerationClient pendingLocations={pendingLocations} pendingOffers={pendingOffers} />
    </main>
  );
}
