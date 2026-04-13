import { jsonError, jsonOk } from "@/lib/http";
import { isPrismaErrorCode } from "@/lib/prisma-errors";
import { createBeerVariant, logModerationAction } from "@/lib/query";
import { parseJsonBody, withApiAdmin } from "@/lib/route-handlers";
import { createAdminVariantBodySchema } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const parsed = await parseJsonBody(request, createAdminVariantBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    let variant;

    try {
      variant = await createBeerVariant({
        name: parsed.data.name,
        brandId: parsed.data.brandId,
        styleId: parsed.data.styleId,
        createdById: admin.id,
        status: "approved",
      });
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002")) {
        return jsonError(
          409,
          "VARIANT_NAME_CONFLICT",
          "A beer variant with that name already exists for this brand.",
        );
      }

      if (isPrismaErrorCode(error, "P2003")) {
        return jsonError(404, "RELATION_NOT_FOUND", "The specified brand or style does not exist.");
      }

      throw error;
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "approve",
      contentType: "variant",
      contentId: variant.id,
      details: { name: variant.name },
    });

    return jsonOk({ variant }, { status: 201 });
  });
}
