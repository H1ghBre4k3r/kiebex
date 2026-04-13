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
  isBanned: boolean;
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
  onBan,
  onUnban,
  onDelete,
  pending,
  verifying,
  resending,
  banning,
  unbanning,
  deleting,
}: {
  user: UserForAdmin;
  currentAdminId: string;
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onSaveRole: () => void;
  onVerifyEmail: () => void;
  onResendVerification: () => void;
  onBan: () => void;
  onUnban: () => void;
  onDelete: () => void;
  pending: boolean;
  verifying: boolean;
  resending: boolean;
  banning: boolean;
  unbanning: boolean;
  deleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const roleChanged = selectedRole !== user.role;
  const isSelf = user.id === currentAdminId;
  const anyPending = pending || verifying || resending || banning || unbanning || deleting;

  return (
    <ManagementItem
      title={
        <>
          {user.displayName} <span className={styles.rowEmail}>({user.email})</span>
        </>
      }
      status={user.isBanned ? "banned" : user.role}
      statusExtra={
        !user.isBanned ? (
          <span className={user.emailVerified ? styles.verifiedChip : styles.unverifiedChip}>
            {user.emailVerified ? "verified" : "unverified"}
          </span>
        ) : undefined
      }
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
            <span className={styles.verifiedChip}>verified</span>
          ) : (
            <span className={styles.unverifiedChip}>unverified</span>
          )}
        </p>
        {user.isBanned && <p className={styles.bannedNotice}>This account is banned.</p>}
        <p>Joined: {formatDate(user.createdAt)}</p>
      </div>

      <div className={styles.controls}>
        <label htmlFor={`role-${user.id}`}>Role</label>
        <select
          id={`role-${user.id}`}
          value={selectedRole}
          onChange={(event) => onRoleChange(event.target.value as UserRole)}
          disabled={anyPending}
        >
          <option value="user">user</option>
          <option value="moderator">moderator</option>
          <option value="admin">admin</option>
        </select>

        <button type="button" disabled={anyPending || !roleChanged} onClick={onSaveRole}>
          {pending ? "Saving..." : "Save Role"}
        </button>

        {!user.emailVerified && !user.isBanned && (
          <button
            type="button"
            className={styles.verifyButton}
            disabled={anyPending}
            onClick={onVerifyEmail}
          >
            {verifying ? "Verifying..." : "Verify Email"}
          </button>
        )}

        {!user.emailVerified && !user.isBanned && (
          <button type="button" disabled={anyPending} onClick={onResendVerification}>
            {resending ? "Sending..." : "Resend Verification Email"}
          </button>
        )}

        {!isSelf && !user.isBanned && (
          <button type="button" className={styles.banButton} disabled={anyPending} onClick={onBan}>
            {banning ? "Banning..." : "Ban User"}
          </button>
        )}

        {!isSelf && user.isBanned && (
          <button
            type="button"
            className={styles.unbanButton}
            disabled={anyPending}
            onClick={onUnban}
          >
            {unbanning ? "Unbanning..." : "Unban User"}
          </button>
        )}

        {!isSelf && !confirmDelete && (
          <button
            type="button"
            className={styles.deleteButton}
            disabled={anyPending}
            onClick={() => setConfirmDelete(true)}
          >
            Delete User
          </button>
        )}

        {!isSelf && confirmDelete && (
          <span className={styles.confirmRow}>
            <span className={styles.confirmLabel}>Permanently delete this account?</span>
            <button
              type="button"
              className={styles.deleteButton}
              disabled={anyPending}
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </button>
            <button type="button" disabled={anyPending} onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </span>
        )}
      </div>

      {isSelf && (
        <p className={styles.notice}>This is your account. Last-admin protection applies.</p>
      )}
    </ManagementItem>
  );
}

function UserGroup({
  heading,
  headingId,
  users,
  currentAdminId,
  selectedRoles,
  onRoleChange,
  onSaveRole,
  onVerifyEmail,
  onResendVerification,
  onBan,
  onUnban,
  onDelete,
  pendingUserId,
  verifyingUserId,
  resendingUserId,
  banningUserId,
  unbanningUserId,
  deletingUserId,
}: {
  heading: string;
  headingId: string;
  users: UserForAdmin[];
  currentAdminId: string;
  selectedRoles: Record<string, UserRole>;
  onRoleChange: (userId: string, role: UserRole) => void;
  onSaveRole: (userId: string) => void;
  onVerifyEmail: (userId: string) => void;
  onResendVerification: (userId: string) => void;
  onBan: (userId: string) => void;
  onUnban: (userId: string) => void;
  onDelete: (userId: string) => void;
  pendingUserId: string | null;
  verifyingUserId: string | null;
  resendingUserId: string | null;
  banningUserId: string | null;
  unbanningUserId: string | null;
  deletingUserId: string | null;
}) {
  if (users.length === 0) return null;

  return (
    <div className={styles.group}>
      <h3 id={headingId} className={styles.groupHeading}>
        {heading} <span className={styles.groupCount}>({users.length})</span>
      </h3>
      <ul className={styles.list} aria-labelledby={headingId}>
        {users.map((user) => (
          <UserItem
            key={user.id}
            user={user}
            currentAdminId={currentAdminId}
            selectedRole={selectedRoles[user.id] ?? user.role}
            onRoleChange={(role) => onRoleChange(user.id, role)}
            onSaveRole={() => onSaveRole(user.id)}
            onVerifyEmail={() => onVerifyEmail(user.id)}
            onResendVerification={() => onResendVerification(user.id)}
            onBan={() => onBan(user.id)}
            onUnban={() => onUnban(user.id)}
            onDelete={() => onDelete(user.id)}
            pending={pendingUserId === user.id}
            verifying={verifyingUserId === user.id}
            resending={resendingUserId === user.id}
            banning={banningUserId === user.id}
            unbanning={unbanningUserId === user.id}
            deleting={deletingUserId === user.id}
          />
        ))}
      </ul>
    </div>
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
  const [banningUserId, setBanningUserId] = useState<string | null>(null);
  const [unbanningUserId, setUnbanningUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
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

  const { verifiedUsers, unverifiedUsers, bannedUsers } = useMemo(() => {
    const q = search.toLowerCase();
    const matches = (u: UserForAdmin) =>
      !q ||
      u.email.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q);

    return {
      verifiedUsers: users.filter((u) => !u.isBanned && u.emailVerified && matches(u)),
      unverifiedUsers: users.filter((u) => !u.isBanned && !u.emailVerified && matches(u)),
      bannedUsers: users.filter((u) => u.isBanned && matches(u)),
    };
  }, [users, search]);

  const totalFiltered = verifiedUsers.length + unverifiedUsers.length + bannedUsers.length;

  async function updateRole(userId: string) {
    const role = selectedRoles[userId];
    if (!role) return;

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

  async function banUser(userId: string) {
    await runUserMutation({
      userId,
      setPending: setBanningUserId,
      input: `/api/v1/admin/users/${userId}/ban`,
      init: { method: "POST" },
      fallbackMessage: "Unable to ban user.",
      successMessage: "User banned and signed out.",
      refresh: true,
    });
  }

  async function unbanUser(userId: string) {
    await runUserMutation({
      userId,
      setPending: setUnbanningUserId,
      input: `/api/v1/admin/users/${userId}/unban`,
      init: { method: "POST" },
      fallbackMessage: "Unable to unban user.",
      successMessage: "User unbanned.",
      refresh: true,
    });
  }

  async function deleteUser(userId: string) {
    await runUserMutation({
      userId,
      setPending: setDeletingUserId,
      input: `/api/v1/admin/users/${userId}`,
      init: { method: "DELETE" },
      fallbackMessage: "Unable to delete user.",
      successMessage: "User account deleted.",
      refresh: true,
    });
  }

  const groupProps = {
    currentAdminId,
    selectedRoles,
    onRoleChange: (userId: string, role: UserRole) =>
      setSelectedRoles((current) => ({ ...current, [userId]: role })),
    onSaveRole: updateRole,
    onVerifyEmail: verifyUser,
    onResendVerification: resendVerification,
    onBan: banUser,
    onUnban: unbanUser,
    onDelete: deleteUser,
    pendingUserId,
    verifyingUserId,
    resendingUserId,
    banningUserId,
    unbanningUserId,
    deletingUserId,
  };

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

        {totalFiltered === 0 ? (
          <p className={styles.empty}>No users found matching your search.</p>
        ) : (
          <>
            <UserGroup
              heading="Verified"
              headingId="group-verified"
              users={verifiedUsers}
              {...groupProps}
            />
            <UserGroup
              heading="Unverified"
              headingId="group-unverified"
              users={unverifiedUsers}
              {...groupProps}
            />
            <UserGroup
              heading="Banned"
              headingId="group-banned"
              users={bannedUsers}
              {...groupProps}
            />
          </>
        )}
      </div>
    </section>
  );
}
