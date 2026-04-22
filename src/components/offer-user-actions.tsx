"use client";

import { createContext, type FormEvent, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { jsonInit, requestApi } from "@/lib/client-api";
import { SERVING_TYPE_OPTIONS } from "@/lib/display";
import type { BeerOfferWithLocation } from "@/lib/types";
import styles from "./offer-user-actions.module.css";

type BrandOption = { id: string; name: string };
type VariantOption = { id: string; name: string; brandId: string };

type ActionOptions = {
  brands: BrandOption[];
  variants: VariantOption[];
};

type Props = {
  offer: BeerOfferWithLocation;
};

type Mode = "price-update" | "new-offer" | null;

type OfferApiSuccess = {
  outcome?: "offer_submission_created" | "price_update_proposed";
};

const offerActionOptionsContext = createContext<ActionOptions | null>(null);

export function UserOfferActionOptionsProvider({
  brands,
  variants,
  children,
}: ActionOptions & { children: React.ReactNode }) {
  return (
    <offerActionOptionsContext.Provider value={{ brands, variants }}>
      {children}
    </offerActionOptionsContext.Provider>
  );
}

export function UserOfferActions({ offer }: Props) {
  const router = useRouter();
  const options = useContext(offerActionOptionsContext);
  const [mode, setMode] = useState<Mode>(null);

  if (!options) {
    throw new Error("UserOfferActions must be rendered inside UserOfferActionOptionsProvider.");
  }

  const { brands, variants } = options;

  // Price update state
  const [priceInput, setPriceInput] = useState(offer.priceEur.toFixed(2));
  const [priceUpdatePending, setPriceUpdatePending] = useState(false);
  const [priceUpdateMessage, setPriceUpdateMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  // New offer state
  const initialBrandId = brands[0]?.id ?? "";
  const [newBrandId, setNewBrandId] = useState(initialBrandId);
  const availableVariants = useMemo(
    () => variants.filter((v) => v.brandId === newBrandId),
    [variants, newBrandId],
  );
  const [newVariantId, setNewVariantId] = useState(availableVariants[0]?.id ?? "");
  const [newSizeMl, setNewSizeMl] = useState("500");
  const [newServing, setNewServing] =
    useState<(typeof SERVING_TYPE_OPTIONS)[number]["value"]>("tap");
  const [newPriceInput, setNewPriceInput] = useState("5.00");
  const [newOfferPending, setNewOfferPending] = useState(false);
  const [newOfferMessage, setNewOfferMessage] = useState<{
    kind: "error" | "success";
    text: string;
  } | null>(null);

  function handleBrandChange(nextBrandId: string) {
    setNewBrandId(nextBrandId);
    const nextVariants = variants.filter((v) => v.brandId === nextBrandId);
    setNewVariantId(nextVariants[0]?.id ?? "");
  }

  function openMode(next: Mode) {
    setMode((prev) => (prev === next ? null : next));
    setPriceUpdateMessage(null);
    setNewOfferMessage(null);
  }

  async function handlePriceUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (priceUpdatePending) return;

    const priceCents = Math.round(parseFloat(priceInput) * 100);
    if (isNaN(priceCents) || priceCents <= 0 || priceCents > 50000) {
      setPriceUpdateMessage({ kind: "error", text: "Price must be between €0.01 and €500.00." });
      return;
    }

    setPriceUpdatePending(true);
    setPriceUpdateMessage(null);

    const result = await requestApi<OfferApiSuccess>(
      "/api/v1/beers",
      jsonInit("POST", {
        body: {
          variantId: offer.variantId,
          sizeMl: offer.sizeMl,
          serving: offer.serving,
          priceCents,
          locationId: offer.location.id,
        },
      }),
      "Unable to submit price update.",
    );

    if (!result.ok) {
      setPriceUpdateMessage({ kind: "error", text: result.message });
      setPriceUpdatePending(false);
      return;
    }

    setPriceUpdateMessage({ kind: "success", text: "Price update proposal submitted." });
    setPriceUpdatePending(false);
    router.refresh();
  }

  async function handleNewOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newOfferPending) return;

    const priceCents = Math.round(parseFloat(newPriceInput) * 100);
    if (isNaN(priceCents) || priceCents <= 0 || priceCents > 50000) {
      setNewOfferMessage({ kind: "error", text: "Price must be between €0.01 and €500.00." });
      return;
    }

    const sizeMl = parseInt(newSizeMl, 10);
    if (isNaN(sizeMl) || sizeMl < 1 || sizeMl > 2000) {
      setNewOfferMessage({ kind: "error", text: "Size must be between 1 and 2000 ml." });
      return;
    }

    setNewOfferPending(true);
    setNewOfferMessage(null);

    const result = await requestApi<OfferApiSuccess>(
      "/api/v1/beers",
      jsonInit("POST", {
        body: {
          variantId: newVariantId,
          sizeMl,
          serving: newServing,
          priceCents,
          locationId: offer.location.id,
        },
      }),
      "Unable to submit offer.",
    );

    if (!result.ok) {
      setNewOfferMessage({ kind: "error", text: result.message });
      setNewOfferPending(false);
      return;
    }

    if (result.data?.outcome === "price_update_proposed") {
      setNewOfferMessage({ kind: "success", text: "Price update proposal submitted." });
    } else {
      setNewOfferMessage({ kind: "success", text: "Offer submission created for moderation." });
    }

    setNewSizeMl("500");
    setNewServing("tap");
    setNewPriceInput("5.00");
    setNewOfferPending(false);
    router.refresh();
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.toggleRow}>
        <button
          type="button"
          className={`${styles.toggle} ${mode === "price-update" ? styles.toggleActive : ""}`}
          aria-expanded={mode === "price-update"}
          onClick={() => openMode("price-update")}
        >
          Propose Price Update
        </button>
        {brands.length > 0 && variants.length > 0 && (
          <button
            type="button"
            className={`${styles.toggle} ${mode === "new-offer" ? styles.toggleActive : ""}`}
            aria-expanded={mode === "new-offer"}
            onClick={() => openMode("new-offer")}
          >
            Submit Offer Here
          </button>
        )}
      </div>

      {mode === "price-update" && (
        <form className={styles.form} onSubmit={(e) => void handlePriceUpdate(e)}>
          <p className={styles.formHint}>
            Proposing a price update for{" "}
            <strong>
              {offer.brand} {offer.variant}
            </strong>{" "}
            ({offer.sizeMl} ml) at <strong>{offer.location.name}</strong>. Current:{" "}
            {offer.priceEur.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}.
          </p>
          <label className={styles.field}>
            New Price (€)
            <input
              className={styles.input}
              type="number"
              min="0.01"
              max="500"
              step="0.01"
              required
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
            />
          </label>
          {priceUpdateMessage && (
            <p
              className={priceUpdateMessage.kind === "error" ? styles.error : styles.success}
              role={priceUpdateMessage.kind === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              {priceUpdateMessage.text}
            </p>
          )}
          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={priceUpdatePending}>
              {priceUpdatePending ? "Submitting…" : "Submit"}
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => setMode(null)}
              disabled={priceUpdatePending}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "new-offer" && (
        <form className={styles.form} onSubmit={(e) => void handleNewOffer(e)}>
          <p className={styles.formHint}>
            Submitting a new offer at <strong>{offer.location.name}</strong>.
          </p>
          <label className={styles.field}>
            Brand
            <select
              className={styles.input}
              value={newBrandId}
              onChange={(e) => handleBrandChange(e.target.value)}
              required
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Variant
            <select
              className={styles.input}
              value={newVariantId}
              onChange={(e) => setNewVariantId(e.target.value)}
              required
              disabled={availableVariants.length === 0}
            >
              {availableVariants.length === 0 ? (
                <option value="">No variants available</option>
              ) : (
                availableVariants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className={styles.field}>
            Size (ml)
            <input
              className={styles.input}
              type="number"
              min="1"
              max="2000"
              required
              value={newSizeMl}
              onChange={(e) => setNewSizeMl(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            Serving
            <select
              className={styles.input}
              value={newServing}
              onChange={(e) =>
                setNewServing(e.target.value as (typeof SERVING_TYPE_OPTIONS)[number]["value"])
              }
            >
              {SERVING_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            Price (€)
            <input
              className={styles.input}
              type="number"
              min="0.01"
              max="500"
              step="0.01"
              required
              value={newPriceInput}
              onChange={(e) => setNewPriceInput(e.target.value)}
            />
          </label>
          {newOfferMessage && (
            <p
              className={newOfferMessage.kind === "error" ? styles.error : styles.success}
              role={newOfferMessage.kind === "error" ? "alert" : "status"}
              aria-live="polite"
            >
              {newOfferMessage.text}
            </p>
          )}
          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.button}
              disabled={newOfferPending || availableVariants.length === 0}
            >
              {newOfferPending ? "Submitting…" : "Submit"}
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => setMode(null)}
              disabled={newOfferPending}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
