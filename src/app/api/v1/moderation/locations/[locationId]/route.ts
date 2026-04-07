import { ForbiddenError, UnauthorizedError, requireModeratorUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { moderateLocationSubmission } from "@/lib/query";
import { moderationDecisionSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ locationId: string }> },
): Promise<Response> {
  try {
    await requireModeratorUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    if (error instanceof ForbiddenError) {
      return jsonError(403, "FORBIDDEN", "Moderator permissions required.");
    }

    throw error;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = moderationDecisionSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      400,
      "INVALID_BODY",
      "One or more fields are invalid.",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const { locationId } = await context.params;
  const location = await moderateLocationSubmission(locationId, parsed.data.status);

  if (!location) {
    return jsonError(
      404,
      "LOCATION_SUBMISSION_NOT_FOUND",
      `No pending location submission found for id '${locationId}'.`,
    );
  }

  return jsonOk({ location });
}
