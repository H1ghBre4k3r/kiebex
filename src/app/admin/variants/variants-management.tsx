"use client";

import { type FormEvent, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getApiError, jsonRequest } from "@/lib/client-api";
import type { BeerVariant, BeerStyle } from "@/lib/types";
import styles from "./variants.module.css";

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

  const [expanded, setExpanded] = useState(false);
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
        ...jsonRequest("PUT", { body: { name, styleId } }),
      });

      if (!response.ok) {
        const { message } = await getApiError(response, "Unable to save. Please try again.");
        setErrorMessage(message);
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
        const { message } = await getApiError(response, "Unable to delete. Please try again.");
        setErrorMessage(message);
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
    <li className={`${styles.item} ${expanded ? styles.expanded : ""}`}>
      <button
        type="button"
        className={styles.rowHeader}
        onClick={() => {
          setExpanded((prev) => !prev);
          if (expanded) {
            setEditing(false);
            setConfirmDelete(false);
            setErrorMessage(null);
          }
        }}
        aria-expanded={expanded}
      >
        <span className={styles.rowTitle}>
          {variant.brandName} {variant.name}
        </span>
        <span className={styles.rowStatus}>{variant.status}</span>
        <span className={styles.rowIcon}>{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className={styles.rowBody}>
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
                <button
                  type="button"
                  disabled={deletePending}
                  onClick={() => setConfirmDelete(false)}
                >
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
        </div>
      )}
    </li>
  );
}

export function VariantsManagement({ variants, beerStyles }: Props) {
  const [search, setSearch] = useState("");

  const filteredVariants = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return variants;
    return variants.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.brandName.toLowerCase().includes(q) ||
        v.styleName.toLowerCase().includes(q) ||
        v.status.toLowerCase().includes(q),
    );
  }, [variants, search]);

  return (
    <div className={styles.container}>
      <div className={styles.searchBar}>
        <label htmlFor="search-variants">Search variants</label>
        <input
          id="search-variants"
          type="search"
          placeholder="Search by variant name, brand, style or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {filteredVariants.length === 0 ? (
        <p className={styles.empty}>No variants found matching your search.</p>
      ) : (
        <ul className={styles.list}>
          {filteredVariants.map((variant) => (
            <VariantItem key={variant.id} variant={variant} beerStyles={beerStyles} />
          ))}
        </ul>
      )}
    </div>
  );
}
