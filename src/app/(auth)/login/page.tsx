import Link from "next/link";
import { getCurrentAuthUser } from "@/lib/auth";
import { LoginForm } from "./login-form";
import styles from "../auth.module.css";

export default async function LoginPage() {
  const authUser = await getCurrentAuthUser();

  return (
    <main className={styles.page}>
      <p>
        <Link href="/">Back to offer directory</Link>
      </p>

      <section className={styles.panel} aria-labelledby="login-heading">
        <h1 id="login-heading">Sign In</h1>

        {authUser ? (
          <p className={styles.notice}>You are already signed in as {authUser.displayName}.</p>
        ) : (
          <>
            <p>Sign in to start contributing location and offer updates.</p>
            <LoginForm />
          </>
        )}
      </section>
    </main>
  );
}
