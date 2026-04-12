import Link from "next/link";
import styles from "../auth.module.css";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <main className={styles.page}>
      <p>
        <Link href="/">Back to offer directory</Link>
      </p>

      <section className={styles.panel} aria-labelledby="verify-heading">
        <h1 id="verify-heading">Verification Failed</h1>
        {error === "invalid" && (
          <p className={styles.error} role="alert">
            This verification link is invalid or has expired.
          </p>
        )}
        {error === "expired" && (
          <p className={styles.error} role="alert">
            This verification link has expired.
          </p>
        )}
        {error === "email_conflict" && (
          <p className={styles.error} role="alert">
            The email address you were trying to switch to has already been taken by another
            account.
          </p>
        )}
        <p>
          You can request a new link from the <Link href="/login">sign in page</Link>.
        </p>
      </section>
    </main>
  );
}
