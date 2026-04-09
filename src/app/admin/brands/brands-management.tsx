"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { BeerBrand } from "@/lib/types";
import styles from "./brands.module.css";

type ApiErrorBody = {
  status?: "error";
  error?: { message?: string };
};

type BrandRow = Pick<BeerBrand, "id" | "name" | "status">;

type Props = {
  brands: BrandRow[];
};

function BrandItem({ brand }: { brand: BrandRow }) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(brand.name);
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
      const response = await fetch(`/api/v1/admin/brands/${brand.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
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
      const response = await fetch(`/api/v1/admin/brands/${brand.id}`, {
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
          <dd>{brand.name}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{brand.status}</dd>
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
          <label htmlFor={`brand-name-${brand.id}`}>
            Name
            <input
              id={`brand-name-${brand.id}`}
              type="text"
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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

export function BrandsManagement({ brands }: Props) {
  if (brands.length === 0) {
    return <p>No brands found.</p>;
  }

  return (
    <ul className={styles.list}>
      {brands.map((brand) => (
        <BrandItem key={brand.id} brand={brand} />
      ))}
    </ul>
  );
}
