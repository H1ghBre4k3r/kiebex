import { updateDisplayName, updatePassword } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { parseJsonBody, withApiAuth, withMetrics } from "@/lib/route-handlers";
import { updateProfileBodySchema } from "@/lib/validation";

async function getProfile(): Promise<Response> {
  return withApiAuth(async (user) => {
    return jsonOk({ user });
  });
}

async function patchProfile(request: Request): Promise<Response> {
  return withApiAuth(async (user) => {
    const parsed = await parseJsonBody(request, updateProfileBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const { displayName, currentPassword, newPassword } = parsed.data;

    let updatedUser = user;

    if (displayName) {
      updatedUser = await updateDisplayName(user.id, displayName);
    }

    if (newPassword && currentPassword) {
      const result = await updatePassword(user.id, currentPassword, newPassword);

      if (!result.ok) {
        return jsonError(400, "WRONG_PASSWORD", "Current password is incorrect.");
      }
    }

    return jsonOk({ user: updatedUser });
  });
}

export const GET = withMetrics("GET", "/api/v1/auth/profile", getProfile);
export const PATCH = withMetrics("PATCH", "/api/v1/auth/profile", patchProfile);
