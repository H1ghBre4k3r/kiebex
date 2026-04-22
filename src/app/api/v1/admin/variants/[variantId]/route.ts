import { jsonError, jsonOk } from "@/lib/http";
import { invalidatePublicDirectoryFilterMetadataCache } from "@/lib/public-directory-cache";
import { isPrismaErrorCode } from "@/lib/prisma-errors";
import { deleteModerationVariant, editAdminVariant, logModerationAction } from "@/lib/query";
import { parseJsonBody, withApiAdmin, withMetrics } from "@/lib/route-handlers";
import { editAdminVariantBodySchema } from "@/lib/validation";

async function putHandler(
  request: Request,
  context: { params: Promise<{ variantId: string }> },
): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const parsed = await parseJsonBody(request, editAdminVariantBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const { variantId } = await context.params;
    let result;

    try {
      result = await editAdminVariant(variantId, parsed.data);
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002")) {
        return jsonError(
          409,
          "VARIANT_NAME_CONFLICT",
          "A beer variant with that name already exists for this brand.",
        );
      }

      if (isPrismaErrorCode(error, "P2003")) {
        return jsonError(404, "RELATION_NOT_FOUND", "The specified style does not exist.");
      }

      throw error;
    }

    if (!result) {
      return jsonError(404, "VARIANT_NOT_FOUND", `No variant found for id '${variantId}'.`);
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "edit",
      contentType: "variant",
      contentId: variantId,
      details: {
        name: result.variant.name,
        previousName: result.previousName,
        style: result.variant.style?.name,
        previousStyle: result.previousStyle,
        fields: Object.keys(parsed.data),
      },
    });

    invalidatePublicDirectoryFilterMetadataCache();

    return jsonOk({ variant: result.variant });
  });
}

async function deleteHandler(
  _request: Request,
  context: { params: Promise<{ variantId: string }> },
): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const { variantId } = await context.params;
    let result;

    try {
      result = await deleteModerationVariant(variantId);
    } catch (error) {
      if (isPrismaErrorCode(error, "P2003")) {
        return jsonError(
          409,
          "VARIANT_IN_USE",
          "This beer variant is still in use and cannot be deleted.",
        );
      }

      throw error;
    }

    if (!result.deleted) {
      return jsonError(404, "VARIANT_NOT_FOUND", `No variant found for id '${variantId}'.`);
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "delete",
      contentType: "variant",
      contentId: variantId,
      details: { name: result.name },
    });

    invalidatePublicDirectoryFilterMetadataCache();

    return jsonOk({ deleted: true });
  });
}

export const PUT = withMetrics("PUT", "/api/v1/admin/variants/:id", putHandler);
export const DELETE = withMetrics("DELETE", "/api/v1/admin/variants/:id", deleteHandler);
