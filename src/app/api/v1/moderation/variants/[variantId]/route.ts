import { jsonError, jsonOk } from "@/lib/http";
import {
  deleteModerationVariant,
  logModerationAction,
  moderateBeerVariantSubmission,
} from "@/lib/query";
import { parseJsonBody, withApiModerator } from "@/lib/route-handlers";
import { moderationDecisionSchema } from "@/lib/validation";

export async function PATCH(
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

    return jsonOk({ variant: result.variant });
  });
}

export async function DELETE(
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

    return jsonOk({ deleted: true });
  });
}
