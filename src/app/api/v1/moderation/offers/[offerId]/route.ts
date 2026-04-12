import { ForbiddenError, UnauthorizedError, requireModeratorUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import {
  deleteModerationOffer,
  editModerationOffer,
  logModerationAction,
  moderateBeerOfferSubmission,
} from "@/lib/query";
import { editModerationOfferBodySchema, moderationDecisionSchema } from "@/lib/validation";

async function withModerator(
  handler: (moderator: { id: string; displayName: string }) => Promise<Response>,
): Promise<Response> {
  let moderator: { id: string; displayName: string };

  try {
    moderator = await requireModeratorUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    if (error instanceof ForbiddenError) {
      return jsonError(403, "FORBIDDEN", "Moderator permissions required.");
    }

    throw error;
  }

  return handler(moderator);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ offerId: string }> },
): Promise<Response> {
  return withModerator(async (moderator) => {
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

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: parsed.data.status === "approved" ? "approve" : "reject",
      contentType: "offer",
      contentId: offerId,
      details: {
        variant: result.offer.variant,
        brand: result.offer.brand,
        style: result.offer.style,
        sizeMl: result.offer.sizeMl,
        serving: result.offer.serving,
        location: result.offer.location.name,
        priceEur: result.offer.priceEur,
      },
    });

    return jsonOk({ offer: result.offer });
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ offerId: string }> },
): Promise<Response> {
  return withModerator(async (moderator) => {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = editModerationOfferBodySchema.safeParse(body);

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
    const result = await editModerationOffer(offerId, parsed.data.priceCents);

    if (!result) {
      return jsonError(404, "OFFER_NOT_FOUND", `No offer found for id '${offerId}'.`);
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: "edit",
      contentType: "offer",
      contentId: offerId,
      details: {
        variant: result.offer.variant,
        brand: result.offer.brand,
        style: result.offer.style,
        sizeMl: result.offer.sizeMl,
        serving: result.offer.serving,
        location: result.offer.location.name,
        priceCents: parsed.data.priceCents,
        previousPriceEur: result.previousPriceEur,
      },
    });

    return jsonOk({ offer: result.offer });
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ offerId: string }> },
): Promise<Response> {
  return withModerator(async (moderator) => {
    const { offerId } = await context.params;
    const result = await deleteModerationOffer(offerId);

    if (!result.deleted) {
      return jsonError(404, "OFFER_NOT_FOUND", `No offer found for id '${offerId}'.`);
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: "delete",
      contentType: "offer",
      contentId: offerId,
      details: {
        variant: result.variant,
        brand: result.brand,
        style: result.style,
        sizeMl: result.sizeMl,
        serving: result.serving,
        location: result.location,
        priceEur: result.priceEur,
      },
    });

    return jsonOk({ deleted: true });
  });
}
