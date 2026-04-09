"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  ModerationAuditLogEntry,
  ModerationReview,
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
  allReviews: ModerationReview[];
  auditLog: ModerationAuditLogEntry[];
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

function formatDateTime(value: Date): string {
  return new Date(value).toLocaleString("en-GB");
}

function reviewStatusLabel(status: ModerationReview["status"]): string {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function auditActionLabel(action: ModerationAuditLogEntry["action"]): string {
  if (action === "approve") return "Approved";
  if (action === "reject") return "Rejected";
  if (action === "delete") return "Deleted";
  return "Edited";
}

function auditContentLabel(type: ModerationAuditLogEntry["contentType"]): string {
  if (type === "price_update") return "Price Update";
  return type.charAt(0).toUpperCase() + type.slice(1);
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
  allReviews,
  auditLog,
}: ModerationClientProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string } | null>(
    null,
  );
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Edit state for locations
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locationEditFields, setLocationEditFields] = useState<{
    name: string;
    locationType: string;
    district: string;
    address: string;
  }>({ name: "", locationType: "", district: "", address: "" });

  // Edit state for offers
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [offerEditPriceCents, setOfferEditPriceCents] = useState<string>("");

  // Edit state for reviews
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewEditFields, setReviewEditFields] = useState<{
    rating: string;
    title: string;
    body: string;
  }>({ rating: "", title: "", body: "" });

  function clearFeedback() {
    setFeedback(null);
  }

  async function moderate(params: {
    queue: string;
    endpoint: string;
    id: string;
    status: "approved" | "rejected";
  }) {
    clearFeedback();
    setPendingAction(`${params.endpoint}:${params.id}:${params.status}`);

    try {
      const response = await fetch(`${params.endpoint}/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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

  async function deleteItem(params: { label: string; endpoint: string; id: string }) {
    clearFeedback();
    setPendingAction(`delete:${params.endpoint}:${params.id}`);
    setConfirmDelete(null);

    try {
      const response = await fetch(`${params.endpoint}/${params.id}`, { method: "DELETE" });

      if (!response.ok) {
        const message = await parseErrorMessage(response, `Unable to delete ${params.label}.`);
        setFeedback({ kind: "error", message });
        setPendingAction(null);
        return;
      }

      setFeedback({ kind: "success", message: `${params.label} deleted.` });
      setPendingAction(null);
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: `Unable to delete ${params.label}.` });
      setPendingAction(null);
    }
  }

  async function editLocation(locationId: string) {
    clearFeedback();
    setPendingAction(`edit:location:${locationId}`);

    const payload: Record<string, string> = {};
    if (locationEditFields.name.trim()) payload.name = locationEditFields.name.trim();
    if (locationEditFields.locationType) payload.locationType = locationEditFields.locationType;
    if (locationEditFields.district.trim()) payload.district = locationEditFields.district.trim();
    if (locationEditFields.address.trim()) payload.address = locationEditFields.address.trim();

    if (Object.keys(payload).length === 0) {
      setFeedback({ kind: "error", message: "Enter at least one field to update." });
      setPendingAction(null);
      return;
    }

    try {
      const response = await fetch(`/api/v1/moderation/locations/${locationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response, "Unable to update location.");
        setFeedback({ kind: "error", message });
        setPendingAction(null);
        return;
      }

      setFeedback({ kind: "success", message: "Location updated." });
      setEditingLocationId(null);
      setPendingAction(null);
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Unable to update location." });
      setPendingAction(null);
    }
  }

  async function editOffer(offerId: string) {
    clearFeedback();
    setPendingAction(`edit:offer:${offerId}`);

    const priceCents = Math.round(parseFloat(offerEditPriceCents) * 100);
    if (!priceCents || priceCents <= 0 || priceCents > 50000) {
      setFeedback({ kind: "error", message: "Enter a valid price (0.01 – 500.00 EUR)." });
      setPendingAction(null);
      return;
    }

    try {
      const response = await fetch(`/api/v1/moderation/offers/${offerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceCents }),
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response, "Unable to update offer price.");
        setFeedback({ kind: "error", message });
        setPendingAction(null);
        return;
      }

      setFeedback({ kind: "success", message: "Offer price updated." });
      setEditingOfferId(null);
      setPendingAction(null);
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Unable to update offer price." });
      setPendingAction(null);
    }
  }

  async function editReview(reviewId: string) {
    clearFeedback();
    setPendingAction(`edit:review:${reviewId}`);

    const payload: Record<string, unknown> = {};
    if (reviewEditFields.rating) payload.rating = parseInt(reviewEditFields.rating, 10);
    if (reviewEditFields.title !== "") payload.title = reviewEditFields.title || null;
    if (reviewEditFields.body !== "") payload.body = reviewEditFields.body || null;

    if (Object.keys(payload).length === 0) {
      setFeedback({ kind: "error", message: "Enter at least one field to update." });
      setPendingAction(null);
      return;
    }

    try {
      const response = await fetch(`/api/v1/moderation/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response, "Unable to update review.");
        setFeedback({ kind: "error", message });
        setPendingAction(null);
        return;
      }

      setFeedback({ kind: "success", message: "Review updated." });
      setEditingReviewId(null);
      setPendingAction(null);
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Unable to update review." });
      setPendingAction(null);
    }
  }

  function DeleteButton({
    itemKey,
    label,
    endpoint,
    id,
  }: {
    itemKey: string;
    label: string;
    endpoint: string;
    id: string;
  }) {
    const isConfirming = confirmDelete === itemKey;
    const isWorking = pendingAction === `delete:${endpoint}:${id}`;

    if (isConfirming) {
      return (
        <>
          <button
            type="button"
            className={`${styles.button} ${styles.deleteConfirm}`}
            disabled={isWorking}
            onClick={() => void deleteItem({ label, endpoint, id })}
          >
            Confirm Delete
          </button>
          <button type="button" className={styles.button} onClick={() => setConfirmDelete(null)}>
            Cancel
          </button>
        </>
      );
    }

    return (
      <button
        type="button"
        className={`${styles.button} ${styles.delete}`}
        disabled={!!pendingAction}
        onClick={() => setConfirmDelete(itemKey)}
      >
        Delete
      </button>
    );
  }

  return (
    <>
      {feedback && (
        <p className={feedback.kind === "error" ? styles.error : styles.success} role="status">
          {feedback.message}
        </p>
      )}

      <div className={styles.grid}>
        {/* Pending Locations */}
        <section className={styles.panel} aria-labelledby="pending-locations-heading">
          <h2 id="pending-locations-heading">Pending Locations ({pendingLocations.length})</h2>
          {pendingLocations.length === 0 ? (
            <p className={styles.notice}>No pending location submissions.</p>
          ) : (
            <ul className={styles.list}>
              {pendingLocations.map((location) => {
                const approveKey = `/api/v1/moderation/locations:${location.id}:approved`;
                const rejectKey = `/api/v1/moderation/locations:${location.id}:rejected`;
                const isApproving = pendingAction === approveKey;
                const isRejecting = pendingAction === rejectKey;
                const isEditing = editingLocationId === location.id;

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
                    {isEditing && (
                      <div className={styles.editForm}>
                        <label className={styles.editLabel}>
                          Name
                          <input
                            className={styles.editInput}
                            type="text"
                            placeholder={location.name}
                            value={locationEditFields.name}
                            onChange={(e) =>
                              setLocationEditFields((f) => ({ ...f, name: e.target.value }))
                            }
                          />
                        </label>
                        <label className={styles.editLabel}>
                          Type
                          <select
                            className={styles.editInput}
                            value={locationEditFields.locationType}
                            onChange={(e) =>
                              setLocationEditFields((f) => ({
                                ...f,
                                locationType: e.target.value,
                              }))
                            }
                          >
                            <option value="">— unchanged —</option>
                            <option value="pub">Pub</option>
                            <option value="bar">Bar</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="supermarket">Supermarket</option>
                          </select>
                        </label>
                        <label className={styles.editLabel}>
                          District
                          <input
                            className={styles.editInput}
                            type="text"
                            placeholder={location.district}
                            value={locationEditFields.district}
                            onChange={(e) =>
                              setLocationEditFields((f) => ({ ...f, district: e.target.value }))
                            }
                          />
                        </label>
                        <label className={styles.editLabel}>
                          Address
                          <input
                            className={styles.editInput}
                            type="text"
                            placeholder={location.address}
                            value={locationEditFields.address}
                            onChange={(e) =>
                              setLocationEditFields((f) => ({ ...f, address: e.target.value }))
                            }
                          />
                        </label>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={`${styles.button} ${styles.approve}`}
                            disabled={!!pendingAction}
                            onClick={() => void editLocation(location.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className={styles.button}
                            onClick={() => setEditingLocationId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.approve}`}
                        disabled={!!pendingAction}
                        onClick={() =>
                          void moderate({
                            queue: "location",
                            endpoint: "/api/v1/moderation/locations",
                            id: location.id,
                            status: "approved",
                          })
                        }
                      >
                        {isApproving ? "Approving…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.reject}`}
                        disabled={!!pendingAction}
                        onClick={() =>
                          void moderate({
                            queue: "location",
                            endpoint: "/api/v1/moderation/locations",
                            id: location.id,
                            status: "rejected",
                          })
                        }
                      >
                        {isRejecting ? "Rejecting…" : "Reject"}
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.edit}`}
                        disabled={!!pendingAction}
                        onClick={() => {
                          setEditingLocationId(isEditing ? null : location.id);
                          setLocationEditFields({
                            name: "",
                            locationType: "",
                            district: "",
                            address: "",
                          });
                        }}
                      >
                        {isEditing ? "Cancel Edit" : "Edit"}
                      </button>
                      <DeleteButton
                        itemKey={`location:${location.id}`}
                        label="location"
                        endpoint="/api/v1/moderation/locations"
                        id={location.id}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Pending Brands */}
        <section className={styles.panel} aria-labelledby="pending-brands-heading">
          <h2 id="pending-brands-heading">Pending Brands ({pendingBrands.length})</h2>
          {pendingBrands.length === 0 ? (
            <p className={styles.notice}>No pending beer brand submissions.</p>
          ) : (
            <ul className={styles.list}>
              {pendingBrands.map((brand) => {
                const approveKey = `/api/v1/moderation/brands:${brand.id}:approved`;
                const rejectKey = `/api/v1/moderation/brands:${brand.id}:rejected`;
                const isApproving = pendingAction === approveKey;
                const isRejecting = pendingAction === rejectKey;

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
                        disabled={!!pendingAction}
                        onClick={() =>
                          void moderate({
                            queue: "brand",
                            endpoint: "/api/v1/moderation/brands",
                            id: brand.id,
                            status: "approved",
                          })
                        }
                      >
                        {isApproving ? "Approving…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.reject}`}
                        disabled={!!pendingAction}
                        onClick={() =>
                          void moderate({
                            queue: "brand",
                            endpoint: "/api/v1/moderation/brands",
                            id: brand.id,
                            status: "rejected",
                          })
                        }
                      >
                        {isRejecting ? "Rejecting…" : "Reject"}
                      </button>
                      <DeleteButton
                        itemKey={`brand:${brand.id}`}
                        label="brand"
                        endpoint="/api/v1/moderation/brands"
                        id={brand.id}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Pending Variants */}
        <section className={styles.panel} aria-labelledby="pending-variants-heading">
          <h2 id="pending-variants-heading">Pending Variants ({pendingVariants.length})</h2>
          {pendingVariants.length === 0 ? (
            <p className={styles.notice}>No pending beer variant submissions.</p>
          ) : (
            <ul className={styles.list}>
              {pendingVariants.map((variant) => {
                const approveKey = `/api/v1/moderation/variants:${variant.id}:approved`;
                const rejectKey = `/api/v1/moderation/variants:${variant.id}:rejected`;
                const isApproving = pendingAction === approveKey;
                const isRejecting = pendingAction === rejectKey;

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
                        disabled={!!pendingAction}
                        onClick={() =>
                          void moderate({
                            queue: "variant",
                            endpoint: "/api/v1/moderation/variants",
                            id: variant.id,
                            status: "approved",
                          })
                        }
                      >
                        {isApproving ? "Approving…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.reject}`}
                        disabled={!!pendingAction}
                        onClick={() =>
                          void moderate({
                            queue: "variant",
                            endpoint: "/api/v1/moderation/variants",
                            id: variant.id,
                            status: "rejected",
                          })
                        }
                      >
                        {isRejecting ? "Rejecting…" : "Reject"}
                      </button>
                      <DeleteButton
                        itemKey={`variant:${variant.id}`}
                        label="variant"
                        endpoint="/api/v1/moderation/variants"
                        id={variant.id}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Pending Offers */}
        <section className={styles.panel} aria-labelledby="pending-offers-heading">
          <h2 id="pending-offers-heading">Pending Offers ({pendingOffers.length})</h2>
          {pendingOffers.length === 0 ? (
            <p className={styles.notice}>No pending offer submissions.</p>
          ) : (
            <ul className={styles.list}>
              {pendingOffers.map((offer) => {
                const approveKey = `/api/v1/moderation/offers:${offer.id}:approved`;
                const rejectKey = `/api/v1/moderation/offers:${offer.id}:rejected`;
                const isApproving = pendingAction === approveKey;
                const isRejecting = pendingAction === rejectKey;
                const isEditing = editingOfferId === offer.id;

                return (
                  <li key={offer.id} className={styles.item}>
                    <h3>
                      {offer.brand} {offer.variant} — {formatEur(offer.priceEur)}
                    </h3>
                    <div className={styles.meta}>
                      <p>
                        {offer.sizeMl} ml — {getServingLabel(offer.serving)}
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
                    {isEditing && (
                      <div className={styles.editForm}>
                        <label className={styles.editLabel}>
                          New Price (EUR)
                          <input
                            className={styles.editInput}
                            type="number"
                            min="0.01"
                            max="500"
                            step="0.01"
                            placeholder={offer.priceEur.toFixed(2)}
                            value={offerEditPriceCents}
                            onChange={(e) => setOfferEditPriceCents(e.target.value)}
                          />
                        </label>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={`${styles.button} ${styles.approve}`}
                            disabled={!!pendingAction}
                            onClick={() => void editOffer(offer.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className={styles.button}
                            onClick={() => setEditingOfferId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.approve}`}
                        disabled={!!pendingAction}
                        onClick={() =>
                          void moderate({
                            queue: "offer",
                            endpoint: "/api/v1/moderation/offers",
                            id: offer.id,
                            status: "approved",
                          })
                        }
                      >
                        {isApproving ? "Approving…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.reject}`}
                        disabled={!!pendingAction}
                        onClick={() =>
                          void moderate({
                            queue: "offer",
                            endpoint: "/api/v1/moderation/offers",
                            id: offer.id,
                            status: "rejected",
                          })
                        }
                      >
                        {isRejecting ? "Rejecting…" : "Reject"}
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.edit}`}
                        disabled={!!pendingAction}
                        onClick={() => {
                          setEditingOfferId(isEditing ? null : offer.id);
                          setOfferEditPriceCents("");
                        }}
                      >
                        {isEditing ? "Cancel Edit" : "Edit Price"}
                      </button>
                      <DeleteButton
                        itemKey={`offer:${offer.id}`}
                        label="offer"
                        endpoint="/api/v1/moderation/offers"
                        id={offer.id}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Pending Price Updates */}
        <section className={styles.panel} aria-labelledby="pending-price-updates-heading">
          <h2 id="pending-price-updates-heading">
            Pending Price Updates ({pendingPriceUpdates.length})
          </h2>
          {pendingPriceUpdates.length === 0 ? (
            <p className={styles.notice}>No pending price update proposals.</p>
          ) : (
            <ul className={styles.list}>
              {pendingPriceUpdates.map((proposal) => {
                const approveKey = `/api/v1/moderation/price-updates:${proposal.id}:approved`;
                const rejectKey = `/api/v1/moderation/price-updates:${proposal.id}:rejected`;
                const isApproving = pendingAction === approveKey;
                const isRejecting = pendingAction === rejectKey;

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
                        {proposal.offer.sizeMl} ml — {getServingLabel(proposal.offer.serving)}
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
                        disabled={!!pendingAction}
                        onClick={() =>
                          void moderate({
                            queue: "price update",
                            endpoint: "/api/v1/moderation/price-updates",
                            id: proposal.id,
                            status: "approved",
                          })
                        }
                      >
                        {isApproving ? "Approving…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.reject}`}
                        disabled={!!pendingAction}
                        onClick={() =>
                          void moderate({
                            queue: "price update",
                            endpoint: "/api/v1/moderation/price-updates",
                            id: proposal.id,
                            status: "rejected",
                          })
                        }
                      >
                        {isRejecting ? "Rejecting…" : "Reject"}
                      </button>
                      <DeleteButton
                        itemKey={`price-update:${proposal.id}`}
                        label="price update"
                        endpoint="/api/v1/moderation/price-updates"
                        id={proposal.id}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* All Reviews */}
        <section className={styles.panel} aria-labelledby="reviews-heading">
          <h2 id="reviews-heading">Reviews ({allReviews.length})</h2>
          {allReviews.length === 0 ? (
            <p className={styles.notice}>No reviews yet.</p>
          ) : (
            <ul className={styles.list}>
              {allReviews.map((review) => {
                const isEditing = editingReviewId === review.id;

                return (
                  <li key={review.id} className={styles.item}>
                    <h3>
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)} {review.title ? `— ${review.title}` : ""}
                    </h3>
                    <div className={styles.meta}>
                      <p>
                        <strong>Status:</strong>{" "}
                        <span className={styles[`status_${review.status}`]}>
                          {reviewStatusLabel(review.status)}
                        </span>
                      </p>
                      <p>Location: {review.locationName}</p>
                      {review.body && <p>{review.body}</p>}
                      <p>
                        By {review.author.displayName} on {formatDate(review.createdAt)}
                      </p>
                    </div>
                    {isEditing && (
                      <div className={styles.editForm}>
                        <label className={styles.editLabel}>
                          Rating (1–5, leave blank to keep)
                          <input
                            className={styles.editInput}
                            type="number"
                            min="1"
                            max="5"
                            step="1"
                            placeholder={String(review.rating)}
                            value={reviewEditFields.rating}
                            onChange={(e) =>
                              setReviewEditFields((f) => ({ ...f, rating: e.target.value }))
                            }
                          />
                        </label>
                        <label className={styles.editLabel}>
                          Title (blank to clear)
                          <input
                            className={styles.editInput}
                            type="text"
                            placeholder={review.title ?? ""}
                            value={reviewEditFields.title}
                            onChange={(e) =>
                              setReviewEditFields((f) => ({ ...f, title: e.target.value }))
                            }
                          />
                        </label>
                        <label className={styles.editLabel}>
                          Body (blank to clear)
                          <textarea
                            className={styles.editInput}
                            rows={3}
                            placeholder={review.body ?? ""}
                            value={reviewEditFields.body}
                            onChange={(e) =>
                              setReviewEditFields((f) => ({ ...f, body: e.target.value }))
                            }
                          />
                        </label>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={`${styles.button} ${styles.approve}`}
                            disabled={!!pendingAction}
                            onClick={() => void editReview(review.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className={styles.button}
                            onClick={() => setEditingReviewId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.approve}`}
                        disabled={!!pendingAction}
                        onClick={() =>
                          void moderate({
                            queue: "review",
                            endpoint: "/api/v1/moderation/reviews",
                            id: review.id,
                            status: "approved",
                          })
                        }
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.reject}`}
                        disabled={!!pendingAction}
                        onClick={() =>
                          void moderate({
                            queue: "review",
                            endpoint: "/api/v1/moderation/reviews",
                            id: review.id,
                            status: "rejected",
                          })
                        }
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.edit}`}
                        disabled={!!pendingAction}
                        onClick={() => {
                          setEditingReviewId(isEditing ? null : review.id);
                          setReviewEditFields({ rating: "", title: "", body: "" });
                        }}
                      >
                        {isEditing ? "Cancel Edit" : "Edit"}
                      </button>
                      <DeleteButton
                        itemKey={`review:${review.id}`}
                        label="review"
                        endpoint="/api/v1/moderation/reviews"
                        id={review.id}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Audit Log */}
        <section className={styles.panel} aria-labelledby="audit-log-heading">
          <h2 id="audit-log-heading">Audit Log (last {auditLog.length})</h2>
          {auditLog.length === 0 ? (
            <p className={styles.notice}>No moderation actions recorded yet.</p>
          ) : (
            <ul className={styles.list}>
              {auditLog.map((entry) => (
                <li key={entry.id} className={`${styles.item} ${styles.auditItem}`}>
                  <p>
                    <strong>{entry.moderatorName}</strong>{" "}
                    <span className={styles[`audit_${entry.action}`]}>
                      {auditActionLabel(entry.action)}
                    </span>{" "}
                    {auditContentLabel(entry.contentType)}{" "}
                    <code>{entry.contentId.slice(0, 8)}…</code>
                  </p>
                  <p className={styles.auditMeta}>{formatDateTime(entry.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
