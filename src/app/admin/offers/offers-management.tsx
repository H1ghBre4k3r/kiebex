"use client";

import { type FormEvent, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { jsonInit } from "@/lib/client-api";
import { runAdminMutation } from "@/app/admin/management-client";
import { ManagementError, ManagementItem } from "@/app/admin/management-item";
import { SERVING_TYPE_OPTIONS, formatEur, servingLabel } from "@/lib/display";
import type { ServingType } from "@/lib/types";
import styles from "./offers.module.css";

type OfferRow = {
  id: string;
  brand: string;
  variant: string;
  style: string;
  sizeMl: number;
  serving: ServingType;
  priceEur: number;
  locationId: string;
  locationName: string;
};

type LocationOption = {
  id: string;
  name: string;
};

type BrandOption = {
  id: string;
  name: string;
};

type VariantOption = {
  id: string;
  name: string;
  brandId: string;
};

type Props = {
  offers: OfferRow[];
  locations: LocationOption[];
  brands: BrandOption[];
  variants: VariantOption[];
};

function OfferItem({ offer }: { offer: OfferRow }) {
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDelete() {
    if (deletePending) {
      return;
    }

    setDeletePending(true);
    setErrorMessage(null);

    const result = await runAdminMutation({
      input: `/api/v1/moderation/offers/${offer.id}`,
      init: { method: "DELETE" },
      fallbackMessage: "Unable to delete. Please try again.",
      onSuccess: () => setConfirmDelete(false),
      refresh: () => router.refresh(),
    });

    if (!result.ok) {
      setErrorMessage(result.message);
      setConfirmDelete(false);
    }

    setDeletePending(false);
  }

  return (
    <ManagementItem
      title={`${offer.brand} — ${offer.variant}`}
      status={`${formatEur(offer.priceEur)} / ${offer.sizeMl} ml / ${servingLabel(offer.serving)}`}
      expanded={expanded}
      onToggle={() => {
        setExpanded((prev) => !prev);
        if (expanded) {
          setConfirmDelete(false);
          setErrorMessage(null);
        }
      }}
    >
      <dl className={styles.meta}>
        <div>
          <dt>Brand</dt>
          <dd>{offer.brand}</dd>
        </div>
        <div>
          <dt>Variant</dt>
          <dd>{offer.variant}</dd>
        </div>
        <div>
          <dt>Style</dt>
          <dd>{offer.style}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{offer.locationName}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>{formatEur(offer.priceEur)}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{offer.sizeMl} ml</dd>
        </div>
        <div>
          <dt>Serving</dt>
          <dd>{servingLabel(offer.serving)}</dd>
        </div>
      </dl>

      {errorMessage && <ManagementError message={errorMessage} />}

      <div className={styles.controls}>
        {confirmDelete ? (
          <>
            <button
              type="button"
              onClick={() => {
                void handleDelete();
              }}
              disabled={deletePending}
            >
              {deletePending ? "Deleting…" : "Confirm Delete"}
            </button>
            <button type="button" disabled={deletePending} onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        )}
      </div>
    </ManagementItem>
  );
}

function CreateOfferForm({
  locations,
  brands,
  variants,
}: {
  locations: LocationOption[];
  brands: BrandOption[];
  variants: VariantOption[];
}) {
  const router = useRouter();

  const initialBrandId = brands[0]?.id ?? "";
  const [brandId, setBrandId] = useState(initialBrandId);

  const availableVariants = useMemo(
    () => variants.filter((v) => v.brandId === brandId),
    [variants, brandId],
  );

  const [variantId, setVariantId] = useState(availableVariants[0]?.id ?? "");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [sizeMl, setSizeMl] = useState("500");
  const [serving, setServing] = useState<ServingType>("tap");
  const [priceEur, setPriceEur] = useState("5.00");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleBrandChange(nextBrandId: string) {
    setBrandId(nextBrandId);
    const nextVariants = variants.filter((v) => v.brandId === nextBrandId);
    setVariantId(nextVariants[0]?.id ?? "");
  }

  const canCreate = brands.length > 0 && locations.length > 0 && availableVariants.length > 0;

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending || !canCreate) {
      return;
    }

    setPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const priceCents = Math.round(parseFloat(priceEur) * 100);

    const result = await runAdminMutation({
      input: "/api/v1/admin/offers",
      init: jsonInit("POST", {
        body: {
          variantId,
          sizeMl: Number(sizeMl),
          serving,
          priceCents,
          locationId,
        },
      }),
      fallbackMessage: "Unable to create offer. Please try again.",
      onSuccess: () => {
        setSizeMl("500");
        setServing("tap");
        setPriceEur("5.00");
        setSuccessMessage("Offer created successfully.");
      },
      refresh: () => router.refresh(),
    });

    if (!result.ok) {
      setErrorMessage(result.message);
    }

    setPending(false);
  }

  return (
    <form
      className={styles.createForm}
      onSubmit={(e) => {
        void handleCreate(e);
      }}
    >
      <h3>Add New Offer</h3>

      {!canCreate && (
        <p className={styles.error} role="status">
          At least one approved location, brand, and variant are required to create an offer.
        </p>
      )}

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

      <label htmlFor="new-offer-brand">
        Brand
        <select
          id="new-offer-brand"
          value={brandId}
          onChange={(e) => handleBrandChange(e.target.value)}
          required
          disabled={!canCreate}
        >
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="new-offer-variant">
        Variant
        <select
          id="new-offer-variant"
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
          required
          disabled={!canCreate}
        >
          {availableVariants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="new-offer-location">
        Location
        <select
          id="new-offer-location"
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          required
          disabled={!canCreate}
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="new-offer-size">
        Size (ml)
        <input
          id="new-offer-size"
          type="number"
          min={1}
          max={2000}
          value={sizeMl}
          onChange={(e) => setSizeMl(e.target.value)}
          required
          disabled={!canCreate}
        />
      </label>

      <label htmlFor="new-offer-serving">
        Serving
        <select
          id="new-offer-serving"
          value={serving}
          onChange={(e) => setServing(e.target.value as ServingType)}
          disabled={!canCreate}
        >
          {SERVING_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="new-offer-price">
        Price (EUR)
        <input
          id="new-offer-price"
          type="number"
          min="0.01"
          max="500.00"
          step="0.01"
          value={priceEur}
          onChange={(e) => setPriceEur(e.target.value)}
          required
          disabled={!canCreate}
        />
      </label>

      <div className={styles.createActions}>
        <button type="submit" disabled={pending || !canCreate}>
          {pending ? "Creating…" : "Create Offer"}
        </button>
      </div>
    </form>
  );
}

export function OffersManagement({ offers, locations, brands, variants }: Props) {
  const [search, setSearch] = useState("");

  const filteredOffers = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return offers;
    return offers.filter(
      (o) =>
        o.brand.toLowerCase().includes(q) ||
        o.variant.toLowerCase().includes(q) ||
        o.style.toLowerCase().includes(q) ||
        o.locationName.toLowerCase().includes(q),
    );
  }, [offers, search]);

  return (
    <div className={styles.container}>
      <div className={styles.searchBar}>
        <label htmlFor="search-offers">Search offers</label>
        <input
          id="search-offers"
          type="search"
          placeholder="Search by brand, variant, style, or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <CreateOfferForm locations={locations} brands={brands} variants={variants} />

      {filteredOffers.length === 0 ? (
        <p className={styles.empty}>No approved offers found matching your search.</p>
      ) : (
        <ul className={styles.list}>
          {filteredOffers.map((offer) => (
            <OfferItem key={offer.id} offer={offer} />
          ))}
        </ul>
      )}
    </div>
  );
}
