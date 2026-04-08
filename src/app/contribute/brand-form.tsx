"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import styles from "./contribute.module.css";

type ApiResponse = {
  status?: "ok" | "error";
  error?: {
    message?: string;
  };
};

export function BrandForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/v1/beer-brands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
        }),
      });

      const body = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        setErrorMessage(body?.error?.message ?? "Unable to submit beer brand.");
        setPending(false);
        return;
      }

      setName("");
      setSuccessMessage("Beer brand submitted for moderation.");
      setPending(false);
      router.refresh();
    } catch {
      setErrorMessage("Unable to submit beer brand.");
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field} htmlFor="brand-name">
        Brand Name
        <input
          id="brand-name"
          name="name"
          type="text"
          required
          minLength={1}
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      {errorMessage && (
        <p className={styles.error} role="alert" aria-live="polite">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className={styles.success} role="status" aria-live="polite">
          {successMessage}
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? "Submitting..." : "Submit Brand"}
        </button>
      </div>
    </form>
  );
}
