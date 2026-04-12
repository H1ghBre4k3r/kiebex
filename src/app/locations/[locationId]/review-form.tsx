"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { getApiError, jsonRequest } from "@/lib/client-api";
import styles from "./page.module.css";

type ReviewFormProps = {
  locationId: string;
};

export function ReviewForm({ locationId }: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
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
      const response = await fetch("/api/v1/reviews", {
        ...jsonRequest("POST", {
          body: {
            locationId,
            rating: Number(rating),
            title: title.trim() || undefined,
            body: body.trim() || undefined,
          },
        }),
      });

      if (!response.ok) {
        const { message } = await getApiError(response, "Unable to submit review.");
        setErrorMessage(message);
        setPending(false);
        return;
      }

      setRating("5");
      setTitle("");
      setBody("");
      setSuccessMessage("Review submitted.");
      setPending(false);
      router.refresh();
    } catch {
      setErrorMessage("Unable to submit review.");
      setPending(false);
    }
  }

  return (
    <form className={styles.reviewForm} onSubmit={handleSubmit}>
      <label htmlFor="review-rating">
        Rating
        <select
          id="review-rating"
          name="rating"
          value={rating}
          onChange={(event) => setRating(event.target.value)}
        >
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Good</option>
          <option value="3">3 - Okay</option>
          <option value="2">2 - Poor</option>
          <option value="1">1 - Bad</option>
        </select>
      </label>

      <label htmlFor="review-title">
        Title (optional)
        <input
          id="review-title"
          name="title"
          type="text"
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label htmlFor="review-body">
        Details (optional)
        <textarea
          id="review-body"
          name="body"
          rows={4}
          maxLength={1500}
          value={body}
          onChange={(event) => setBody(event.target.value)}
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

      <button type="submit" disabled={pending}>
        {pending ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
