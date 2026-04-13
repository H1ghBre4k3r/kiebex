import { jsonError, jsonOk } from "@/lib/http";
import { isPrismaErrorCode } from "@/lib/prisma-errors";
import { createBeerOffer, logModerationAction } from "@/lib/query";
import { parseJsonBody, withApiAdmin } from "@/lib/route-handlers";
import { createAdminOfferBodySchema } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const parsed = await parseJsonBody(request, createAdminOfferBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    let offer;

    try {
      offer = await createBeerOffer({
        variantId: parsed.data.variantId,
        sizeMl: parsed.data.sizeMl,
        serving: parsed.data.serving,
        priceCents: parsed.data.priceCents,
        locationId: parsed.data.locationId,
        createdById: admin.id,
        status: "approved",
      });
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002")) {
        return jsonError(
          409,
          "OFFER_CONFLICT",
          "An offer already exists for this location, variant, size, and serving.",
        );
      }

      if (isPrismaErrorCode(error, "P2003")) {
        return jsonError(
          404,
          "RELATION_NOT_FOUND",
          "The specified location or variant does not exist.",
        );
      }

      throw error;
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "approve",
      contentType: "offer",
      contentId: offer.id,
      details: {
        brand: offer.brand,
        variant: offer.variant,
        sizeMl: offer.sizeMl,
        priceEur: offer.priceEur,
      },
    });

    return jsonOk({ offer }, { status: 201 });
  });
}
