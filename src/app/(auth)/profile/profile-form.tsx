"use client";

import { type FormEvent, useState } from "react";
import styles from "../auth.module.css";

type ApiErrorBody = {
  status?: "error";
  error?: { message?: string };
};

type ApiSuccessBody = {
  status?: "ok";
  data?: { user?: { displayName?: string } };
};

type Props = {
  initialDisplayName: string;
};

export function ProfileForm({ initialDisplayName }: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [displayNamePending, setDisplayNamePending] = useState(false);
  const [displayNameMessage, setDisplayNameMessage] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleDisplayNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (displayNamePending) {
      return;
    }

    setDisplayNamePending(true);
    setDisplayNameMessage(null);
    setDisplayNameError(null);

    try {
      const response = await fetch("/api/v1/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setDisplayNameError(
          body?.error?.message ?? "Unable to update display name. Please try again.",
        );
        return;
      }

      const body = (await response.json().catch(() => null)) as ApiSuccessBody | null;
      const updated = body?.data?.user?.displayName;

      if (updated) {
        setDisplayName(updated);
      }

      setDisplayNameMessage("Display name updated.");
    } catch {
      setDisplayNameError("Unable to update display name. Please try again.");
    } finally {
      setDisplayNamePending(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (passwordPending) {
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordPending(true);
    setPasswordMessage(null);
    setPasswordError(null);

    try {
      const response = await fetch("/api/v1/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setPasswordError(body?.error?.message ?? "Unable to update password. Please try again.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated.");
    } catch {
      setPasswordError("Unable to update password. Please try again.");
    } finally {
      setPasswordPending(false);
    }
  }

  return (
    <div>
      <section className={styles.panel} aria-labelledby="display-name-heading">
        <h2 id="display-name-heading">Display Name</h2>

        <form className={styles.form} onSubmit={handleDisplayNameSubmit}>
          <label className={styles.field} htmlFor="profile-display-name">
            Display Name
            <input
              id="profile-display-name"
              name="displayName"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>

          {displayNameError && (
            <p className={styles.error} role="alert" aria-live="polite">
              {displayNameError}
            </p>
          )}

          {displayNameMessage && (
            <p className={styles.notice} role="status" aria-live="polite">
              {displayNameMessage}
            </p>
          )}

          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={displayNamePending}>
              {displayNamePending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.panel} aria-labelledby="password-heading">
        <h2 id="password-heading">Change Password</h2>

        <form className={styles.form} onSubmit={handlePasswordSubmit}>
          <label className={styles.field} htmlFor="profile-current-password">
            Current Password
            <input
              id="profile-current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>

          <label className={styles.field} htmlFor="profile-new-password">
            New Password
            <input
              id="profile-new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>

          <label className={styles.field} htmlFor="profile-confirm-password">
            Confirm New Password
            <input
              id="profile-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>

          <p className={styles.notice}>Use at least 8 characters with letters and numbers.</p>

          {passwordError && (
            <p className={styles.error} role="alert" aria-live="polite">
              {passwordError}
            </p>
          )}

          {passwordMessage && (
            <p className={styles.notice} role="status" aria-live="polite">
              {passwordMessage}
            </p>
          )}

          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={passwordPending}>
              {passwordPending ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
