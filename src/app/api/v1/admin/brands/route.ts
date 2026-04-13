import { jsonError, jsonOk } from "@/lib/http";
import { isPrismaErrorCode } from "@/lib/prisma-errors";
import { createBeerBrand, logModerationAction } from "@/lib/query";
import { parseJsonBody, withApiAdmin } from "@/lib/route-handlers";
import { createAdminBrandBodySchema } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const parsed = await parseJsonBody(request, createAdminBrandBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    let brand;

    try {
      brand = await createBeerBrand({
        name: parsed.data.name,
        createdById: admin.id,
        status: "approved",
      });
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002")) {
        return jsonError(409, "BRAND_NAME_CONFLICT", "A beer brand with that name already exists.");
      }

      throw error;
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "approve",
      contentType: "brand",
      contentId: brand.id,
      details: { name: brand.name },
    });

    return jsonOk({ brand }, { status: 201 });
  });
}
