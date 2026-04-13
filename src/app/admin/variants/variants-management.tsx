"use client";

import { type FormEvent, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { jsonInit } from "@/lib/client-api";
import { runAdminMutation } from "@/app/admin/management-client";
import { ManagementError, ManagementItem } from "@/app/admin/management-item";
import type { BeerBrand, BeerVariant, BeerStyle } from "@/lib/types";
import styles from "./variants.module.css";

type VariantRow = Pick<BeerVariant, "id" | "name" | "brandId" | "styleId" | "status"> & {
  brandName: string;
  styleName: string;
};

type Props = {
  variants: VariantRow[];
  beerStyles: Pick<BeerStyle, "id" | "name">[];
  brands: Pick<BeerBrand, "id" | "name">[];
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

    const result = await runAdminMutation({
      input: `/api/v1/admin/variants/${variant.id}`,
      init: jsonInit("PUT", { body: { name, styleId } }),
      fallbackMessage: "Unable to save. Please try again.",
      onSuccess: () => setEditing(false),
      refresh: () => router.refresh(),
    });

    if (!result.ok) {
      setErrorMessage(result.message);
    }

    setSavePending(false);
  }

  async function handleDelete() {
    if (deletePending) {
      return;
    }

    setDeletePending(true);
    setErrorMessage(null);

    const result = await runAdminMutation({
      input: `/api/v1/admin/variants/${variant.id}`,
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
      title={`${variant.brandName} ${variant.name}`}
      status={variant.status}
      expanded={expanded}
      onToggle={() => {
        setExpanded((prev) => !prev);
        if (expanded) {
          setEditing(false);
          setConfirmDelete(false);
          setErrorMessage(null);
        }
      }}
    >
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
    </ManagementItem>
  );
}

function CreateVariantForm({
  beerStyles,
  brands,
}: {
  beerStyles: Pick<BeerStyle, "id" | "name">[];
  brands: Pick<BeerBrand, "id" | "name">[];
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [styleId, setStyleId] = useState(beerStyles[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canCreate = brands.length > 0 && beerStyles.length > 0;

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending || !canCreate) {
      return;
    }

    setPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const createdName = name;
    const result = await runAdminMutation({
      input: "/api/v1/admin/variants",
      init: jsonInit("POST", { body: { name, brandId, styleId } }),
      fallbackMessage: "Unable to create variant. Please try again.",
      onSuccess: () => {
        setName("");
        setSuccessMessage(`Variant "${createdName}" created.`);
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
      <h3>Add New Variant</h3>

      {!canCreate && (
        <p className={styles.error} role="status">
          At least one approved brand and one style are required to create a variant.
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

      <label htmlFor="new-variant-name">
        Name
        <input
          id="new-variant-name"
          type="text"
          minLength={1}
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Pilsener"
          required
          disabled={!canCreate}
        />
      </label>

      <label htmlFor="new-variant-brand">
        Brand
        <select
          id="new-variant-brand"
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
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

      <label htmlFor="new-variant-style">
        Style
        <select
          id="new-variant-style"
          value={styleId}
          onChange={(e) => setStyleId(e.target.value)}
          required
          disabled={!canCreate}
        >
          {beerStyles.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.createActions}>
        <button type="submit" disabled={pending || !canCreate}>
          {pending ? "Creating…" : "Create Variant"}
        </button>
      </div>
    </form>
  );
}

export function VariantsManagement({ variants, beerStyles, brands }: Props) {
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

      <CreateVariantForm beerStyles={beerStyles} brands={brands} />

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
