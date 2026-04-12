import "server-only";

import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import type { AuthUser, UserRole } from "@/lib/types";

export async function requirePageAuthUser(): Promise<AuthUser> {
  const user = await getCurrentAuthUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requirePageRole(allowedRoles: readonly UserRole[]): Promise<AuthUser> {
  const user = await requirePageAuthUser();

  if (!allowedRoles.includes(user.role)) {
    redirect("/");
  }

  return user;
}

export async function requireAdminPageUser(): Promise<AuthUser> {
  return requirePageRole(["admin"]);
}

export async function requireModeratorPageUser(): Promise<AuthUser> {
  return requirePageRole(["moderator", "admin"]);
}
