"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { jsonInit, requestApi } from "@/lib/client-api";
import styles from "../auth.module.css";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setErrorMessage(null);

    const result = await requestApi<null>(
      "/api/v1/auth/reset-password",
      jsonInit("POST", { body: { token, password } }),
      "Unable to reset your password. Please try again.",
    );

    if (!result.ok) {
      setErrorMessage(result.message);
      setPending(false);
      return;
    }

    setDone(true);
    setPending(false);

    // Redirect to login after a short delay so the user can read the success notice.
    setTimeout(() => {
      router.push("/login");
    }, 2500);
  }

  if (done) {
    return (
      <>
        <p className={styles.notice} role="status">
          Your password has been reset. Redirecting you to the sign in page...
        </p>
        <p>
          <Link href="/login">Sign in now</Link>
        </p>
      </>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field} htmlFor="reset-password">
        New Password
        <input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      {errorMessage && (
        <p className={styles.error} role="alert" aria-live="polite">
          {errorMessage}
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? "Resetting..." : "Set New Password"}
        </button>
      </div>
    </form>
  );
}
