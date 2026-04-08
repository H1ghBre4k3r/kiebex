"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import styles from "./contribute.module.css";

type ApiResponse = {
  status?: "ok" | "error";
  error?: {
    message?: string;
  };
};

const locationTypes = [
  { value: "pub", label: "Pub" },
  { value: "bar", label: "Bar" },
  { value: "restaurant", label: "Restaurant" },
  { value: "supermarket", label: "Supermarket" },
] as const;

export function LocationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [locationType, setLocationType] = useState<(typeof locationTypes)[number]["value"]>("pub");
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

    try {
      const response = await fetch("/api/v1/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          locationType,
          district,
          address,
        }),
      });

      const body = (await response.json().catch(() => null)) as ApiResponse | null;

      if (!response.ok) {
        setErrorMessage(body?.error?.message ?? "Unable to submit location.");
        setPending(false);
        return;
      }

      setName("");
      setLocationType("pub");
      setDistrict("");
      setAddress("");
      setSuccessMessage("Location submitted for moderation.");
      setPending(false);
      router.refresh();
    } catch {
      setErrorMessage("Unable to submit location.");
      setPending(false);
    }
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
            setLocationType(event.target.value as (typeof locationTypes)[number]["value"])
          }
        >
          {locationTypes.map((type) => (
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
