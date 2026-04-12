"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { getApiError, jsonRequest } from "@/lib/client-api";
import { formatDate } from "@/lib/display";
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

function UserItem({
  user,
  currentAdminId,
  selectedRole,
  onRoleChange,
  onSaveRole,
  onVerifyEmail,
  onResendVerification,
  pending,
  verifying,
  resending,
}: {
  user: UserForAdmin;
  currentAdminId: string;
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onSaveRole: () => void;
  onVerifyEmail: () => void;
  onResendVerification: () => void;
  pending: boolean;
  verifying: boolean;
  resending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const roleChanged = selectedRole !== user.role;

  return (
    <li className={`${styles.item} ${expanded ? styles.expanded : ""}`}>
      <button
        type="button"
        className={styles.rowHeader}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <span className={styles.rowTitle}>
          {user.displayName} <span className={styles.rowEmail}>({user.email})</span>
        </span>
        <span className={styles.rowStatus}>{user.role}</span>
        <span className={styles.rowIcon}>{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className={styles.rowBody}>
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
            <p>Joined: {formatDate(user.createdAt)}</p>
          </div>

          <div className={styles.controls}>
            <label htmlFor={`role-${user.id}`}>Role</label>
            <select
              id={`role-${user.id}`}
              value={selectedRole}
              onChange={(event) => onRoleChange(event.target.value as UserRole)}
              disabled={pending}
            >
              <option value="user">user</option>
              <option value="moderator">moderator</option>
              <option value="admin">admin</option>
            </select>

            <button type="button" disabled={pending || !roleChanged} onClick={onSaveRole}>
              {pending ? "Saving..." : "Save Role"}
            </button>

            {!user.emailVerified && (
              <button
                type="button"
                className={styles.verifyButton}
                disabled={verifying}
                onClick={onVerifyEmail}
              >
                {verifying ? "Verifying..." : "Verify Email"}
              </button>
            )}

            {!user.emailVerified && (
              <button type="button" disabled={resending} onClick={onResendVerification}>
                {resending ? "Sending..." : "Resend Verification Email"}
              </button>
            )}
          </div>

          {user.id === currentAdminId && (
            <p className={styles.notice}>This is your account. Last-admin protection applies.</p>
          )}
        </div>
      )}
    </li>
  );
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
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, search]);

  async function updateRole(userId: string) {
    const role = selectedRoles[userId];

    if (!role) {
      return;
    }

    setFeedback(null);
    setPendingUserId(userId);

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/role`, {
        ...jsonRequest("PATCH", { body: { role } }),
      });

      if (!response.ok) {
        const { message } = await getApiError(response, "Unable to update user role.");
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
        const { message } = await getApiError(response, "Unable to verify user.");
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
        const { message } = await getApiError(response, "Unable to resend verification email.");
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

      <div className={styles.container}>
        <div className={styles.searchBar}>
          <label htmlFor="search-users">Search users</label>
          <input
            id="search-users"
            type="search"
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {filteredUsers.length === 0 ? (
          <p className={styles.empty}>No users found matching your search.</p>
        ) : (
          <ul className={styles.list}>
            {filteredUsers.map((user) => (
              <UserItem
                key={user.id}
                user={user}
                currentAdminId={currentAdminId}
                selectedRole={selectedRoles[user.id] ?? user.role}
                onRoleChange={(role) =>
                  setSelectedRoles((current) => ({ ...current, [user.id]: role }))
                }
                onSaveRole={() => updateRole(user.id)}
                onVerifyEmail={() => verifyUser(user.id)}
                onResendVerification={() => resendVerification(user.id)}
                pending={pendingUserId === user.id}
                verifying={verifyingUserId === user.id}
                resending={resendingUserId === user.id}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
