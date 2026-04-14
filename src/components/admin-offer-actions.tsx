"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { jsonInit, requestApi } from "@/lib/client-api";
import styles from "./admin-offer-actions.module.css";

type Props = {
  offerId: string;
  currentPriceCents: number;
  /** Optional: called after a successful delete (e.g. to redirect) */
  onDeleted?: () => void;
  /** CSS class applied to the outer wrapper div; defaults to the component's built-in flex layout */
  className?: string;
};

export function AdminOfferActions({ offerId, currentPriceCents, onDeleted, className }: Props) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [priceInput, setPriceInput] = useState((currentPriceCents / 100).toFixed(2));
  const [savePending, setSavePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (savePending) {
      return;
    }

    const priceCents = Math.round(parseFloat(priceInput) * 100);

    if (isNaN(priceCents) || priceCents <= 0 || priceCents > 50000) {
      setErrorMessage("Price must be between €0.01 and €500.00.");
      return;
    }

    setSavePending(true);
    setErrorMessage(null);

    const result = await requestApi<null>(
      `/api/v1/moderation/offers/${offerId}`,
      jsonInit("PUT", { body: { priceCents } }),
      "Unable to save. Please try again.",
    );

    if (!result.ok) {
      setErrorMessage(result.message);
    } else {
      setEditing(false);
      router.refresh();
    }

    setSavePending(false);
  }

  async function handleDelete() {
    if (deletePending) {
      return;
    }

    setDeletePending(true);
    setErrorMessage(null);

    const result = await requestApi<null>(
      `/api/v1/moderation/offers/${offerId}`,
      { method: "DELETE" },
      "Unable to delete. Please try again.",
    );

    if (!result.ok) {
      setErrorMessage(result.message);
      setConfirmDelete(false);
      setDeletePending(false);
      return;
    }

    if (onDeleted) {
      onDeleted();
    } else {
      router.refresh();
    }
  }

  if (editing) {
    return (
      <div className={className ?? styles.actions}>
        <form
          onSubmit={(e) => {
            void handleSave(e);
          }}
          className={styles.editForm}
        >
          <label className={styles.field}>
            Price (€)
            <input
              type="number"
              min="0.01"
              max="500"
              step="0.01"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              required
              className={styles.input}
            />
          </label>
          <button type="submit" disabled={savePending} className={`${styles.button} ${styles.saveButton}`}>
            {savePending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={savePending}
            className={styles.button}
            onClick={() => {
              setEditing(false);
              setErrorMessage(null);
            }}
          >
            Cancel
          </button>
        </form>
        {errorMessage && (
          <p className={styles.error} role="alert" aria-live="polite">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className ?? styles.actions}>
      {errorMessage && (
        <p className={styles.error} role="alert" aria-live="polite">
          {errorMessage}
        </p>
      )}
      {confirmDelete ? (
        <>
          <button
            type="button"
            onClick={() => {
              void handleDelete();
            }}
            disabled={deletePending}
            className={`${styles.button} ${styles.deleteButton}`}
            aria-label="Confirm delete offer"
          >
            {deletePending ? "Deleting…" : "Confirm Delete"}
          </button>
          <button
            type="button"
            disabled={deletePending}
            className={styles.button}
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className={styles.button}
            onClick={() => setEditing(true)}
            aria-label="Edit offer price"
          >
            Edit Price
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.deleteButton}`}
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete offer"
          >
            Delete
          </button>
        </>
      )}
    </div>
  );
}
