import { jsonError, jsonOk } from "@/lib/http";
import { deleteModerationBrand, editAdminBrand, logModerationAction } from "@/lib/query";
import { parseJsonBody, withApiAdmin, withMetrics } from "@/lib/route-handlers";
import { editAdminBrandBodySchema } from "@/lib/validation";

async function putHandler(
  request: Request,
  context: { params: Promise<{ brandId: string }> },
): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const parsed = await parseJsonBody(request, editAdminBrandBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const { brandId } = await context.params;
    const result = await editAdminBrand(brandId, parsed.data.name);

    if (!result) {
      return jsonError(404, "BRAND_NOT_FOUND", `No brand found for id '${brandId}'.`);
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "edit",
      contentType: "brand",
      contentId: brandId,
      details: { name: result.brand.name, previousName: result.previousName },
    });

    return jsonOk({ brand: result.brand });
  });
}

async function deleteHandler(
  _request: Request,
  context: { params: Promise<{ brandId: string }> },
): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const { brandId } = await context.params;
    const result = await deleteModerationBrand(brandId);

    if (!result.deleted) {
      return jsonError(404, "BRAND_NOT_FOUND", `No brand found for id '${brandId}'.`);
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "delete",
      contentType: "brand",
      contentId: brandId,
      details: { name: result.name },
    });

    return jsonOk({ deleted: true });
  });
}

export const PUT = withMetrics("PUT", "/api/v1/admin/brands/:id", putHandler);
export const DELETE = withMetrics("DELETE", "/api/v1/admin/brands/:id", deleteHandler);
