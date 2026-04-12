"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { jsonRequest, requestApi } from "@/lib/client-api";
import { formatDate } from "@/lib/display";
import type { ReviewWithAuthor } from "@/lib/types";
import styles from "./page.module.css";

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

    const result = await requestApi<null>(
      editEndpoint,
      jsonRequest(editMethod, {
        body: {
          rating: Number(rating),
          title: title || null,
          body: body || null,
        },
      }),
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
      deleteEndpoint,
      { method: "DELETE" },
      "Unable to delete. Please try again.",
    );

    if (!result.ok) {
      setErrorMessage(result.message);
      setConfirmDelete(false);
      setDeletePending(false);
      return;
    }

    router.refresh();
  }

  async function handleModerate(status: "approved" | "rejected") {
    if (moderatePending) {
      return;
    }

    setModeratePending(true);
    setErrorMessage(null);

    const result = await requestApi<null>(
      `/api/v1/moderation/reviews/${review.id}`,
      jsonRequest("PATCH", { body: { status } }),
      "Unable to moderate. Please try again.",
    );

    if (!result.ok) {
      setErrorMessage(result.message);
    } else {
      router.refresh();
    }

    setModeratePending(false);
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
      <p>{formatDate(review.createdAt)}</p>

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
