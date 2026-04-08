"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  PendingBeerBrandSubmission,
  PendingBeerOfferSubmission,
  PendingBeerVariantSubmission,
  PendingLocationSubmission,
  PendingPriceUpdateProposal,
} from "@/lib/types";
import styles from "./moderation.module.css";

type ModerationClientProps = {
  pendingLocations: PendingLocationSubmission[];
  pendingBrands: PendingBeerBrandSubmission[];
  pendingVariants: PendingBeerVariantSubmission[];
  pendingOffers: PendingBeerOfferSubmission[];
  pendingPriceUpdates: PendingPriceUpdateProposal[];
};

type ApiErrorResponse = {
  error?: {
    message?: string;
  };
};

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

function formatDate(value: Date): string {
  return new Date(value).toLocaleDateString("en-GB");
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
  return body?.error?.message ?? fallback;
}

export function ModerationClient({
  pendingLocations,
  pendingBrands,
  pendingVariants,
  pendingOffers,
  pendingPriceUpdates,
}: ModerationClientProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string } | null>(
    null,
  );

  async function moderate(params: {
    queue: "location" | "brand" | "variant" | "offer" | "price update";
    endpoint: string;
    id: string;
    status: "approved" | "rejected";
  }) {
    setFeedback(null);
    setPendingAction(`${params.endpoint}:${params.id}`);

    try {
      const response = await fetch(`${params.endpoint}/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: params.status }),
      });

      if (!response.ok) {
        const message = await parseErrorMessage(
          response,
          `Unable to moderate ${params.queue} submission.`,
        );
        setFeedback({ kind: "error", message });
        setPendingAction(null);
        return;
      }

      setFeedback({ kind: "success", message: `${params.queue} ${params.status}.` });
      setPendingAction(null);
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: `Unable to moderate ${params.queue} submission.` });
      setPendingAction(null);
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
                const actionKey = `/api/v1/moderation/locations:${location.id}`;
                const isPending = pendingAction === actionKey;

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
                        {formatDate(location.createdAt)}
                      </p>
                    </div>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.approve}`}
                        disabled={isPending}
                        onClick={() =>
                          moderate({
                            queue: "location",
                            endpoint: "/api/v1/moderation/locations",
                            id: location.id,
                            status: "approved",
                          })
                        }
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.reject}`}
                        disabled={isPending}
                        onClick={() =>
                          moderate({
                            queue: "location",
                            endpoint: "/api/v1/moderation/locations",
                            id: location.id,
                            status: "rejected",
                          })
                        }
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

        <section className={styles.panel} aria-labelledby="pending-brands-heading">
          <h2 id="pending-brands-heading">Pending Brands ({pendingBrands.length})</h2>
          {pendingBrands.length === 0 ? (
            <p className={styles.notice}>No pending beer brand submissions.</p>
          ) : (
            <ul className={styles.list}>
              {pendingBrands.map((brand) => {
                const actionKey = `/api/v1/moderation/brands:${brand.id}`;
                const isPending = pendingAction === actionKey;

                return (
                  <li key={brand.id} className={styles.item}>
                    <h3>{brand.name}</h3>
                    <div className={styles.meta}>
                      <p>
                        Submitted by {brand.submitter?.displayName ?? "Unknown user"} on{" "}
                        {formatDate(brand.createdAt)}
                      </p>
                    </div>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.approve}`}
                        disabled={isPending}
                        onClick={() =>
                          moderate({
                            queue: "brand",
                            endpoint: "/api/v1/moderation/brands",
                            id: brand.id,
                            status: "approved",
                          })
                        }
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.reject}`}
                        disabled={isPending}
                        onClick={() =>
                          moderate({
                            queue: "brand",
                            endpoint: "/api/v1/moderation/brands",
                            id: brand.id,
                            status: "rejected",
                          })
                        }
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

        <section className={styles.panel} aria-labelledby="pending-variants-heading">
          <h2 id="pending-variants-heading">Pending Variants ({pendingVariants.length})</h2>
          {pendingVariants.length === 0 ? (
            <p className={styles.notice}>No pending beer variant submissions.</p>
          ) : (
            <ul className={styles.list}>
              {pendingVariants.map((variant) => {
                const actionKey = `/api/v1/moderation/variants:${variant.id}`;
                const isPending = pendingAction === actionKey;

                return (
                  <li key={variant.id} className={styles.item}>
                    <h3>{variant.name}</h3>
                    <div className={styles.meta}>
                      <p>Brand: {variant.brand?.name ?? "Unknown"}</p>
                      <p>Style: {variant.style?.name ?? "Unknown"}</p>
                      <p>
                        Submitted by {variant.submitter?.displayName ?? "Unknown user"} on{" "}
                        {formatDate(variant.createdAt)}
                      </p>
                    </div>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.approve}`}
                        disabled={isPending}
                        onClick={() =>
                          moderate({
                            queue: "variant",
                            endpoint: "/api/v1/moderation/variants",
                            id: variant.id,
                            status: "approved",
                          })
                        }
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.reject}`}
                        disabled={isPending}
                        onClick={() =>
                          moderate({
                            queue: "variant",
                            endpoint: "/api/v1/moderation/variants",
                            id: variant.id,
                            status: "rejected",
                          })
                        }
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
                const actionKey = `/api/v1/moderation/offers:${offer.id}`;
                const isPending = pendingAction === actionKey;

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
                        {formatDate(offer.createdAt)}
                      </p>
                    </div>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.approve}`}
                        disabled={isPending}
                        onClick={() =>
                          moderate({
                            queue: "offer",
                            endpoint: "/api/v1/moderation/offers",
                            id: offer.id,
                            status: "approved",
                          })
                        }
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.reject}`}
                        disabled={isPending}
                        onClick={() =>
                          moderate({
                            queue: "offer",
                            endpoint: "/api/v1/moderation/offers",
                            id: offer.id,
                            status: "rejected",
                          })
                        }
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

        <section className={styles.panel} aria-labelledby="pending-price-updates-heading">
          <h2 id="pending-price-updates-heading">
            Pending Price Updates ({pendingPriceUpdates.length})
          </h2>
          {pendingPriceUpdates.length === 0 ? (
            <p className={styles.notice}>No pending price update proposals.</p>
          ) : (
            <ul className={styles.list}>
              {pendingPriceUpdates.map((proposal) => {
                const actionKey = `/api/v1/moderation/price-updates:${proposal.id}`;
                const isPending = pendingAction === actionKey;

                return (
                  <li key={proposal.id} className={styles.item}>
                    <h3>
                      {proposal.offer.brand} {proposal.offer.variant}
                    </h3>
                    <div className={styles.meta}>
                      <p>
                        From {formatEur(proposal.offer.priceEur)} to{" "}
                        {formatEur(proposal.proposedPriceEur)}
                      </p>
                      <p>
                        {proposal.offer.sizeMl} ml - {getServingLabel(proposal.offer.serving)}
                      </p>
                      <p>
                        Location: {proposal.offer.location.name} (
                        {locationTypeLabel(proposal.offer.location.locationType)})
                      </p>
                      <p>
                        Submitted by {proposal.submitter?.displayName ?? "Unknown user"} on{" "}
                        {formatDate(proposal.createdAt)}
                      </p>
                    </div>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.approve}`}
                        disabled={isPending}
                        onClick={() =>
                          moderate({
                            queue: "price update",
                            endpoint: "/api/v1/moderation/price-updates",
                            id: proposal.id,
                            status: "approved",
                          })
                        }
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.reject}`}
                        disabled={isPending}
                        onClick={() =>
                          moderate({
                            queue: "price update",
                            endpoint: "/api/v1/moderation/price-updates",
                            id: proposal.id,
                            status: "rejected",
                          })
                        }
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
