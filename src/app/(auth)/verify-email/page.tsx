import Link from "next/link";
import { redirect } from "next/navigation";
import { createSession, verifyEmailToken } from "@/lib/auth";
import styles from "../auth.module.css";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (token) {
    const result = await verifyEmailToken(token);

    if (result) {
      await createSession(result.userId);
      redirect("/");
    }
  }

  return (
    <main className={styles.page}>
      <p>
        <Link href="/">Back to offer directory</Link>
      </p>

      <section className={styles.panel} aria-labelledby="verify-heading">
        <h1 id="verify-heading">Verification Failed</h1>
        <p className={styles.error} role="alert">
          This verification link is invalid or has expired.
        </p>
        <p>
          You can request a new link from the <Link href="/login">sign in page</Link>.
        </p>
      </section>
    </main>
  );
}
