"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import styles from "../auth.module.css";

type ApiErrorBody = {
  status?: "error";
  error?: {
    message?: string;
  };
};

export function RegisterForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setErrorMessage(body?.error?.message ?? "Unable to create account. Please try again.");
        setPending(false);
        return;
      }

      setSubmittedEmail(email);
      setSubmitted(true);
    } catch {
      setErrorMessage("Unable to create account. Please try again.");
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div>
        <p className={styles.notice}>
          A verification email has been sent to <strong>{submittedEmail}</strong>. Please click the
          link in that email to activate your account.
        </p>
        <p>
          <Link href="/login" className={styles.secondaryLink}>
            Back to Sign In
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field} htmlFor="register-display-name">
        Display Name
        <input
          id="register-display-name"
          name="displayName"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </label>

      <label className={styles.field} htmlFor="register-email">
        Email
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className={styles.field} htmlFor="register-password">
        Password
        <input
          id="register-password"
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

      <p className={styles.notice}>Use at least 8 characters with letters and numbers.</p>

      {errorMessage && (
        <p className={styles.error} role="alert" aria-live="polite">
          {errorMessage}
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? "Creating..." : "Create Account"}
        </button>
        <Link href="/login" className={styles.secondaryLink}>
          Sign In
        </Link>
      </div>
    </form>
  );
}
