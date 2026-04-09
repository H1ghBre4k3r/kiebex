"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Location, LocationType } from "@/lib/types";
import styles from "./page.module.css";

type ApiErrorBody = {
  status?: "error";
  error?: { message?: string };
};

const LOCATION_TYPES: LocationType[] = ["pub", "bar", "restaurant", "supermarket"];

const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  pub: "Pub",
  bar: "Bar",
  restaurant: "Restaurant",
  supermarket: "Supermarket",
};

type Props = {
  location: Location;
};

export function AdminLocationActions({ location }: Props) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(location.name);
  const [locationType, setLocationType] = useState<LocationType>(location.locationType);
  const [district, setDistrict] = useState(location.district);
  const [address, setAddress] = useState(location.address);

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
      const response = await fetch(`/api/v1/moderation/locations/${location.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, locationType, district, address }),
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
      const response = await fetch(`/api/v1/moderation/locations/${location.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setErrorMessage(err?.error?.message ?? "Unable to delete. Please try again.");
        setConfirmDelete(false);
        return;
      }

      router.push("/");
    } catch {
      setErrorMessage("Unable to delete. Please try again.");
      setDeletePending(false);
    }
  }

  if (editing) {
    return (
      <form
        className={styles.adminForm}
        onSubmit={(e) => {
          void handleSave(e);
        }}
      >
        <label htmlFor="admin-loc-name">
          Name
          <input
            id="admin-loc-name"
            type="text"
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>

        <label htmlFor="admin-loc-type">
          Type
          <select
            id="admin-loc-type"
            value={locationType}
            onChange={(e) => setLocationType(e.target.value as LocationType)}
          >
            {LOCATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {LOCATION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="admin-loc-district">
          District
          <input
            id="admin-loc-district"
            type="text"
            minLength={2}
            maxLength={80}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            required
          />
        </label>

        <label htmlFor="admin-loc-address">
          Address
          <input
            id="admin-loc-address"
            type="text"
            minLength={5}
            maxLength={200}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </label>

        {errorMessage && (
          <p className={styles.error} role="alert" aria-live="polite">
            {errorMessage}
          </p>
        )}

        <div className={styles.adminActions}>
          <button type="submit" disabled={savePending}>
            {savePending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={savePending}
            onClick={() => {
              setEditing(false);
              setErrorMessage(null);
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={styles.adminActions}>
      {errorMessage && (
        <p className={styles.error} role="alert" aria-live="polite">
          {errorMessage}
        </p>
      )}

      {confirmDelete ? (
        <>
          <button
            type="button"
            onClick={() => {
              void handleDelete();
            }}
            disabled={deletePending}
            aria-label="Confirm delete location"
          >
            {deletePending ? "Deleting…" : "Confirm Delete"}
          </button>
          <button type="button" disabled={deletePending} onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <button type="button" onClick={() => setEditing(true)}>
            Edit Location
          </button>
          <button type="button" onClick={() => setConfirmDelete(true)}>
            Delete Location
          </button>
        </>
      )}
    </div>
  );
}
