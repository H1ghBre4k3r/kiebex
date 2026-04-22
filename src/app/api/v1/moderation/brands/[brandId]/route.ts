import { jsonError, jsonOk } from "@/lib/http";
import { invalidatePendingQueueCountCache } from "@/lib/pending-queue-cache";
import { invalidatePublicDirectoryFilterMetadataCache } from "@/lib/public-directory-cache";
import {
  deleteModerationBrand,
  logModerationAction,
  moderateBeerBrandSubmission,
} from "@/lib/query";
import { parseJsonBody, withApiModerator, withMetrics } from "@/lib/route-handlers";
import { moderationDecisionSchema } from "@/lib/validation";

async function patchHandler(
  request: Request,
  context: { params: Promise<{ brandId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
    const parsed = await parseJsonBody(request, moderationDecisionSchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const { brandId } = await context.params;
    const brand = await moderateBeerBrandSubmission(brandId, parsed.data.status);

    if (!brand) {
      return jsonError(
        404,
        "BRAND_SUBMISSION_NOT_FOUND",
        `No pending beer brand submission found for id '${brandId}'.`,
      );
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: parsed.data.status === "approved" ? "approve" : "reject",
      contentType: "brand",
      contentId: brandId,
      details: { name: brand.name },
    });

    invalidatePendingQueueCountCache();
    invalidatePublicDirectoryFilterMetadataCache();

    return jsonOk({ brand });
  });
}

async function deleteHandler(
  _request: Request,
  context: { params: Promise<{ brandId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
    const { brandId } = await context.params;
    const result = await deleteModerationBrand(brandId);

    if (!result.deleted) {
      return jsonError(404, "BRAND_NOT_FOUND", `No beer brand found for id '${brandId}'.`);
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: "delete",
      contentType: "brand",
      contentId: brandId,
      details: { name: result.name },
    });

    invalidatePendingQueueCountCache();
    invalidatePublicDirectoryFilterMetadataCache();

    return jsonOk({ deleted: true });
  });
}

export const PATCH = withMetrics("PATCH", "/api/v1/moderation/brands/:id", patchHandler);
export const DELETE = withMetrics("DELETE", "/api/v1/moderation/brands/:id", deleteHandler);
