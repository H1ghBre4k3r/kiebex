"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserRole } from "@/lib/types";
import styles from "./users.module.css";

type UserForAdmin = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
};

type UsersManagementProps = {
  currentAdminId: string;
  users: UserForAdmin[];
};

type ApiErrorResponse = {
  status?: "error";
  error?: {
    message?: string;
  };
};

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
  return body?.error?.message ?? fallback;
}

export function UsersManagement({ currentAdminId, users }: UsersManagementProps) {
  const router = useRouter();
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>(
    Object.fromEntries(users.map((user) => [user.id, user.role])),
  );
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [verifyingUserId, setVerifyingUserId] = useState<string | null>(null);
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string } | null>(
    null,
  );

  async function updateRole(userId: string) {
    const role = selectedRoles[userId];

    if (!role) {
      return;
    }

    setFeedback(null);
    setPendingUserId(userId);

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response, "Unable to update user role.");
        setFeedback({ kind: "error", message });
        setPendingUserId(null);
        return;
      }

      setFeedback({ kind: "success", message: "User role updated." });
      setPendingUserId(null);
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Unable to update user role." });
      setPendingUserId(null);
    }
  }

  async function verifyUser(userId: string) {
    setFeedback(null);
    setVerifyingUserId(userId);

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/verify`, {
        method: "POST",
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response, "Unable to verify user.");
        setFeedback({ kind: "error", message });
        setVerifyingUserId(null);
        return;
      }

      setFeedback({ kind: "success", message: "User email verified." });
      setVerifyingUserId(null);
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Unable to verify user." });
      setVerifyingUserId(null);
    }
  }

  async function resendVerification(userId: string) {
    setFeedback(null);
    setResendingUserId(userId);

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/resend-verification`, {
        method: "POST",
      });

      if (!response.ok) {
        const message = await parseErrorMessage(response, "Unable to resend verification email.");
        setFeedback({ kind: "error", message });
        setResendingUserId(null);
        return;
      }

      setFeedback({ kind: "success", message: "Verification email sent." });
      setResendingUserId(null);
    } catch {
      setFeedback({ kind: "error", message: "Unable to resend verification email." });
      setResendingUserId(null);
    }
  }

  return (
    <section className={styles.panel} aria-labelledby="users-management-heading">
      <h2 id="users-management-heading">Users ({users.length})</h2>

      {feedback && (
        <p className={feedback.kind === "error" ? styles.error : styles.success} role="status">
          {feedback.message}
        </p>
      )}

      <ul className={styles.list}>
        {users.map((user) => {
          const pending = pendingUserId === user.id;
          const verifying = verifyingUserId === user.id;
          const resending = resendingUserId === user.id;
          const roleChanged = selectedRoles[user.id] !== user.role;

          return (
            <li key={user.id} className={styles.item}>
              <div className={styles.meta}>
                <p>
                  <strong>{user.displayName}</strong> ({user.email})
                </p>
                <p>Current role: {user.role}</p>
                <p>
                  Email:{" "}
                  {user.emailVerified ? (
                    <span className={styles.verified}>verified</span>
                  ) : (
                    <span className={styles.unverified}>unverified</span>
                  )}
                </p>
                <p>Joined: {new Date(user.createdAt).toLocaleDateString("en-GB")}</p>
              </div>

              <div className={styles.controls}>
                <label htmlFor={`role-${user.id}`}>Role</label>
                <select
                  id={`role-${user.id}`}
                  value={selectedRoles[user.id] ?? user.role}
                  onChange={(event) =>
                    setSelectedRoles((current) => ({
                      ...current,
                      [user.id]: event.target.value as UserRole,
                    }))
                  }
                  disabled={pending}
                >
                  <option value="user">user</option>
                  <option value="moderator">moderator</option>
                  <option value="admin">admin</option>
                </select>

                <button
                  type="button"
                  disabled={pending || !roleChanged}
                  onClick={() => updateRole(user.id)}
                >
                  {pending ? "Saving..." : "Save Role"}
                </button>

                {!user.emailVerified && (
                  <button
                    type="button"
                    className={styles.verifyButton}
                    disabled={verifying}
                    onClick={() => verifyUser(user.id)}
                  >
                    {verifying ? "Verifying..." : "Verify Email"}
                  </button>
                )}

                {!user.emailVerified && (
                  <button
                    type="button"
                    disabled={resending}
                    onClick={() => resendVerification(user.id)}
                  >
                    {resending ? "Sending..." : "Resend Verification Email"}
                  </button>
                )}
              </div>

              {user.id === currentAdminId && (
                <p className={styles.notice}>
                  This is your account. Last-admin protection applies.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
