import { UnauthorizedError, requireAuthUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(): Promise<Response> {
  try {
    const user = await requireAuthUser();
    return jsonOk({ user });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    throw error;
  }
}
