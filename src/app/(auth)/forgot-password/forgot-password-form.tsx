"use client";

import { type FormEvent, useState } from "react";
import { jsonInit, requestApi } from "@/lib/client-api";
import styles from "../auth.module.css";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setErrorMessage(null);

    const result = await requestApi<null>(
      "/api/v1/auth/forgot-password",
      jsonInit("POST", { body: { email } }),
      "Unable to send reset email. Please try again.",
    );

    if (!result.ok) {
      setErrorMessage(result.message);
      setPending(false);
      return;
    }

    setSent(true);
    setPending(false);
  }

  if (sent) {
    return (
      <p className={styles.notice} role="status">
        If an account with that email exists, a password reset link has been sent. Please check your
        inbox. The link expires in 1 hour.
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field} htmlFor="forgot-email">
        Email
        <input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      {errorMessage && (
        <p className={styles.error} role="alert" aria-live="polite">
          {errorMessage}
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? "Sending..." : "Send Reset Link"}
        </button>
      </div>
    </form>
  );
}
