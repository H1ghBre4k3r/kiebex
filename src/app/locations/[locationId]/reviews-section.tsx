"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AuthUser, Review, ReviewWithAuthor } from "@/lib/types";
import { OwnReviewActions } from "./own-review-actions";
import { ReviewForm } from "./review-form";
import styles from "./page.module.css";

type ReviewAuthor = Pick<AuthUser, "id" | "displayName">;

type Props = {
  locationId: string;
  initialReviews: ReviewWithAuthor[];
  authUser: ReviewAuthor | null;
  isModerator: boolean;
};

function toReviewWithAuthor(review: Review, author: ReviewAuthor): ReviewWithAuthor {
  return {
    ...review,
    author,
  };
}

export function ReviewsSection({ locationId, initialReviews, authUser, isModerator }: Props) {
  const [reviews, setReviews] = useState(initialReviews);

  useEffect(() => {
    setReviews(initialReviews);
  }, [initialReviews]);

  return (
    <>
      <h2 id="location-reviews-heading">Reviews ({reviews.length})</h2>

      {authUser ? (
        <ReviewForm
          locationId={locationId}
          onCreated={(review) => {
            setReviews((current) => [toReviewWithAuthor(review, authUser), ...current]);
          }}
        />
      ) : (
        <p>
          <Link href="/login">Sign in</Link> to add a review.
        </p>
      )}

      {reviews.length === 0 ? (
        <p>No reviews yet for this location.</p>
      ) : (
        <ul className={styles.reviewList}>
          {reviews.map((review) => (
            <OwnReviewActions
              key={review.id}
              review={review}
              authUserId={authUser?.id ?? null}
              isModerator={isModerator}
              onUpdated={(updatedReview) => {
                setReviews((current) =>
                  current.map((entry) => (entry.id === updatedReview.id ? updatedReview : entry)),
                );
              }}
              onDeleted={(reviewId) => {
                setReviews((current) => current.filter((entry) => entry.id !== reviewId));
              }}
            />
          ))}
        </ul>
      )}
    </>
  );
}
