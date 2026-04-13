"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { jsonInit } from "@/lib/client-api";
import { runAdminMutation } from "@/app/admin/management-client";
import { ManagementItem } from "@/app/admin/management-item";
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
    <ManagementItem
      title={
        <>
          {user.displayName} <span className={styles.rowEmail}>({user.email})</span>
        </>
      }
      status={user.role}
      expanded={expanded}
      onToggle={() => setExpanded((prev) => !prev)}
    >
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
    </ManagementItem>
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

  async function runUserMutation(params: {
    userId: string;
    setPending: (userId: string | null) => void;
    input: RequestInfo | URL;
    init: RequestInit;
    fallbackMessage: string;
    successMessage: string;
    refresh?: boolean;
  }) {
    setFeedback(null);
    params.setPending(params.userId);

    const result = await runAdminMutation({
      input: params.input,
      init: params.init,
      fallbackMessage: params.fallbackMessage,
      refresh: params.refresh ? () => router.refresh() : undefined,
    });

    if (!result.ok) {
      setFeedback({ kind: "error", message: result.message });
      params.setPending(null);
      return;
    }

    setFeedback({ kind: "success", message: params.successMessage });
    params.setPending(null);
  }

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

    await runUserMutation({
      userId,
      setPending: setPendingUserId,
      input: `/api/v1/admin/users/${userId}/role`,
      init: jsonInit("PATCH", { body: { role } }),
      fallbackMessage: "Unable to update user role.",
      successMessage: "User role updated.",
      refresh: true,
    });
  }

  async function verifyUser(userId: string) {
    await runUserMutation({
      userId,
      setPending: setVerifyingUserId,
      input: `/api/v1/admin/users/${userId}/verify`,
      init: { method: "POST" },
      fallbackMessage: "Unable to verify user.",
      successMessage: "User email verified.",
      refresh: true,
    });
  }

  async function resendVerification(userId: string) {
    await runUserMutation({
      userId,
      setPending: setResendingUserId,
      input: `/api/v1/admin/users/${userId}/resend-verification`,
      init: { method: "POST" },
      fallbackMessage: "Unable to resend verification email.",
      successMessage: "Verification email sent.",
    });
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
