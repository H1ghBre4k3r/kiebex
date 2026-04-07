"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import styles from "./contribute.module.css";

type LocationOption = {
  id: string;
  name: string;
  locationType: string;
  status: "pending" | "approved" | "rejected";
  createdById?: string | null;
};

type OfferFormProps = {
  locations: LocationOption[];
};

type ApiResponse = {
  status?: "ok" | "error";
  error?: {
    message?: string;
  };
};

const servingTypes = [
  { value: "tap", label: "On Tap" },
  { value: "bottle", label: "Bottle" },
  { value: "can", label: "Can" },
] as const;

function locationStatusLabel(status: LocationOption["status"]): string {
  if (status === "pending") {
    return "Pending";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return "Approved";
}

export function OfferForm({ locations }: OfferFormProps) {
  const router = useRouter();
  const [brand, setBrand] = useState("");
  const [variant, setVariant] = useState("");
  const [sizeMl, setSizeMl] = useState("500");
  const [serving, setServing] = useState<(typeof servingTypes)[number]["value"]>("tap");
  const [priceCents, setPriceCents] = useState("500");
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
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
      const response = await fetch("/api/v1/beers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand,
          variant,
          sizeMl: Number(sizeMl),
          serving,
          priceCents: Number(priceCents),
          locationId,
        }),
      });

      const body = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        setErrorMessage(body?.error?.message ?? "Unable to submit offer.");
        setPending(false);
        return;
      }

      setBrand("");
      setVariant("");
      setSizeMl("500");
      setServing("tap");
      setPriceCents("500");
      setSuccessMessage("Offer submitted for moderation.");
      setPending(false);
      router.refresh();
    } catch {
      setErrorMessage("Unable to submit offer.");
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field} htmlFor="offer-brand">
        Brand
        <input
          id="offer-brand"
          name="brand"
          type="text"
          required
          minLength={1}
          maxLength={80}
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
        />
      </label>

      <label className={styles.field} htmlFor="offer-variant">
        Variant
        <input
          id="offer-variant"
          name="variant"
          type="text"
          required
          minLength={1}
          maxLength={80}
          value={variant}
          onChange={(event) => setVariant(event.target.value)}
        />
      </label>

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
            setServing(event.target.value as (typeof servingTypes)[number]["value"])
          }
        >
          {servingTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

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
              {location.name} ({locationStatusLabel(location.status)})
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
          disabled={pending || locations.length === 0}
        >
          {pending ? "Submitting..." : "Submit Offer"}
        </button>
      </div>
    </form>
  );
}
