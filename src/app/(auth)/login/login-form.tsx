"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { jsonInit, requestApi } from "@/lib/client-api";
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

    const result = await requestApi<null>(
      "/api/v1/auth/login",
      jsonInit("POST", { body: { email, password } }),
      "Unable to sign in. Please try again.",
    );

    if (!result.ok) {
      if (result.code === "EMAIL_NOT_VERIFIED") {
        setEmailNotVerified(true);
        setErrorMessage("Your email address has not been verified yet.");
      } else {
        setErrorMessage(result.message);
      }

      setPending(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleResend() {
    if (resendPending) {
      return;
    }

    setResendPending(true);
    setResendMessage(null);

    const result = await requestApi<null>(
      "/api/v1/auth/resend-verification",
      jsonInit("POST", { body: { email } }),
      "Could not resend email. Please try again.",
    );

    if (result.ok) {
      setResendMessage("Verification email resent. Please check your inbox.");
    } else {
      setResendMessage(result.message);
    }

    setResendPending(false);
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
