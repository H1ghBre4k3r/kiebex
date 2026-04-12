"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiError, jsonRequest } from "@/lib/client-api";

type Props = {
  offerId: string;
  currentPriceCents: number;
  /** Optional: called after a successful delete (e.g. to redirect) */
  onDeleted?: () => void;
  /** CSS class applied to the outer wrapper div */
  className?: string;
  /** CSS class applied to buttons */
  buttonClassName?: string;
  /** CSS class for error text */
  errorClassName?: string;
};

export function AdminOfferActions({
  offerId,
  currentPriceCents,
  onDeleted,
  className,
  buttonClassName,
  errorClassName,
}: Props) {
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

    try {
      const response = await fetch(`/api/v1/moderation/offers/${offerId}`, {
        ...jsonRequest("PUT", { body: { priceCents } }),
      });

      if (!response.ok) {
        const { message } = await getApiError(response, "Unable to save. Please try again.");
        setErrorMessage(message);
        return;
      }

      setEditing(false);
      router.refresh();
    } catch {
      setErrorMessage("Unable to save. Please try again.");
    } finally {
      setSavePending(false);
    }
  }

  async function handleDelete() {
    if (deletePending) {
      return;
    }

    setDeletePending(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/moderation/offers/${offerId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const { message } = await getApiError(response, "Unable to delete. Please try again.");
        setErrorMessage(message);
        setConfirmDelete(false);
        return;
      }

      if (onDeleted) {
        onDeleted();
      } else {
        router.refresh();
      }
    } catch {
      setErrorMessage("Unable to delete. Please try again.");
      setDeletePending(false);
    }
  }

  if (editing) {
    return (
      <div className={className}>
        <form
          onSubmit={(e) => {
            void handleSave(e);
          }}
          style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "flex-end" }}
        >
          <label style={{ display: "grid", gap: "0.2rem", fontWeight: 700 }}>
            Price (€)
            <input
              type="number"
              min="0.01"
              max="500"
              step="0.01"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              required
              style={{ border: "var(--border-regular)", padding: "0.25rem 0.4rem", width: "7rem" }}
            />
          </label>
          <button type="submit" disabled={savePending} className={buttonClassName}>
            {savePending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={savePending}
            className={buttonClassName}
            onClick={() => {
              setEditing(false);
              setErrorMessage(null);
            }}
          >
            Cancel
          </button>
        </form>
        {errorMessage && (
          <p className={errorClassName} role="alert" aria-live="polite">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {errorMessage && (
        <p className={errorClassName} role="alert" aria-live="polite">
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
            className={buttonClassName}
            aria-label="Confirm delete offer"
          >
            {deletePending ? "Deleting…" : "Confirm Delete"}
          </button>
          <button
            type="button"
            disabled={deletePending}
            className={buttonClassName}
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className={buttonClassName}
            onClick={() => setEditing(true)}
            aria-label="Edit offer price"
          >
            Edit Price
          </button>
          <button
            type="button"
            className={buttonClassName}
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
