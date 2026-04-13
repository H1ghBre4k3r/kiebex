"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { jsonInit, requestApi } from "@/lib/client-api";
import styles from "./contribute.module.css";

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

    const result = await requestApi<null>(
      "/api/v1/beer-brands",
      jsonInit("POST", {
        body: {
          name,
        },
      }),
      "Unable to submit beer brand.",
    );

    if (!result.ok) {
      setErrorMessage(result.message);
    } else {
      setName("");
      setSuccessMessage("Beer brand submitted for moderation.");
      router.refresh();
    }

    setPending(false);
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
