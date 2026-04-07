import { ForbiddenError, UnauthorizedError, requireAdminUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getUsersForAdmin } from "@/lib/query";

export async function GET(): Promise<Response> {
  try {
    await requireAdminUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    if (error instanceof ForbiddenError) {
      return jsonError(403, "FORBIDDEN", "Admin permissions required.");
    }

    throw error;
  }

  const users = await getUsersForAdmin();
  return jsonOk({ users });
}
