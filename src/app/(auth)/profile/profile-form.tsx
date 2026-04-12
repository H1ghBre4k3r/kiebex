"use client";

import { type FormEvent, useState } from "react";
import { jsonRequest, requestApi } from "@/lib/client-api";
import styles from "../auth.module.css";

type ProfileResponse = { user?: { displayName?: string } };

type Props = {
  initialDisplayName: string;
  currentEmail: string;
  pendingEmail: string | null;
};

export function ProfileForm({ initialDisplayName, currentEmail, pendingEmail }: Props) {
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

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailPending, setEmailPending] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleDisplayNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (displayNamePending) {
      return;
    }

    setDisplayNamePending(true);
    setDisplayNameMessage(null);
    setDisplayNameError(null);

    const result = await requestApi<ProfileResponse>(
      "/api/v1/auth/profile",
      jsonRequest("PATCH", { body: { displayName } }),
      "Unable to update display name. Please try again.",
    );

    if (!result.ok) {
      setDisplayNameError(result.message);
    } else {
      const updated = result.data?.user?.displayName;

      if (updated) {
        setDisplayName(updated);
      }

      setDisplayNameMessage("Display name updated.");
    }

    setDisplayNamePending(false);
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

    const result = await requestApi<null>(
      "/api/v1/auth/profile",
      jsonRequest("PATCH", { body: { currentPassword, newPassword } }),
      "Unable to update password. Please try again.",
    );

    if (!result.ok) {
      setPasswordError(result.message);
    } else {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated.");
    }

    setPasswordPending(false);
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (emailPending) {
      return;
    }

    setEmailPending(true);
    setEmailMessage(null);
    setEmailError(null);

    const requestedEmail = newEmail;
    const result = await requestApi<null>(
      "/api/v1/auth/change-email",
      jsonRequest("POST", { body: { newEmail, currentPassword: emailPassword } }),
      "Unable to request email change. Please try again.",
    );

    if (!result.ok) {
      setEmailError(result.message);
    } else {
      setNewEmail("");
      setEmailPassword("");
      setEmailMessage(`Verification email sent to ${requestedEmail}. Click the link to confirm.`);
    }

    setEmailPending(false);
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

      <section className={styles.panel} aria-labelledby="email-heading">
        <h2 id="email-heading">Change Email</h2>

        <p className={styles.notice}>
          Current email: <strong>{currentEmail}</strong>
        </p>

        {pendingEmail && (
          <p className={styles.notice} role="status">
            A verification email was sent to <strong>{pendingEmail}</strong>. Click the link in that
            email to confirm the change.
          </p>
        )}

        <form className={styles.form} onSubmit={handleEmailSubmit}>
          <label className={styles.field} htmlFor="profile-new-email">
            New Email Address
            <input
              id="profile-new-email"
              name="newEmail"
              type="email"
              autoComplete="email"
              required
              maxLength={255}
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
            />
          </label>

          <label className={styles.field} htmlFor="profile-email-password">
            Current Password
            <input
              id="profile-email-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={emailPassword}
              onChange={(event) => setEmailPassword(event.target.value)}
            />
          </label>

          {emailError && (
            <p className={styles.error} role="alert" aria-live="polite">
              {emailError}
            </p>
          )}

          {emailMessage && (
            <p className={styles.notice} role="status" aria-live="polite">
              {emailMessage}
            </p>
          )}

          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={emailPending}>
              {emailPending ? "Sending..." : "Send Verification Email"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
