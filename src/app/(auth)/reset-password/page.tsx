import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";
import styles from "../auth.module.css";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  return (
    <main className={styles.page}>
      <p>
        <Link href="/login">Back to Sign In</Link>
      </p>

      <section className={styles.panel} aria-labelledby="reset-password-heading">
        <h1 id="reset-password-heading">Set New Password</h1>

        {!token ? (
          <>
            <p className={styles.error} role="alert">
              This password reset link is invalid or missing a token.
            </p>
            <p>
              <Link href="/forgot-password">Request a new reset link</Link>
            </p>
          </>
        ) : (
          <>
            <p>Enter your new password below.</p>
            <ResetPasswordForm token={token} />
          </>
        )}
      </section>
    </main>
  );
}
