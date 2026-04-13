import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";
import styles from "../auth.module.css";

export default function ForgotPasswordPage() {
  return (
    <main className={styles.page}>
      <p>
        <Link href="/login">Back to Sign In</Link>
      </p>

      <section className={styles.panel} aria-labelledby="forgot-password-heading">
        <h1 id="forgot-password-heading">Forgot Password</h1>
        <p>
          Enter your email address and we will send you a link to reset your password. The link
          expires after 1 hour.
        </p>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
