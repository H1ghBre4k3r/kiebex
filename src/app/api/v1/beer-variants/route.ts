import { jsonError, jsonOk } from "@/lib/http";
import { invalidatePendingQueueCountCache } from "@/lib/pending-queue-cache";
import { isPrismaErrorCode } from "@/lib/prisma-errors";
import { createBeerVariant, getBeerVariants, getBrandContributionPermission } from "@/lib/query";
import { parseJsonBody, withApiAuth, withMetrics } from "@/lib/route-handlers";
import { createBeerVariantBodySchema } from "@/lib/validation";

async function getVariants(request: Request): Promise<Response> {
  const brandId = new URL(request.url).searchParams.get("brandId") ?? undefined;
  const variants = await getBeerVariants({
    brandId,
  });

  return jsonOk({
    brandId,
    count: variants.length,
    variants,
  });
}

async function postVariant(request: Request): Promise<Response> {
  return withApiAuth(async (user) => {
    const parsed = await parseJsonBody(request, createBeerVariantBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const permission = await getBrandContributionPermission(user.id, parsed.data.brandId);

    if (permission === "missing") {
      return jsonError(404, "BRAND_NOT_FOUND", "No beer brand found for the supplied brandId.");
    }

    if (permission === "forbidden") {
      return jsonError(
        403,
        "BRAND_PENDING_RESTRICTED",
        "You can only submit variants for approved brands or brands you submitted.",
      );
    }

    try {
      const variant = await createBeerVariant({
        name: parsed.data.name,
        brandId: parsed.data.brandId,
        styleId: parsed.data.styleId,
        createdById: user.id,
        status: "pending",
      });

      invalidatePendingQueueCountCache();

      return jsonOk({ variant }, { status: 201 });
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002")) {
        return jsonError(
          409,
          "VARIANT_CONFLICT",
          "A variant with this name already exists for the selected brand.",
        );
      }

      if (isPrismaErrorCode(error, "P2003")) {
        return jsonError(
          404,
          "STYLE_OR_BRAND_NOT_FOUND",
          "No brand or style found for the supplied identifiers.",
        );
      }

      throw error;
    }
  });
}

export const GET = withMetrics("GET", "/api/v1/beer-variants", getVariants);
export const POST = withMetrics("POST", "/api/v1/beer-variants", postVariant);
