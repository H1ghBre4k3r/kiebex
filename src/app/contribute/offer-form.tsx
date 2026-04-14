"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { jsonInit, requestApi } from "@/lib/client-api";
import { SERVING_TYPE_OPTIONS, submissionStatusLabel } from "@/lib/display";
import styles from "./contribute.module.css";

type LocationOption = {
  id: string;
  name: string;
  status: "pending" | "approved" | "rejected";
};

type BrandOption = {
  id: string;
  name: string;
};

type VariantOption = {
  id: string;
  name: string;
  brandId: string;
  styleName: string;
  status: "pending" | "approved" | "rejected";
};

type OfferFormProps = {
  locations: LocationOption[];
  brands: BrandOption[];
  variants: VariantOption[];
};

type OfferApiSuccess = {
  outcome?: "offer_submission_created" | "price_update_proposed";
};

export function OfferForm({ locations, brands, variants }: OfferFormProps) {
  const router = useRouter();
  const initialBrandId = brands[0]?.id ?? "";
  const [brandId, setBrandId] = useState(initialBrandId);
  const availableVariants = useMemo(
    () => variants.filter((variant) => variant.brandId === brandId),
    [variants, brandId],
  );
  const [variantId, setVariantId] = useState(availableVariants[0]?.id ?? "");
  const [sizeMl, setSizeMl] = useState("500");
  const [serving, setServing] = useState<(typeof SERVING_TYPE_OPTIONS)[number]["value"]>("tap");
  const [priceCents, setPriceCents] = useState("500");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function handleBrandChange(nextBrandId: string) {
    setBrandId(nextBrandId);
    const nextVariants = variants.filter((variant) => variant.brandId === nextBrandId);
    setVariantId(nextVariants[0]?.id ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await requestApi<OfferApiSuccess>(
      "/api/v1/beers",
      jsonInit("POST", {
        body: {
          variantId,
          sizeMl: Number(sizeMl),
          serving,
          priceCents: Number(priceCents),
          locationId,
        },
      }),
      "Unable to submit offer.",
    );

    if (!result.ok) {
      setErrorMessage(result.message);
      setPending(false);
      return;
    }

    setSizeMl("500");
    setServing("tap");
    setPriceCents("500");

    if (result.data?.outcome === "price_update_proposed") {
      setSuccessMessage("Price update proposal submitted for moderation.");
    } else {
      setSuccessMessage("Offer submission created for moderation.");
    }

    setPending(false);
    router.refresh();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field} htmlFor="offer-brand-id">
        Brand
        <select
          id="offer-brand-id"
          name="brandId"
          required
          value={brandId}
          onChange={(event) => handleBrandChange(event.target.value)}
        >
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field} htmlFor="offer-variant-id">
        Variant
        <select
          id="offer-variant-id"
          name="variantId"
          required
          value={variantId}
          onChange={(event) => setVariantId(event.target.value)}
        >
          {availableVariants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.name} ({variant.styleName}, {submissionStatusLabel(variant.status)})
            </option>
          ))}
        </select>
      </label>

      <div className={styles.formRow}>
        <label className={styles.field} htmlFor="offer-size-ml">
          Size (ml)
          <input
            id="offer-size-ml"
            name="sizeMl"
            type="number"
            required
            min={1}
            max={2000}
            value={sizeMl}
            onChange={(event) => setSizeMl(event.target.value)}
          />
        </label>

        <label className={styles.field} htmlFor="offer-serving">
          Serving
          <select
            id="offer-serving"
            name="serving"
            value={serving}
            onChange={(event) =>
              setServing(event.target.value as (typeof SERVING_TYPE_OPTIONS)[number]["value"])
            }
          >
            {SERVING_TYPE_OPTIONS.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={styles.field} htmlFor="offer-price-cents">
        Price (cents)
        <input
          id="offer-price-cents"
          name="priceCents"
          type="number"
          required
          min={1}
          max={50000}
          value={priceCents}
          onChange={(event) => setPriceCents(event.target.value)}
        />
      </label>

      <label className={styles.field} htmlFor="offer-location-id">
        Location
        <select
          id="offer-location-id"
          name="locationId"
          required
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name} ({submissionStatusLabel(location.status)})
            </option>
          ))}
        </select>
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

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.button}
          disabled={pending || locations.length === 0 || availableVariants.length === 0}
        >
          {pending ? "Submitting..." : "Submit Offer / Price Update"}
        </button>
      </div>
    </form>
  );
}
