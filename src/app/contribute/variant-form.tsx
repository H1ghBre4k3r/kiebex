"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import styles from "./contribute.module.css";

type BrandOption = {
  id: string;
  name: string;
  status: "pending" | "approved" | "rejected";
};

type StyleOption = {
  id: string;
  name: string;
};

type VariantFormProps = {
  brands: BrandOption[];
  styleOptions: StyleOption[];
};

type ApiResponse = {
  status?: "ok" | "error";
  error?: {
    message?: string;
  };
};

function brandStatusLabel(status: BrandOption["status"]): string {
  if (status === "pending") {
    return "Pending";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return "Approved";
}

export function VariantForm({ brands, styleOptions }: VariantFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [styleId, setStyleId] = useState(styleOptions[0]?.id ?? "");
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
      const response = await fetch("/api/v1/beer-variants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          brandId,
          styleId,
        }),
      });

      const body = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        setErrorMessage(body?.error?.message ?? "Unable to submit beer variant.");
        setPending(false);
        return;
      }

      setName("");
      setSuccessMessage("Beer variant submitted for moderation.");
      setPending(false);
      router.refresh();
    } catch {
      setErrorMessage("Unable to submit beer variant.");
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field} htmlFor="variant-name">
        Variant Name
        <input
          id="variant-name"
          name="name"
          type="text"
          required
          minLength={1}
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label className={styles.field} htmlFor="variant-brand-id">
        Brand
        <select
          id="variant-brand-id"
          name="brandId"
          required
          value={brandId}
          onChange={(event) => setBrandId(event.target.value)}
        >
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name} ({brandStatusLabel(brand.status)})
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field} htmlFor="variant-style-id">
        Style
        <select
          id="variant-style-id"
          name="styleId"
          required
          value={styleId}
          onChange={(event) => setStyleId(event.target.value)}
        >
          {styleOptions.map((style) => (
            <option key={style.id} value={style.id}>
              {style.name}
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
          disabled={pending || brands.length === 0 || styleOptions.length === 0}
        >
          {pending ? "Submitting..." : "Submit Variant"}
        </button>
      </div>
    </form>
  );
}
