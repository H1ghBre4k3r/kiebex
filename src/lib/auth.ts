import "server-only";

import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { AuthUser } from "@/lib/types";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE_NAME = "kbi_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

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

export async function authenticateUser(input: {
  email: string;
  password: string;
}): Promise<AuthUser | null> {
  const email = normalizeEmail(input.email);

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    return null;
  }

  const validPassword = await verifyPassword(input.password, user.passwordHash);

  if (!validPassword) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
  };
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
    await db.session.deleteMany({
      where: {
        tokenHash: hashSessionToken(token),
      },
    });
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
