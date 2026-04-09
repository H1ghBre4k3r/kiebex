"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewWithAuthor } from "@/lib/types";
import styles from "./page.module.css";

type ApiErrorBody = {
  status?: "error";
  error?: { message?: string };
};

type Props = {
  review: ReviewWithAuthor;
  authUserId: string | null;
  isModerator?: boolean;
};

export function OwnReviewActions({ review, authUserId, isModerator = false }: Props) {
  const router = useRouter();
  const isOwn = authUserId !== null && review.author.id === authUserId;
  const canAct = isOwn || isModerator;

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(String(review.rating));
  const [title, setTitle] = useState(review.title ?? "");
  const [body, setBody] = useState(review.body ?? "");
  const [savePending, setSavePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [moderatePending, setModeratePending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /** For moderators, use moderation endpoint; for own review, use own-review endpoint. */
  const editEndpoint = isModerator
    ? `/api/v1/moderation/reviews/${review.id}`
    : `/api/v1/reviews/${review.id}`;
  const editMethod = isModerator ? "PUT" : "PATCH";
  const deleteEndpoint = isModerator
    ? `/api/v1/moderation/reviews/${review.id}`
    : `/api/v1/reviews/${review.id}`;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (savePending) {
      return;
    }

    setSavePending(true);
    setErrorMessage(null);

    try {
      const response = await fetch(editEndpoint, {
        method: editMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: Number(rating),
          title: title || null,
          body: body || null,
        }),
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setErrorMessage(err?.error?.message ?? "Unable to save. Please try again.");
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
      const response = await fetch(deleteEndpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setErrorMessage(err?.error?.message ?? "Unable to delete. Please try again.");
        setConfirmDelete(false);
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage("Unable to delete. Please try again.");
      setDeletePending(false);
    }
  }

  async function handleModerate(status: "approved" | "rejected") {
    if (moderatePending) {
      return;
    }

    setModeratePending(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/moderation/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setErrorMessage(err?.error?.message ?? "Unable to moderate. Please try again.");
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage("Unable to moderate. Please try again.");
    } finally {
      setModeratePending(false);
    }
  }

  if (editing) {
    return (
      <li className={styles.reviewItem}>
        <form
          className={styles.reviewForm}
          onSubmit={(e) => {
            void handleSave(e);
          }}
        >
          <label htmlFor={`edit-rating-${review.id}`}>
            Rating
            <select
              id={`edit-rating-${review.id}`}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              required
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={String(r)}>
                  {r}/5
                </option>
              ))}
            </select>
          </label>

          <label htmlFor={`edit-title-${review.id}`}>
            Title (optional)
            <input
              id={`edit-title-${review.id}`}
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label htmlFor={`edit-body-${review.id}`}>
            Review (optional)
            <textarea
              id={`edit-body-${review.id}`}
              maxLength={1500}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>

          {errorMessage && (
            <p className={styles.error} role="alert" aria-live="polite">
              {errorMessage}
            </p>
          )}

          <div className={styles.reviewActions}>
            <button type="submit" disabled={savePending}>
              {savePending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setErrorMessage(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={styles.reviewItem}>
      <p>
        <strong>{review.rating}/5</strong> by {review.author.displayName}
        {isModerator && <span className={styles.reviewStatus}> [{review.status}]</span>}
      </p>
      {review.title && <p>{review.title}</p>}
      {review.body && <p>{review.body}</p>}
      <p>{new Date(review.createdAt).toLocaleDateString("en-GB")}</p>

      {canAct && (
        <div className={styles.reviewActions}>
          {errorMessage && (
            <p className={styles.error} role="alert" aria-live="polite">
              {errorMessage}
            </p>
          )}

          {isModerator && (
            <>
              <button
                type="button"
                onClick={() => {
                  void handleModerate("approved");
                }}
                disabled={moderatePending || review.status === "approved"}
                aria-label="Approve review"
              >
                {moderatePending ? "…" : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleModerate("rejected");
                }}
                disabled={moderatePending || review.status === "rejected"}
                aria-label="Reject review"
              >
                {moderatePending ? "…" : "Reject"}
              </button>
            </>
          )}

          {confirmDelete ? (
            <>
              <button
                type="button"
                onClick={() => {
                  void handleDelete();
                }}
                disabled={deletePending}
                aria-label="Confirm delete review"
              >
                {deletePending ? "Deleting..." : "Confirm Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deletePending}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button type="button" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
