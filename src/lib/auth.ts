import "server-only";

import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { AuthUser } from "@/lib/types";
import { logger } from "@/lib/logger";
import { getRequestContext, setUserId } from "@/lib/request-context";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE_NAME = "kbi_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const VERIFICATION_TOKEN_DURATION_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TOKEN_DURATION_MS = 60 * 60 * 1000; // 1 hour

const authUserSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
} as const;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(displayName: string): string {
  return displayName.trim();
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Prisma.PrismaClientKnownRequestError).code === "P2002"
  );
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Insufficient permissions.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, hashHex] = storedHash.split("$");

  if (algorithm !== "scrypt" || !salt || !hashHex) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const expectedHash = Buffer.from(hashHex, "hex");

  if (expectedHash.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(expectedHash, derivedKey);
}

export async function registerUser(input: {
  email: string;
  displayName: string;
  password: string;
}): Promise<{ ok: true; user: AuthUser } | { ok: false; code: "EMAIL_TAKEN" }> {
  const email = normalizeEmail(input.email);
  const displayName = normalizeDisplayName(input.displayName);
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await db.user.create({
      data: {
        email,
        displayName,
        passwordHash,
      },
      select: authUserSelect,
    });

    // Log registration event
    try {
      const ctx = getRequestContext();
      logger.info("auth.register", { userId: user.id, requestId: ctx?.requestId });
    } catch {
      /* ignore logging failures */
    }

    return {
      ok: true,
      user,
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        code: "EMAIL_TAKEN",
      };
    }

    throw error;
  }
}

export type AuthenticateResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: "INVALID_CREDENTIALS" | "EMAIL_NOT_VERIFIED" | "ACCOUNT_BANNED" };

export async function authenticateUser(input: {
  email: string;
  password: string;
}): Promise<AuthenticateResult> {
  const email = normalizeEmail(input.email);

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      passwordHash: true,
      emailVerified: true,
      isBanned: true,
    },
  });

  if (!user?.passwordHash) {
    // No account with that email (do not reveal)
    try {
      const ctx = getRequestContext();
      logger.warn("auth.login.failure", { reason: "wrong_password", requestId: ctx?.requestId });
    } catch {
      /* ignore */
    }

    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  const validPassword = await verifyPassword(input.password, user.passwordHash);

  if (!validPassword) {
    try {
      const ctx = getRequestContext();
      logger.warn("auth.login.failure", {
        reason: "wrong_password",
        userId: user.id,
        requestId: ctx?.requestId,
      });
    } catch {
      /* ignore */
    }

    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  if (!user.emailVerified) {
    try {
      const ctx = getRequestContext();
      logger.warn("auth.login.failure", {
        reason: "unverified",
        userId: user.id,
        requestId: ctx?.requestId,
      });
    } catch {
      /* ignore */
    }

    return { ok: false, reason: "EMAIL_NOT_VERIFIED" };
  }

  if (user.isBanned) {
    try {
      const ctx = getRequestContext();
      logger.warn("auth.login.failure", {
        reason: "banned",
        userId: user.id,
        requestId: ctx?.requestId,
      });
    } catch {
      /* ignore */
    }

    return { ok: false, reason: "ACCOUNT_BANNED" };
  }

  // Successful authentication — record userId in context for downstream logs
  try {
    setUserId(user.id);
    const ctx = getRequestContext();
    logger.info("auth.login", { userId: user.id, requestId: ctx?.requestId });
  } catch {
    /* ignore logging failures */
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    },
  };
}

export async function createEmailVerificationToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashVerificationToken(token);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_DURATION_MS);

  // Invalidate any existing tokens for this user before creating a new one.
  await db.emailVerificationToken.deleteMany({ where: { userId } });

  await db.emailVerificationToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return token;
}

export type VerifyEmailResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" | "email_conflict" };

export async function verifyEmailToken(rawToken: string): Promise<VerifyEmailResult> {
  const tokenHash = hashVerificationToken(rawToken);

  const record = await db.emailVerificationToken.findUnique({
    where: {
      tokenHash,
    },
    select: {
      userId: true,
      expiresAt: true,
    },
  });

  if (!record) {
    return { ok: false, reason: "invalid" };
  }

  if (record.expiresAt <= new Date()) {
    await db.emailVerificationToken.deleteMany({ where: { tokenHash } });
    return { ok: false, reason: "expired" };
  }

  // Check whether this is an email-change verification.
  const user = await db.user.findUnique({
    where: { id: record.userId },
    select: { pendingEmail: true },
  });

  if (user?.pendingEmail) {
    try {
      await db.user.update({
        where: { id: record.userId },
        data: { email: user.pendingEmail, pendingEmail: null, emailVerified: true },
      });
    } catch {
      // The target email was claimed by another account before verification completed.
      await db.user.update({ where: { id: record.userId }, data: { pendingEmail: null } });
      await db.emailVerificationToken.deleteMany({ where: { tokenHash } });
      return { ok: false, reason: "email_conflict" };
    }
  } else {
    await db.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    });
  }

  await db.emailVerificationToken.deleteMany({ where: { tokenHash } });

  // Log email verification
  try {
    const ctx = getRequestContext();
    logger.info("auth.email_verified", { userId: record.userId, requestId: ctx?.requestId });
  } catch {
    /* ignore */
  }

  return { ok: true, userId: record.userId };
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = newSessionExpiry();

  await db.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    // Attempt to find the session to extract userId for logging before deletion.
    const session = await db.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      select: { userId: true },
    });

    try {
      const ctx = getRequestContext();
      if (session?.userId) {
        logger.info("auth.logout", { userId: session.userId, requestId: ctx?.requestId });
      }
    } catch {
      /* ignore */
    }

    await db.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await db.session.findUnique({
    where: {
      tokenHash: hashSessionToken(token),
    },
    select: {
      expiresAt: true,
      user: {
        select: authUserSelect,
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    return null;
  }

  return session.user;
}

export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getCurrentAuthUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}

export async function requireModeratorUser(): Promise<AuthUser> {
  const user = await requireAuthUser();

  if (user.role !== "moderator" && user.role !== "admin") {
    throw new ForbiddenError();
  }

  return user;
}

export async function requireAdminUser(): Promise<AuthUser> {
  const user = await requireAuthUser();

  if (user.role !== "admin") {
    throw new ForbiddenError();
  }

  return user;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<AuthUser> {
  const normalized = normalizeDisplayName(displayName);

  return db.user.update({
    where: { id: userId },
    data: { displayName: normalized },
    select: authUserSelect,
  });
}

export async function updatePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; code: "WRONG_PASSWORD" }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return { ok: false, code: "WRONG_PASSWORD" };
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);

  if (!valid) {
    return { ok: false, code: "WRONG_PASSWORD" };
  }

  const passwordHash = await hashPassword(newPassword);

  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { ok: true };
}

export async function requestEmailChange(
  userId: string,
  newEmail: string,
  currentPassword: string,
): Promise<
  { ok: true; token: string } | { ok: false; code: "WRONG_PASSWORD" | "EMAIL_TAKEN" | "SAME_EMAIL" }
> {
  const normalized = normalizeEmail(newEmail);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return { ok: false, code: "WRONG_PASSWORD" };
  }

  if (user.email === normalized) {
    return { ok: false, code: "SAME_EMAIL" };
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);

  if (!valid) {
    return { ok: false, code: "WRONG_PASSWORD" };
  }

  const existing = await db.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });

  if (existing) {
    return { ok: false, code: "EMAIL_TAKEN" };
  }

  await db.user.update({ where: { id: userId }, data: { pendingEmail: normalized } });

  const token = await createEmailVerificationToken(userId);

  return { ok: true, token };
}

/**
 * Generates a password reset token and stores its hash.
 * Always returns ok: true to prevent email enumeration — callers must send
 * the token only when the user actually exists.
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_DURATION_MS);

  // Invalidate any existing reset tokens for this user.
  await db.passwordResetToken.deleteMany({ where: { userId } });

  await db.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return token;
}

export type RequestPasswordResetResult =
  | { ok: true; userId: string; token: string }
  | { ok: false; reason: "USER_NOT_FOUND" };

/** Looks up a user by email and creates a reset token. */
export async function requestPasswordReset(email: string): Promise<RequestPasswordResetResult> {
  const normalized = normalizeEmail(email);

  const user = await db.user.findUnique({
    where: { email: normalized },
    select: { id: true, emailVerified: true, isBanned: true },
  });

  // Do not reveal whether an account exists — still return a stable response.
  // But only create a token for active (verified, non-banned) accounts.
  if (!user || !user.emailVerified || user.isBanned) {
    return { ok: false, reason: "USER_NOT_FOUND" };
  }

  const token = await createPasswordResetToken(user.id);

  try {
    const ctx = getRequestContext();
    logger.info("auth.password_reset.requested", { userId: user.id, requestId: ctx?.requestId });
  } catch {
    /* ignore */
  }

  return { ok: true, userId: user.id, token };
}

export type ResetPasswordResult = { ok: true } | { ok: false; reason: "invalid" | "expired" };

/** Validates the reset token and updates the user's password. */
export async function resetPassword(
  rawToken: string,
  newPassword: string,
): Promise<ResetPasswordResult> {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { userId: true, expiresAt: true },
  });

  if (!record) {
    return { ok: false, reason: "invalid" };
  }

  if (record.expiresAt <= new Date()) {
    await db.passwordResetToken.deleteMany({ where: { tokenHash } });
    return { ok: false, reason: "expired" };
  }

  const passwordHash = await hashPassword(newPassword);

  // Update password, delete the reset token, and invalidate all sessions
  // so any existing logins are signed out.
  await db.user.update({
    where: { id: record.userId },
    data: {
      passwordHash,
      sessions: { deleteMany: {} },
      passwordResetTokens: { deleteMany: {} },
    },
  });

  try {
    const ctx = getRequestContext();
    logger.info("auth.password_reset.completed", {
      userId: record.userId,
      requestId: ctx?.requestId,
    });
  } catch {
    /* ignore */
  }

  return { ok: true };
}
