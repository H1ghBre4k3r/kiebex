import { ForbiddenError, UnauthorizedError, requireModeratorUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { moderateBeerOfferSubmission } from "@/lib/query";
import { moderationDecisionSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ offerId: string }> },
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

  const { offerId } = await context.params;
  const result = await moderateBeerOfferSubmission(offerId, parsed.data.status);

  if (result.outcome !== "updated") {
    if (result.outcome === "missing") {
      return jsonError(
        404,
        "OFFER_SUBMISSION_NOT_FOUND",
        `No pending offer submission found for id '${offerId}'.`,
      );
    }

    if (result.outcome === "location_not_approved") {
      return jsonError(
        409,
        "LOCATION_NOT_APPROVED",
        "Cannot approve an offer while its location is not approved.",
      );
    }

    return jsonError(
      409,
      "VARIANT_NOT_APPROVED",
      "Cannot approve an offer while its variant or brand is not approved.",
    );
  }

  return jsonOk({ offer: result.offer });
}
