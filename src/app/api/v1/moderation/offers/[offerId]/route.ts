import { jsonError, jsonOk } from "@/lib/http";
import { invalidatePublicDirectoryFilterMetadataCache } from "@/lib/public-directory-cache";
import {
  deleteModerationOffer,
  editModerationOffer,
  logModerationAction,
  moderateBeerOfferSubmission,
} from "@/lib/query";
import { parseJsonBody, withApiModerator, withMetrics } from "@/lib/route-handlers";
import { editModerationOfferBodySchema, moderationDecisionSchema } from "@/lib/validation";

async function patchHandler(
  request: Request,
  context: { params: Promise<{ offerId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
    const parsed = await parseJsonBody(request, moderationDecisionSchema);

    if (!parsed.ok) {
      return parsed.response;
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

    invalidatePublicDirectoryFilterMetadataCache();

    return jsonOk({ offer: result.offer });
  });
}

async function putHandler(
  request: Request,
  context: { params: Promise<{ offerId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
    const parsed = await parseJsonBody(request, editModerationOfferBodySchema);

    if (!parsed.ok) {
      return parsed.response;
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

async function deleteHandler(
  _request: Request,
  context: { params: Promise<{ offerId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
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

    invalidatePublicDirectoryFilterMetadataCache();

    return jsonOk({ deleted: true });
  });
}

export const PATCH = withMetrics("PATCH", "/api/v1/moderation/offers/:id", patchHandler);
export const PUT = withMetrics("PUT", "/api/v1/moderation/offers/:id", putHandler);
export const DELETE = withMetrics("DELETE", "/api/v1/moderation/offers/:id", deleteHandler);
