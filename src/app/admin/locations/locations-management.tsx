"use client";

import { type FormEvent, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getApiError, jsonRequest } from "@/lib/client-api";
import { LOCATION_TYPE_LABELS, LOCATION_TYPE_OPTIONS } from "@/lib/display";
import type { Location, LocationType } from "@/lib/types";
import styles from "./locations.module.css";

type LocationRow = Pick<
  Location,
  "id" | "name" | "locationType" | "district" | "address" | "status"
>;

type Props = {
  locations: LocationRow[];
};

function LocationItem({ location }: { location: LocationRow }) {
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
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
        ...jsonRequest("PUT", { body: { name, locationType, district, address } }),
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
      const response = await fetch(`/api/v1/moderation/locations/${location.id}`, {
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
        <span className={styles.rowTitle}>{location.name}</span>
        <span className={styles.rowStatus}>{LOCATION_TYPE_LABELS[location.locationType]}</span>
        <span className={styles.rowIcon}>{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className={styles.rowBody}>
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
                  {LOCATION_TYPE_OPTIONS.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
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
        </div>
      )}
    </li>
  );
}

export function LocationsManagement({ locations }: Props) {
  const [search, setSearch] = useState("");

  const filteredLocations = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        LOCATION_TYPE_LABELS[l.locationType].toLowerCase().includes(q) ||
        l.district.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q),
    );
  }, [locations, search]);

  return (
    <div className={styles.container}>
      <div className={styles.searchBar}>
        <label htmlFor="search-locations">Search locations</label>
        <input
          id="search-locations"
          type="search"
          placeholder="Search by name, type, district, address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {filteredLocations.length === 0 ? (
        <p className={styles.empty}>No approved locations found matching your search.</p>
      ) : (
        <ul className={styles.list}>
          {filteredLocations.map((location) => (
            <LocationItem key={location.id} location={location} />
          ))}
        </ul>
      )}
    </div>
  );
}
