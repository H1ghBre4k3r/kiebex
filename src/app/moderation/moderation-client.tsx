"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PendingBeerOfferSubmission, PendingLocationSubmission } from "@/lib/types";
import styles from "./moderation.module.css";

function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function getServingLabel(serving: PendingBeerOfferSubmission["serving"]): string {
  if (serving === "tap") {
    return "On Tap";
  }

  if (serving === "bottle") {
    return "Bottle";
  }

  return "Can";
}

function locationTypeLabel(locationType: PendingLocationSubmission["locationType"]): string {
  if (locationType === "pub") {
    return "Pub";
  }

  if (locationType === "bar") {
    return "Bar";
  }

  if (locationType === "restaurant") {
    return "Restaurant";
  }

  return "Supermarket";
}

type ModerationClientProps = {
  pendingLocations: PendingLocationSubmission[];
  pendingOffers: PendingBeerOfferSubmission[];
};

type ActionState = {
  locationId?: string;
  offerId?: string;
};

type ApiErrorResponse = {
  status?: "error";
  error?: {
    message?: string;
  };
};

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
  return body?.error?.message ?? fallback;
}

export function ModerationClient({ pendingLocations, pendingOffers }: ModerationClientProps) {
  const router = useRouter();
  const [actionState, setActionState] = useState<ActionState>({});
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string } | null>(
    null,
  );

  async function moderateLocation(locationId: string, status: "approved" | "rejected") {
    setFeedback(null);
    setActionState({ locationId });

    try {
      const response = await fetch(`/api/v1/moderation/locations/${locationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const message = await parseErrorMessage(
          response,
          "Unable to moderate location submission.",
        );
        setFeedback({ kind: "error", message });
        setActionState({});
        return;
      }

      setFeedback({ kind: "success", message: `Location ${status}.` });
      setActionState({});
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Unable to moderate location submission." });
      setActionState({});
    }
  }

  async function moderateOffer(offerId: string, status: "approved" | "rejected") {
    setFeedback(null);
    setActionState({ offerId });

    try {
      const response = await fetch(`/api/v1/moderation/offers/${offerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response, "Unable to moderate offer submission.");
        setFeedback({ kind: "error", message });
        setActionState({});
        return;
      }

      setFeedback({ kind: "success", message: `Offer ${status}.` });
      setActionState({});
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Unable to moderate offer submission." });
      setActionState({});
    }
  }

  return (
    <>
      {feedback && (
        <p className={feedback.kind === "error" ? styles.error : styles.success} role="status">
          {feedback.message}
        </p>
      )}

      <div className={styles.grid}>
        <section className={styles.panel} aria-labelledby="pending-locations-heading">
          <h2 id="pending-locations-heading">Pending Locations ({pendingLocations.length})</h2>

          {pendingLocations.length === 0 ? (
            <p className={styles.notice}>No pending location submissions.</p>
          ) : (
            <ul className={styles.list}>
              {pendingLocations.map((location) => {
                const pending = actionState.locationId === location.id;

                return (
                  <li key={location.id} className={styles.item}>
                    <h3>{location.name}</h3>
                    <div className={styles.meta}>
                      <p>{locationTypeLabel(location.locationType)}</p>
                      <p>
                        {location.address} ({location.district})
                      </p>
                      <p>
                        Submitted by {location.submitter?.displayName ?? "Unknown user"} on{" "}
                        {new Date(location.createdAt).toLocaleDateString("en-GB")}
                      </p>
                    </div>

                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.approve}`}
                        disabled={pending}
                        onClick={() => moderateLocation(location.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.reject}`}
                        disabled={pending}
                        onClick={() => moderateLocation(location.id, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="pending-offers-heading">
          <h2 id="pending-offers-heading">Pending Offers ({pendingOffers.length})</h2>

          {pendingOffers.length === 0 ? (
            <p className={styles.notice}>No pending offer submissions.</p>
          ) : (
            <ul className={styles.list}>
              {pendingOffers.map((offer) => {
                const pending = actionState.offerId === offer.id;

                return (
                  <li key={offer.id} className={styles.item}>
                    <h3>
                      {offer.brand} {offer.variant} - {formatEur(offer.priceEur)}
                    </h3>
                    <div className={styles.meta}>
                      <p>
                        {offer.sizeMl} ml - {getServingLabel(offer.serving)}
                      </p>
                      <p>
                        Location: {offer.location.name} (
                        {locationTypeLabel(offer.location.locationType)})
                      </p>
                      <p>
                        Submitted by {offer.submitter?.displayName ?? "Unknown user"} on{" "}
                        {new Date(offer.createdAt).toLocaleDateString("en-GB")}
                      </p>
                    </div>

                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.approve}`}
                        disabled={pending}
                        onClick={() => moderateOffer(offer.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.reject}`}
                        disabled={pending}
                        onClick={() => moderateOffer(offer.id, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
