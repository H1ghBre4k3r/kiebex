import { jsonError, jsonOk } from "@/lib/http";
import { invalidatePendingQueueCountCache } from "@/lib/pending-queue-cache";
import {
  deleteModerationPriceUpdateProposal,
  logModerationAction,
  moderatePriceUpdateProposal,
} from "@/lib/query";
import { parseJsonBody, withApiModerator, withMetrics } from "@/lib/route-handlers";
import { moderationDecisionSchema } from "@/lib/validation";

async function patchHandler(
  request: Request,
  context: { params: Promise<{ proposalId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
    const parsed = await parseJsonBody(request, moderationDecisionSchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const { proposalId } = await context.params;
    const result = await moderatePriceUpdateProposal(proposalId, parsed.data.status);

    if (result.outcome !== "updated") {
      if (result.outcome === "missing") {
        return jsonError(
          404,
          "PRICE_UPDATE_PROPOSAL_NOT_FOUND",
          `No pending price update proposal found for id '${proposalId}'.`,
        );
      }

      if (result.outcome === "offer_not_approved") {
        return jsonError(
          409,
          "OFFER_NOT_APPROVED",
          "Cannot approve a price update while the offer is not approved.",
        );
      }

      if (result.outcome === "location_not_approved") {
        return jsonError(
          409,
          "LOCATION_NOT_APPROVED",
          "Cannot approve a price update while the location is not approved.",
        );
      }

      return jsonError(
        409,
        "VARIANT_NOT_APPROVED",
        "Cannot approve a price update while the variant or brand is not approved.",
      );
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: parsed.data.status === "approved" ? "approve" : "reject",
      contentType: "price_update",
      contentId: proposalId,
      details: {
        variant: result.offer.variant,
        brand: result.offer.brand,
        location: result.offer.location.name,
        proposedPriceEur: result.proposal.proposedPriceEur,
        currentPriceEur: result.previousPriceEur,
      },
    });

    invalidatePendingQueueCountCache();

    return jsonOk({
      proposal: result.proposal,
      offer: result.offer,
    });
  });
}

async function deleteHandler(
  _request: Request,
  context: { params: Promise<{ proposalId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
    const { proposalId } = await context.params;
    const result = await deleteModerationPriceUpdateProposal(proposalId);

    if (!result.deleted) {
      return jsonError(
        404,
        "PRICE_UPDATE_PROPOSAL_NOT_FOUND",
        `No price update proposal found for id '${proposalId}'.`,
      );
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: "delete",
      contentType: "price_update",
      contentId: proposalId,
      details: {
        variant: result.variant,
        brand: result.brand,
        location: result.location,
        proposedPriceEur: result.proposedPriceEur,
        currentPriceEur: result.currentPriceEur,
      },
    });

    invalidatePendingQueueCountCache();

    return jsonOk({ deleted: true });
  });
}

export const PATCH = withMetrics("PATCH", "/api/v1/moderation/price-updates/:id", patchHandler);
export const DELETE = withMetrics("DELETE", "/api/v1/moderation/price-updates/:id", deleteHandler);
