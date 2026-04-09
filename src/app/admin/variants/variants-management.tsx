"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { BeerVariant, BeerStyle } from "@/lib/types";
import styles from "./variants.module.css";

type ApiErrorBody = {
  status?: "error";
  error?: { message?: string };
};

type VariantRow = Pick<BeerVariant, "id" | "name" | "brandId" | "styleId" | "status"> & {
  brandName: string;
  styleName: string;
};

type Props = {
  variants: VariantRow[];
  beerStyles: Pick<BeerStyle, "id" | "name">[];
};

function VariantItem({
  variant,
  beerStyles,
}: {
  variant: VariantRow;
  beerStyles: Pick<BeerStyle, "id" | "name">[];
}) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(variant.name);
  const [styleId, setStyleId] = useState(variant.styleId);
  const [savePending, setSavePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (savePending) {
      return;
    }

    setSavePending(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/variants/${variant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, styleId }),
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setErrorMessage(err?.error?.message ?? "Unable to save. Please try again.");
        return;
      }

      setEditing(false);
      router.refresh();
    } catch {
      setErrorMessage("Unable to save. Please try again.");
    } finally {
      setSavePending(false);
    }
  }

  async function handleDelete() {
    if (deletePending) {
      return;
    }

    setDeletePending(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/admin/variants/${variant.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setErrorMessage(err?.error?.message ?? "Unable to delete. Please try again.");
        setConfirmDelete(false);
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage("Unable to delete. Please try again.");
      setDeletePending(false);
    }
  }

  return (
    <li className={styles.item}>
      <dl className={styles.meta}>
        <div>
          <dt>Name</dt>
          <dd>{variant.name}</dd>
        </div>
        <div>
          <dt>Brand</dt>
          <dd>{variant.brandName}</dd>
        </div>
        <div>
          <dt>Style</dt>
          <dd>{variant.styleName}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{variant.status}</dd>
        </div>
      </dl>

      {errorMessage && (
        <p className={styles.error} role="alert" aria-live="polite">
          {errorMessage}
        </p>
      )}

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
          <>
            <button
              type="button"
              onClick={() => {
                setEditing((prev) => !prev);
                setErrorMessage(null);
              }}
            >
              {editing ? "Cancel Edit" : "Edit"}
            </button>
            <button type="button" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          </>
        )}
      </div>

      {editing && (
        <form
          className={styles.editForm}
          onSubmit={(e) => {
            void handleSave(e);
          }}
        >
          <label htmlFor={`variant-name-${variant.id}`}>
            Name
            <input
              id={`variant-name-${variant.id}`}
              type="text"
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label htmlFor={`variant-style-${variant.id}`}>
            Style
            <select
              id={`variant-style-${variant.id}`}
              value={styleId}
              onChange={(e) => setStyleId(e.target.value)}
              required
            >
              {beerStyles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.editActions}>
            <button type="submit" disabled={savePending}>
              {savePending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

export function VariantsManagement({ variants, beerStyles }: Props) {
  if (variants.length === 0) {
    return <p>No variants found.</p>;
  }

  return (
    <ul className={styles.list}>
      {variants.map((variant) => (
        <VariantItem key={variant.id} variant={variant} beerStyles={beerStyles} />
      ))}
    </ul>
  );
}
