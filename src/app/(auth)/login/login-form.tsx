"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { getApiError, jsonRequest } from "@/lib/client-api";
import styles from "../auth.module.css";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setErrorMessage(null);
    setEmailNotVerified(false);
    setResendMessage(null);

    try {
      const response = await fetch("/api/v1/auth/login", {
        ...jsonRequest("POST", { body: { email, password } }),
      });

      if (!response.ok) {
        const { code, message } = await getApiError(
          response,
          "Unable to sign in. Please try again.",
        );

        if (code === "EMAIL_NOT_VERIFIED") {
          setEmailNotVerified(true);
          setErrorMessage("Your email address has not been verified yet.");
        } else {
          setErrorMessage(message);
        }

        setPending(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErrorMessage("Unable to sign in. Please try again.");
      setPending(false);
    }
  }

  async function handleResend() {
    if (resendPending) {
      return;
    }

    setResendPending(true);
    setResendMessage(null);

    try {
      await fetch("/api/v1/auth/resend-verification", {
        ...jsonRequest("POST", { body: { email } }),
      });

      setResendMessage("Verification email resent. Please check your inbox.");
    } catch {
      setResendMessage("Could not resend email. Please try again.");
    } finally {
      setResendPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field} htmlFor="login-email">
        Email
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className={styles.field} htmlFor="login-password">
        Password
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      {errorMessage && (
        <p className={styles.error} role="alert" aria-live="polite">
          {errorMessage}
        </p>
      )}

      {emailNotVerified && !resendMessage && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryLink}
            onClick={handleResend}
            disabled={resendPending}
          >
            {resendPending ? "Sending..." : "Resend Verification Email"}
          </button>
        </div>
      )}

      {resendMessage && (
        <p className={styles.notice} role="status" aria-live="polite">
          {resendMessage}
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? "Signing In..." : "Sign In"}
        </button>
        <Link href="/register" className={styles.secondaryLink}>
          Create Account
        </Link>
      </div>
    </form>
  );
}
