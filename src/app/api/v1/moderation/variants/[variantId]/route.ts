import { jsonError, jsonOk } from "@/lib/http";
import { invalidatePendingQueueCountCache } from "@/lib/pending-queue-cache";
import { invalidatePublicDirectoryFilterMetadataCache } from "@/lib/public-directory-cache";
import {
  deleteModerationVariant,
  logModerationAction,
  moderateBeerVariantSubmission,
} from "@/lib/query";
import { parseJsonBody, withApiModerator, withMetrics } from "@/lib/route-handlers";
import { moderationDecisionSchema } from "@/lib/validation";

async function patchHandler(
  request: Request,
  context: { params: Promise<{ variantId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
    const parsed = await parseJsonBody(request, moderationDecisionSchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const { variantId } = await context.params;
    const result = await moderateBeerVariantSubmission(variantId, parsed.data.status);

    if (result.outcome !== "updated") {
      if (result.outcome === "missing") {
        return jsonError(
          404,
          "VARIANT_SUBMISSION_NOT_FOUND",
          `No pending beer variant submission found for id '${variantId}'.`,
        );
      }

      return jsonError(
        409,
        "BRAND_NOT_APPROVED",
        "Cannot approve a variant while its brand is not approved.",
      );
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: parsed.data.status === "approved" ? "approve" : "reject",
      contentType: "variant",
      contentId: variantId,
      details: {
        name: result.variant.name,
        brand: result.variant.brand?.name,
        style: result.variant.style?.name,
      },
    });

    invalidatePendingQueueCountCache();
    invalidatePublicDirectoryFilterMetadataCache();

    return jsonOk({ variant: result.variant });
  });
}

async function deleteHandler(
  _request: Request,
  context: { params: Promise<{ variantId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
    const { variantId } = await context.params;
    const result = await deleteModerationVariant(variantId);

    if (!result.deleted) {
      return jsonError(404, "VARIANT_NOT_FOUND", `No beer variant found for id '${variantId}'.`);
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: "delete",
      contentType: "variant",
      contentId: variantId,
      details: { name: result.name, brand: result.brand, style: result.style },
    });

    invalidatePendingQueueCountCache();
    invalidatePublicDirectoryFilterMetadataCache();

    return jsonOk({ deleted: true });
  });
}

export const PATCH = withMetrics("PATCH", "/api/v1/moderation/variants/:id", patchHandler);
export const DELETE = withMetrics("DELETE", "/api/v1/moderation/variants/:id", deleteHandler);
