"use client";

import { type FormEvent, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { jsonInit } from "@/lib/client-api";
import { runAdminMutation } from "@/app/admin/management-client";
import { ManagementError, ManagementItem } from "@/app/admin/management-item";
import type { BeerBrand } from "@/lib/types";
import styles from "./brands.module.css";

type BrandRow = Pick<BeerBrand, "id" | "name" | "status">;

type Props = {
  brands: BrandRow[];
};

function BrandItem({ brand }: { brand: BrandRow }) {
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
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

    const result = await runAdminMutation({
      input: `/api/v1/admin/brands/${brand.id}`,
      init: jsonInit("PUT", { body: { name } }),
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
      input: `/api/v1/admin/brands/${brand.id}`,
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
      title={brand.name}
      status={brand.status}
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
          <dd>{brand.name}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{brand.status}</dd>
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
    </ManagementItem>
  );
}

function CreateBrandForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const createdName = name;
    const result = await runAdminMutation({
      input: "/api/v1/admin/brands",
      init: jsonInit("POST", { body: { name } }),
      fallbackMessage: "Unable to create brand. Please try again.",
      onSuccess: () => {
        setName("");
        setSuccessMessage(`Brand "${createdName}" created.`);
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
      <h3>Add New Brand</h3>

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

      <label htmlFor="new-brand-name">
        Name
        <input
          id="new-brand-name"
          type="text"
          minLength={2}
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Holsten"
          required
        />
      </label>

      <div className={styles.createActions}>
        <button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create Brand"}
        </button>
      </div>
    </form>
  );
}

export function BrandsManagement({ brands }: Props) {
  const [search, setSearch] = useState("");

  const filteredBrands = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) => b.name.toLowerCase().includes(q) || b.status.toLowerCase().includes(q),
    );
  }, [brands, search]);

  return (
    <div className={styles.container}>
      <div className={styles.searchBar}>
        <label htmlFor="search-brands">Search brands</label>
        <input
          id="search-brands"
          type="search"
          placeholder="Search by name or status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {filteredBrands.length === 0 ? (
        <p className={styles.empty}>No brands found matching your search.</p>
      ) : (
        <ul className={styles.list}>
          {filteredBrands.map((brand) => (
            <BrandItem key={brand.id} brand={brand} />
          ))}
        </ul>
      )}

      <CreateBrandForm />
    </div>
  );
}
