"use client";

import { type FormEvent, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { jsonRequest } from "@/lib/client-api";
import { runAdminMutation } from "@/app/admin/management-client";
import { ManagementError, ManagementItem } from "@/app/admin/management-item";
import styles from "./styles.module.css";

type StyleRow = {
  id: string;
  name: string;
  variantCount: number;
};

type Props = {
  beerStyles: StyleRow[];
};

function StyleItem({ style }: { style: StyleRow }) {
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(style.name);
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
      input: `/api/v1/admin/styles/${style.id}`,
      init: jsonRequest("PUT", { body: { name } }),
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
      input: `/api/v1/admin/styles/${style.id}`,
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
      title={style.name}
      status={`${style.variantCount} variant(s)`}
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
          <dd>{style.name}</dd>
        </div>
        <div>
          <dt>Variants using this style</dt>
          <dd>
            <span className={styles.variantCount}>{style.variantCount}</span>
          </dd>
        </div>
      </dl>

      {errorMessage ? <ManagementError message={errorMessage} /> : null}

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
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={style.variantCount > 0}
              title={
                style.variantCount > 0
                  ? `Cannot delete: ${style.variantCount} variant(s) use this style`
                  : undefined
              }
            >
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
          <label htmlFor={`style-name-${style.id}`}>
            Name
            <input
              id={`style-name-${style.id}`}
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

function CreateStyleForm() {
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
      input: "/api/v1/admin/styles",
      init: jsonRequest("POST", { body: { name } }),
      fallbackMessage: "Unable to create style. Please try again.",
      onSuccess: () => {
        setName("");
        setSuccessMessage(`Style "${createdName}" created.`);
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
      <h3>Add New Style</h3>

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

      <label htmlFor="new-style-name">
        Name
        <input
          id="new-style-name"
          type="text"
          minLength={2}
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Pale Ale"
          required
        />
      </label>

      <div className={styles.createActions}>
        <button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create Style"}
        </button>
      </div>
    </form>
  );
}

export function StylesManagement({ beerStyles }: Props) {
  const [search, setSearch] = useState("");

  const filteredStyles = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return beerStyles;
    return beerStyles.filter((s) => s.name.toLowerCase().includes(q));
  }, [beerStyles, search]);

  return (
    <div className={styles.container}>
      <div className={styles.searchBar}>
        <label htmlFor="search-styles">Search styles</label>
        <input
          id="search-styles"
          type="search"
          placeholder="Search by style name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {filteredStyles.length === 0 ? (
        <p className={styles.empty}>No beer styles found matching your search.</p>
      ) : (
        <ul className={styles.list}>
          {filteredStyles.map((style) => (
            <StyleItem key={style.id} style={style} />
          ))}
        </ul>
      )}

      <CreateStyleForm />
    </div>
  );
}
