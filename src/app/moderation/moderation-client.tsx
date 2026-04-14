"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { jsonInit, requestApi } from "@/lib/client-api";
import {
  LOCATION_TYPE_OPTIONS,
  formatDate,
  formatEur,
  servingLabel,
  locationTypeLabel,
  reviewStatusLabel,
} from "@/lib/display";
import { REPORT_REASON_LABELS } from "@/lib/types";
import type {
  ModerationAuditLogEntry,
  ModerationReview,
  OpenReport,
  PendingBeerBrandSubmission,
  PendingBeerOfferSubmission,
  PendingBeerVariantSubmission,
  PendingLocationSubmission,
  PendingPriceUpdateProposal,
} from "@/lib/types";
import { AuditLogList } from "./audit-log-list";
import { Tabs } from "@/components/tabs";
import styles from "./moderation.module.css";

type ModerationClientProps = {
  pendingLocations: PendingLocationSubmission[];
  pendingBrands: PendingBeerBrandSubmission[];
  pendingVariants: PendingBeerVariantSubmission[];
  pendingOffers: PendingBeerOfferSubmission[];
  pendingPriceUpdates: PendingPriceUpdateProposal[];
  newReviews: ModerationReview[];
  approvedReviews: ModerationReview[];
  openReports: OpenReport[];
  auditLog: ModerationAuditLogEntry[];
};

type Feedback = { kind: "error" | "success"; message: string };

type ModerationStatus = "approved" | "rejected";

type MutationConfig = {
  actionKey: string;
  input: RequestInfo | URL;
  init: RequestInit;
  fallbackMessage: string;
  successMessage: string;
  onSuccess?: () => void;
  resetDeleteConfirmation?: boolean;
};

type ReviewEditFormFields = { rating: string; title: string; body: string };

const MODERATION_ENDPOINTS = {
  locations: "/api/v1/moderation/locations",
  brands: "/api/v1/moderation/brands",
  variants: "/api/v1/moderation/variants",
  offers: "/api/v1/moderation/offers",
  priceUpdates: "/api/v1/moderation/price-updates",
  reviews: "/api/v1/moderation/reviews",
} as const;

function getModerationActionKey(endpoint: string, id: string, status: ModerationStatus): string {
  return `${endpoint}:${id}:${status}`;
}

function getDeleteActionKey(endpoint: string, id: string): string {
  return `delete:${endpoint}:${id}`;
}

function CollapsibleSection({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.panel} aria-labelledby={id}>
      <button
        id={id}
        type="button"
        className={styles.sectionToggle}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.sectionToggleIndicator}>{open ? "▼" : "▶"}</span>
        {heading}
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </section>
  );
}

type DeleteButtonProps = {
  itemKey: string;
  label: string;
  endpoint: string;
  id: string;
  confirmDelete: string | null;
  pendingAction: string | null;
  onRequestDelete: (params: { label: string; endpoint: string; id: string }) => void;
  onSetConfirmDelete: (key: string | null) => void;
};

function DeleteButton({
  itemKey,
  label,
  endpoint,
  id,
  confirmDelete,
  pendingAction,
  onRequestDelete,
  onSetConfirmDelete,
}: DeleteButtonProps) {
  const isConfirming = confirmDelete === itemKey;
  const isWorking = pendingAction === getDeleteActionKey(endpoint, id);

  if (isConfirming) {
    return (
      <>
        <button
          type="button"
          className={`${styles.button} ${styles.deleteConfirm}`}
          disabled={isWorking}
          onClick={() => void onRequestDelete({ label, endpoint, id })}
        >
          Confirm Delete
        </button>
        <button type="button" className={styles.button} onClick={() => onSetConfirmDelete(null)}>
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
      onClick={() => onSetConfirmDelete(itemKey)}
    >
      Delete
    </button>
  );
}

type ModerateButtonsProps = {
  endpoint: string;
  id: string;
  queue: string;
  disabled: boolean;
  pendingAction: string | null;
  onModerate: (params: {
    queue: string;
    endpoint: string;
    id: string;
    status: "approved" | "rejected";
  }) => void;
};

function ModerateButtons({
  endpoint,
  id,
  queue,
  disabled,
  pendingAction,
  onModerate,
}: ModerateButtonsProps) {
  const approveKey = getModerationActionKey(endpoint, id, "approved");
  const rejectKey = getModerationActionKey(endpoint, id, "rejected");

  return (
    <>
      <button
        type="button"
        className={`${styles.button} ${styles.approve}`}
        disabled={disabled}
        onClick={() => void onModerate({ queue, endpoint, id, status: "approved" })}
      >
        {pendingAction === approveKey ? "Approving…" : "Approve"}
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.reject}`}
        disabled={disabled}
        onClick={() => void onModerate({ queue, endpoint, id, status: "rejected" })}
      >
        {pendingAction === rejectKey ? "Rejecting…" : "Reject"}
      </button>
    </>
  );
}

type ReviewEditFormProps = {
  reviewId: string;
  review: ModerationReview;
  fields: ReviewEditFormFields;
  pendingAction: string | null;
  onFieldChange: React.Dispatch<React.SetStateAction<ReviewEditFormFields>>;
  onSave: (reviewId: string) => void;
  onCancel: () => void;
};

function ReviewEditForm({
  reviewId,
  review,
  fields,
  pendingAction,
  onFieldChange,
  onSave,
  onCancel,
}: ReviewEditFormProps) {
  return (
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
          value={fields.rating}
          onChange={(e) => onFieldChange((f) => ({ ...f, rating: e.target.value }))}
        />
      </label>
      <label className={styles.editLabel}>
        Title (blank to clear)
        <input
          className={styles.editInput}
          type="text"
          placeholder={review.title ?? ""}
          value={fields.title}
          onChange={(e) => onFieldChange((f) => ({ ...f, title: e.target.value }))}
        />
      </label>
      <label className={styles.editLabel}>
        Body (blank to clear)
        <textarea
          className={styles.editInput}
          rows={3}
          placeholder={review.body ?? ""}
          value={fields.body}
          onChange={(e) => onFieldChange((f) => ({ ...f, body: e.target.value }))}
        />
      </label>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.button} ${styles.approve}`}
          disabled={!!pendingAction}
          onClick={() => void onSave(reviewId)}
        >
          Save
        </button>
        <button type="button" className={styles.button} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

type ReviewItemProps = {
  review: ModerationReview;
  showModerationButtons: boolean;
  editingReviewId: string | null;
  confirmDelete: string | null;
  pendingAction: string | null;
  reviewEditFields: ReviewEditFormFields;
  onSetEditingReviewId: (id: string | null) => void;
  onSetReviewEditFields: React.Dispatch<React.SetStateAction<ReviewEditFormFields>>;
  onSetConfirmDelete: (key: string | null) => void;
  onModerate: (params: {
    queue: string;
    endpoint: string;
    id: string;
    status: "approved" | "rejected";
  }) => void;
  onDelete: (params: { label: string; endpoint: string; id: string }) => void;
  onEditReview: (reviewId: string) => void;
};

function ReviewItem({
  review,
  showModerationButtons,
  editingReviewId,
  confirmDelete,
  pendingAction,
  reviewEditFields,
  onSetEditingReviewId,
  onSetReviewEditFields,
  onSetConfirmDelete,
  onModerate,
  onDelete,
  onEditReview,
}: ReviewItemProps) {
  const isEditing = editingReviewId === review.id;

  return (
    <li className={styles.item}>
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
        <ReviewEditForm
          reviewId={review.id}
          review={review}
          fields={reviewEditFields}
          pendingAction={pendingAction}
          onFieldChange={onSetReviewEditFields}
          onSave={onEditReview}
          onCancel={() => onSetEditingReviewId(null)}
        />
      )}
      <div className={styles.actions}>
        {showModerationButtons && (
          <ModerateButtons
            endpoint={MODERATION_ENDPOINTS.reviews}
            id={review.id}
            queue="review"
            disabled={!!pendingAction}
            pendingAction={pendingAction}
            onModerate={onModerate}
          />
        )}
        <button
          type="button"
          className={`${styles.button} ${styles.edit}`}
          disabled={!!pendingAction}
          onClick={() => {
            onSetEditingReviewId(isEditing ? null : review.id);
            onSetReviewEditFields({ rating: "", title: "", body: "" });
          }}
        >
          {isEditing ? "Cancel Edit" : "Edit"}
        </button>
        <DeleteButton
          itemKey={`review:${review.id}`}
          label="review"
          endpoint={MODERATION_ENDPOINTS.reviews}
          id={review.id}
          confirmDelete={confirmDelete}
          pendingAction={pendingAction}
          onRequestDelete={onDelete}
          onSetConfirmDelete={onSetConfirmDelete}
        />
      </div>
    </li>
  );
}

export function ModerationClient({
  pendingLocations,
  pendingBrands,
  pendingVariants,
  pendingOffers,
  pendingPriceUpdates,
  newReviews,
  approvedReviews,
  openReports,
  auditLog,
}: ModerationClientProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
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
  const [reviewEditFields, setReviewEditFields] = useState<ReviewEditFormFields>({
    rating: "",
    title: "",
    body: "",
  });

  function clearFeedback() {
    setFeedback(null);
  }

  async function runMutation(config: MutationConfig) {
    clearFeedback();
    setPendingAction(config.actionKey);

    if (config.resetDeleteConfirmation) {
      setConfirmDelete(null);
    }

    const result = await requestApi<null>(config.input, config.init, config.fallbackMessage);

    if (!result.ok) {
      setFeedback({ kind: "error", message: result.message });
      setPendingAction(null);
      return;
    }

    setFeedback({ kind: "success", message: config.successMessage });
    config.onSuccess?.();
    setPendingAction(null);
    router.refresh();
  }

  async function moderate(params: {
    queue: string;
    endpoint: string;
    id: string;
    status: "approved" | "rejected";
  }) {
    await runMutation({
      actionKey: getModerationActionKey(params.endpoint, params.id, params.status),
      input: `${params.endpoint}/${params.id}`,
      init: jsonInit("PATCH", { body: { status: params.status } }),
      fallbackMessage: `Unable to moderate ${params.queue} submission.`,
      successMessage: `${params.queue} ${params.status}.`,
    });
  }

  async function deleteItem(params: { label: string; endpoint: string; id: string }) {
    await runMutation({
      actionKey: getDeleteActionKey(params.endpoint, params.id),
      input: `${params.endpoint}/${params.id}`,
      init: { method: "DELETE" },
      fallbackMessage: `Unable to delete ${params.label}.`,
      successMessage: `${params.label} deleted.`,
      resetDeleteConfirmation: true,
    });
  }

  async function editLocation(locationId: string) {
    const actionKey = `edit:location:${locationId}`;

    const payload: Record<string, string> = {};
    if (locationEditFields.name.trim()) payload.name = locationEditFields.name.trim();
    if (locationEditFields.locationType) payload.locationType = locationEditFields.locationType;
    if (locationEditFields.district.trim()) payload.district = locationEditFields.district.trim();
    if (locationEditFields.address.trim()) payload.address = locationEditFields.address.trim();

    if (Object.keys(payload).length === 0) {
      clearFeedback();
      setFeedback({ kind: "error", message: "Enter at least one field to update." });
      return;
    }

    await runMutation({
      actionKey,
      input: `${MODERATION_ENDPOINTS.locations}/${locationId}`,
      init: jsonInit("PUT", { body: payload }),
      fallbackMessage: "Unable to update location.",
      successMessage: "Location updated.",
      onSuccess: () => setEditingLocationId(null),
    });
  }

  async function editOffer(offerId: string) {
    const actionKey = `edit:offer:${offerId}`;

    const priceCents = Math.round(parseFloat(offerEditPriceCents) * 100);
    if (!priceCents || priceCents <= 0 || priceCents > 50000) {
      clearFeedback();
      setFeedback({ kind: "error", message: "Enter a valid price (0.01 – 500.00 EUR)." });
      return;
    }

    await runMutation({
      actionKey,
      input: `${MODERATION_ENDPOINTS.offers}/${offerId}`,
      init: jsonInit("PUT", { body: { priceCents } }),
      fallbackMessage: "Unable to update offer price.",
      successMessage: "Offer price updated.",
      onSuccess: () => setEditingOfferId(null),
    });
  }

  async function editReview(reviewId: string) {
    const actionKey = `edit:review:${reviewId}`;

    const payload: Record<string, unknown> = {};
    if (reviewEditFields.rating) payload.rating = parseInt(reviewEditFields.rating, 10);
    if (reviewEditFields.title !== "") payload.title = reviewEditFields.title || null;
    if (reviewEditFields.body !== "") payload.body = reviewEditFields.body || null;

    if (Object.keys(payload).length === 0) {
      clearFeedback();
      setFeedback({ kind: "error", message: "Enter at least one field to update." });
      return;
    }

    await runMutation({
      actionKey,
      input: `${MODERATION_ENDPOINTS.reviews}/${reviewId}`,
      init: jsonInit("PUT", { body: payload }),
      fallbackMessage: "Unable to update review.",
      successMessage: "Review updated.",
      onSuccess: () => setEditingReviewId(null),
    });
  }

  const moderationTabs = [
    {
      id: "submissions",
      label: `Submissions (${
        pendingLocations.length +
        pendingBrands.length +
        pendingVariants.length +
        pendingOffers.length +
        pendingPriceUpdates.length
      })`,
      content: (
        <div className={styles.tabContentStack}>
          {/* Pending Locations */}
          <CollapsibleSection
            id="pending-locations-heading"
            heading={`Locations (${pendingLocations.length})`}
          >
            {pendingLocations.length === 0 ? (
              <p className={styles.notice}>No pending location submissions.</p>
            ) : (
              <ul className={styles.list}>
                {pendingLocations.map((location) => {
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
                              {LOCATION_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
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
                        <ModerateButtons
                          endpoint={MODERATION_ENDPOINTS.locations}
                          id={location.id}
                          queue="location"
                          disabled={!!pendingAction}
                          pendingAction={pendingAction}
                          onModerate={moderate}
                        />
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
                          endpoint={MODERATION_ENDPOINTS.locations}
                          id={location.id}
                          confirmDelete={confirmDelete}
                          pendingAction={pendingAction}
                          onRequestDelete={deleteItem}
                          onSetConfirmDelete={setConfirmDelete}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CollapsibleSection>

          {/* Pending Brands */}
          <CollapsibleSection
            id="pending-brands-heading"
            heading={`Brands (${pendingBrands.length})`}
          >
            {pendingBrands.length === 0 ? (
              <p className={styles.notice}>No pending beer brand submissions.</p>
            ) : (
              <ul className={styles.list}>
                {pendingBrands.map((brand) => {
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
                        <ModerateButtons
                          endpoint={MODERATION_ENDPOINTS.brands}
                          id={brand.id}
                          queue="brand"
                          disabled={!!pendingAction}
                          pendingAction={pendingAction}
                          onModerate={moderate}
                        />
                        <DeleteButton
                          itemKey={`brand:${brand.id}`}
                          label="brand"
                          endpoint={MODERATION_ENDPOINTS.brands}
                          id={brand.id}
                          confirmDelete={confirmDelete}
                          pendingAction={pendingAction}
                          onRequestDelete={deleteItem}
                          onSetConfirmDelete={setConfirmDelete}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CollapsibleSection>

          {/* Pending Variants */}
          <CollapsibleSection
            id="pending-variants-heading"
            heading={`Variants (${pendingVariants.length})`}
          >
            {pendingVariants.length === 0 ? (
              <p className={styles.notice}>No pending beer variant submissions.</p>
            ) : (
              <ul className={styles.list}>
                {pendingVariants.map((variant) => {
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
                        <ModerateButtons
                          endpoint={MODERATION_ENDPOINTS.variants}
                          id={variant.id}
                          queue="variant"
                          disabled={!!pendingAction}
                          pendingAction={pendingAction}
                          onModerate={moderate}
                        />
                        <DeleteButton
                          itemKey={`variant:${variant.id}`}
                          label="variant"
                          endpoint={MODERATION_ENDPOINTS.variants}
                          id={variant.id}
                          confirmDelete={confirmDelete}
                          pendingAction={pendingAction}
                          onRequestDelete={deleteItem}
                          onSetConfirmDelete={setConfirmDelete}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CollapsibleSection>

          {/* Pending Offers */}
          <CollapsibleSection
            id="pending-offers-heading"
            heading={`Offers (${pendingOffers.length})`}
          >
            {pendingOffers.length === 0 ? (
              <p className={styles.notice}>No pending offer submissions.</p>
            ) : (
              <ul className={styles.list}>
                {pendingOffers.map((offer) => {
                  const isEditing = editingOfferId === offer.id;

                  return (
                    <li key={offer.id} className={styles.item}>
                      <h3>
                        {offer.brand} {offer.variant} — {formatEur(offer.priceEur)}
                      </h3>
                      <div className={styles.meta}>
                        <p>
                          {offer.sizeMl} ml — {servingLabel(offer.serving)}
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
                        <ModerateButtons
                          endpoint={MODERATION_ENDPOINTS.offers}
                          id={offer.id}
                          queue="offer"
                          disabled={!!pendingAction}
                          pendingAction={pendingAction}
                          onModerate={moderate}
                        />
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
                          endpoint={MODERATION_ENDPOINTS.offers}
                          id={offer.id}
                          confirmDelete={confirmDelete}
                          pendingAction={pendingAction}
                          onRequestDelete={deleteItem}
                          onSetConfirmDelete={setConfirmDelete}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CollapsibleSection>

          {/* Pending Price Updates */}
          <CollapsibleSection
            id="pending-price-updates-heading"
            heading={`Price Updates (${pendingPriceUpdates.length})`}
          >
            {pendingPriceUpdates.length === 0 ? (
              <p className={styles.notice}>No pending price update proposals.</p>
            ) : (
              <ul className={styles.list}>
                {pendingPriceUpdates.map((proposal) => {
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
                          {proposal.offer.sizeMl} ml — {servingLabel(proposal.offer.serving)}
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
                        <ModerateButtons
                          endpoint={MODERATION_ENDPOINTS.priceUpdates}
                          id={proposal.id}
                          queue="price update"
                          disabled={!!pendingAction}
                          pendingAction={pendingAction}
                          onModerate={moderate}
                        />
                        <DeleteButton
                          itemKey={`price-update:${proposal.id}`}
                          label="price update"
                          endpoint={MODERATION_ENDPOINTS.priceUpdates}
                          id={proposal.id}
                          confirmDelete={confirmDelete}
                          pendingAction={pendingAction}
                          onRequestDelete={deleteItem}
                          onSetConfirmDelete={setConfirmDelete}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CollapsibleSection>
        </div>
      ),
    },
    {
      id: "reviews",
      label: `Reviews (${newReviews.length + approvedReviews.length})`,
      content: (
        <div className={styles.tabContentStack}>
          {/* New Reviews (queue) */}
          <CollapsibleSection
            id="new-reviews-heading"
            heading={`New Reviews (${newReviews.length})`}
          >
            {newReviews.length === 0 ? (
              <p className={styles.notice}>No new reviews awaiting moderation.</p>
            ) : (
              <ul className={styles.list}>
                {newReviews.map((review) => (
                  <ReviewItem
                    key={review.id}
                    review={review}
                    showModerationButtons
                    editingReviewId={editingReviewId}
                    confirmDelete={confirmDelete}
                    pendingAction={pendingAction}
                    reviewEditFields={reviewEditFields}
                    onSetEditingReviewId={setEditingReviewId}
                    onSetReviewEditFields={setReviewEditFields}
                    onSetConfirmDelete={setConfirmDelete}
                    onModerate={moderate}
                    onDelete={deleteItem}
                    onEditReview={editReview}
                  />
                ))}
              </ul>
            )}
          </CollapsibleSection>

          {/* Approved Reviews (reference) */}
          <CollapsibleSection
            id="approved-reviews-heading"
            heading={`Approved Reviews (${approvedReviews.length})`}
          >
            {approvedReviews.length === 0 ? (
              <p className={styles.notice}>No approved reviews yet.</p>
            ) : (
              <ul className={styles.list}>
                {approvedReviews.map((review) => (
                  <ReviewItem
                    key={review.id}
                    review={review}
                    showModerationButtons={false}
                    editingReviewId={editingReviewId}
                    confirmDelete={confirmDelete}
                    pendingAction={pendingAction}
                    reviewEditFields={reviewEditFields}
                    onSetEditingReviewId={setEditingReviewId}
                    onSetReviewEditFields={setReviewEditFields}
                    onSetConfirmDelete={setConfirmDelete}
                    onModerate={moderate}
                    onDelete={deleteItem}
                    onEditReview={editReview}
                  />
                ))}
              </ul>
            )}
          </CollapsibleSection>
        </div>
      ),
    },
    {
      id: "reports",
      label: `Reports (${openReports.length})`,
      content: (
        <div className={styles.tabContentStack}>
          {/* Open Reports */}
          <CollapsibleSection
            id="open-reports-heading"
            heading={`Open Reports (${openReports.length})`}
          >
            {openReports.length === 0 ? (
              <p className={styles.notice}>No open reports.</p>
            ) : (
              <ul className={styles.list}>
                {openReports.map((report) => {
                  const resolveKey = `resolve:report:${report.id}`;
                  const isWorking = pendingAction === resolveKey;

                  return (
                    <li key={report.id} className={styles.item}>
                      <h3>{report.contentType} report</h3>
                      <div className={styles.meta}>
                        <p>
                          <strong>Reason:</strong>{" "}
                          {REPORT_REASON_LABELS[report.reason] ?? report.reason}
                        </p>
                        {report.note && (
                          <p>
                            <strong>Note:</strong> {report.note}
                          </p>
                        )}
                        <p>
                          <strong>Reporter:</strong> {report.reporter?.displayName ?? "Unknown user"}
                        </p>
                        <p>
                          <strong>Reported at:</strong> {formatDate(report.createdAt)}
                        </p>
                        <p>
                          <strong>Content link:</strong>{" "}
                          {report.contentType === "review" ? (
                            <Link
                              href={`/locations/${report.reviewLocationId}#review-${report.contentId}`}
                              className={styles.reportLink}
                            >
                              View review →
                            </Link>
                          ) : (
                            <span>
                              {report.contentType} #{report.contentId}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.approve}`}
                          disabled={!!pendingAction}
                          onClick={() => {
                            void runMutation({
                              actionKey: resolveKey,
                              input: `/api/v1/moderation/reports/${report.id}`,
                              init: jsonInit("PATCH", { body: { decision: "actioned" } }),
                              fallbackMessage: "Unable to resolve report.",
                              successMessage: "Report marked as actioned.",
                            });
                          }}
                        >
                          {isWorking ? "Saving…" : "Mark Actioned"}
                        </button>
                        <button
                          type="button"
                          className={`${styles.button} ${styles.reject}`}
                          disabled={!!pendingAction}
                          onClick={() => {
                            void runMutation({
                              actionKey: resolveKey,
                              input: `/api/v1/moderation/reports/${report.id}`,
                              init: jsonInit("PATCH", { body: { decision: "dismissed" } }),
                              fallbackMessage: "Unable to dismiss report.",
                              successMessage: "Report dismissed.",
                            });
                          }}
                        >
                          {isWorking ? "Saving…" : "Dismiss"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CollapsibleSection>
        </div>
      ),
    },
  ];

  return (
    <>
      {feedback && (
        <p className={feedback.kind === "error" ? styles.error : styles.success} role="status">
          {feedback.message}
        </p>
      )}

      <div className={styles.dashboardLayout}>
        <div className={styles.queueColumn}>
          <Tabs tabs={moderationTabs} />
        </div>

        {/* Audit Log column */}
        <aside className={styles.auditColumn}>
          <section className={styles.panel} aria-labelledby="audit-log-heading">
            <h2 id="audit-log-heading">Recent Activity</h2>
            <AuditLogList
              entries={auditLog}
              emptyMessage="No activity yet."
              dateTimeOptions={{ dateStyle: "short", timeStyle: "short" }}
              footer={<Link href="/moderation/audit-log">Full Audit Log →</Link>}
            />
          </section>
        </aside>
      </div>
    </>
  );
}
