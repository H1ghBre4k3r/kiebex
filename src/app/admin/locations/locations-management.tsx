"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Location, LocationType } from "@/lib/types";
import styles from "./locations.module.css";

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

type LocationRow = Pick<
  Location,
  "id" | "name" | "locationType" | "district" | "address" | "status"
>;

type Props = {
  locations: LocationRow[];
};

function LocationItem({ location }: { location: LocationRow }) {
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
          <dd>{location.name}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{LOCATION_TYPE_LABELS[location.locationType]}</dd>
        </div>
        <div>
          <dt>District</dt>
          <dd>{location.district}</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>{location.address}</dd>
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
          <label htmlFor={`loc-name-${location.id}`}>
            Name
            <input
              id={`loc-name-${location.id}`}
              type="text"
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label htmlFor={`loc-type-${location.id}`}>
            Type
            <select
              id={`loc-type-${location.id}`}
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

          <label htmlFor={`loc-district-${location.id}`}>
            District
            <input
              id={`loc-district-${location.id}`}
              type="text"
              minLength={2}
              maxLength={80}
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              required
            />
          </label>

          <label htmlFor={`loc-address-${location.id}`}>
            Address
            <input
              id={`loc-address-${location.id}`}
              type="text"
              minLength={5}
              maxLength={200}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
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

export function LocationsManagement({ locations }: Props) {
  if (locations.length === 0) {
    return <p>No approved locations found.</p>;
  }

  return (
    <ul className={styles.list}>
      {locations.map((location) => (
        <LocationItem key={location.id} location={location} />
      ))}
    </ul>
  );
}
