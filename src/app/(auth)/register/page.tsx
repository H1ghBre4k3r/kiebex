import Link from "next/link";
import { getCurrentAuthUser } from "@/lib/auth";
import { RegisterForm } from "./register-form";
import styles from "../auth.module.css";

export default async function RegisterPage() {
  const authUser = await getCurrentAuthUser();

  return (
    <main className={styles.page}>
      <p>
        <Link href="/">Back to offer directory</Link>
      </p>

      <section className={styles.panel} aria-labelledby="register-heading">
        <h1 id="register-heading">Create Account</h1>

        {authUser ? (
          <p className={styles.notice}>You are already signed in as {authUser.displayName}.</p>
        ) : (
          <>
            <p>Create an account to submit locations, offers, and reviews.</p>
            <RegisterForm />
          </>
        )}
      </section>
    </main>
  );
}
