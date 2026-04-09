import { ForbiddenError, UnauthorizedError, requireModeratorUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import {
  deleteModerationPriceUpdateProposal,
  logModerationAction,
  moderatePriceUpdateProposal,
} from "@/lib/query";
import { moderationDecisionSchema } from "@/lib/validation";

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
  context: { params: Promise<{ proposalId: string }> },
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
    });

    return jsonOk({
      proposal: result.proposal,
      offer: result.offer,
    });
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ proposalId: string }> },
): Promise<Response> {
  return withModerator(async (moderator) => {
    const { proposalId } = await context.params;
    const deleted = await deleteModerationPriceUpdateProposal(proposalId);

    if (!deleted) {
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
    });

    return jsonOk({ deleted: true });
  });
}
