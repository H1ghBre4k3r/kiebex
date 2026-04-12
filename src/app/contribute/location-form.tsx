"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { jsonInit, requestApi } from "@/lib/client-api";
import { LOCATION_TYPE_OPTIONS } from "@/lib/display";
import styles from "./contribute.module.css";

export function LocationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [locationType, setLocationType] =
    useState<(typeof LOCATION_TYPE_OPTIONS)[number]["value"]>("pub");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setPending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const result = await requestApi<null>(
      "/api/v1/locations",
      jsonInit("POST", {
        body: {
          name,
          locationType,
          district,
          address,
        },
      }),
      "Unable to submit location.",
    );

    if (!result.ok) {
      setErrorMessage(result.message);
    } else {
      setName("");
      setLocationType("pub");
      setDistrict("");
      setAddress("");
      setSuccessMessage("Location submitted for moderation.");
      router.refresh();
    }

    setPending(false);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field} htmlFor="location-name">
        Name
        <input
          id="location-name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label className={styles.field} htmlFor="location-type">
        Type
        <select
          id="location-type"
          name="locationType"
          value={locationType}
          onChange={(event) =>
            setLocationType(event.target.value as (typeof LOCATION_TYPE_OPTIONS)[number]["value"])
          }
        >
          {LOCATION_TYPE_OPTIONS.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field} htmlFor="location-district">
        District
        <input
          id="location-district"
          name="district"
          type="text"
          required
          minLength={2}
          maxLength={80}
          value={district}
          onChange={(event) => setDistrict(event.target.value)}
        />
      </label>

      <label className={styles.field} htmlFor="location-address">
        Address
        <input
          id="location-address"
          name="address"
          type="text"
          required
          minLength={5}
          maxLength={200}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
      </label>

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

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={pending}>
          {pending ? "Submitting..." : "Submit Location"}
        </button>
      </div>
    </form>
  );
}
