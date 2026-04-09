"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./styles.module.css";

type ApiErrorBody = {
  status?: "error";
  error?: { message?: string };
};

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

    try {
      const response = await fetch(`/api/v1/admin/styles/${style.id}`, {
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
      const response = await fetch(`/api/v1/admin/styles/${style.id}`, {
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
          <dd>{style.name}</dd>
        </div>
        <div>
          <dt>Variants using this style</dt>
          <dd>
            <span className={styles.variantCount}>{style.variantCount}</span>
          </dd>
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
    </li>
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

    try {
      const response = await fetch("/api/v1/admin/styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setErrorMessage(err?.error?.message ?? "Unable to create style. Please try again.");
        return;
      }

      setName("");
      setSuccessMessage(`Style "${name}" created.`);
      router.refresh();
    } catch {
      setErrorMessage("Unable to create style. Please try again.");
    } finally {
      setPending(false);
    }
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
  return (
    <>
      {beerStyles.length === 0 ? (
        <p>No beer styles found.</p>
      ) : (
        <ul className={styles.list}>
          {beerStyles.map((style) => (
            <StyleItem key={style.id} style={style} />
          ))}
        </ul>
      )}

      <CreateStyleForm />
    </>
  );
}
