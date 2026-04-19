import { jsonError, jsonOk } from "@/lib/http";
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
    const result = await editAdminVariant(variantId, parsed.data);

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

    return jsonOk({ variant: result.variant });
  });
}

async function deleteHandler(
  _request: Request,
  context: { params: Promise<{ variantId: string }> },
): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const { variantId } = await context.params;
    const result = await deleteModerationVariant(variantId);

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

    return jsonOk({ deleted: true });
  });
}

export const PUT = withMetrics("PUT", "/api/v1/admin/variants/:id", putHandler);
export const DELETE = withMetrics("DELETE", "/api/v1/admin/variants/:id", deleteHandler);
