import {
  BEER_OFFERS_PAGE_SIZE,
  getBeerOffersPage,
  createOfferOrPriceUpdateProposal,
  getLocationContributionPermission,
  getVariantContributionPermission,
} from "@/lib/query";
import { jsonError, jsonOk } from "@/lib/http";
import { isPrismaErrorCode } from "@/lib/prisma-errors";
import {
  jsonQueryValidationError,
  parseJsonBody,
  withApiAuth,
  withMetrics,
} from "@/lib/route-handlers";
import { createBeerOfferBodySchema, parseBeerQueryParams } from "@/lib/validation";

async function getBeers(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseBeerQueryParams(url.searchParams);

  if (!parsed.success) {
    return jsonQueryValidationError(parsed.error);
  }

  const rawPage = url.searchParams.get("page");
  const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);

  const { offers, total } = await getBeerOffersPage(parsed.data, page);
  const totalPages = Math.ceil(total / BEER_OFFERS_PAGE_SIZE);

  return jsonOk({
    filters: parsed.data,
    pagination: { page, pageSize: BEER_OFFERS_PAGE_SIZE, total, totalPages },
    offers,
  });
}

async function postBeer(request: Request): Promise<Response> {
  return withApiAuth(async (user) => {
    const parsed = await parseJsonBody(request, createBeerOfferBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const locationPermission = await getLocationContributionPermission(
      user.id,
      parsed.data.locationId,
    );

    if (locationPermission === "missing") {
      return jsonError(404, "LOCATION_NOT_FOUND", "No location found for the supplied locationId.");
    }

    if (locationPermission === "forbidden") {
      return jsonError(
        403,
        "LOCATION_PENDING_RESTRICTED",
        "You can only submit offers for approved locations or locations you submitted.",
      );
    }

    const variantPermission = await getVariantContributionPermission(
      user.id,
      parsed.data.variantId,
    );

    if (variantPermission === "missing") {
      return jsonError(
        404,
        "VARIANT_NOT_FOUND",
        "No beer variant found for the supplied variantId.",
      );
    }

    if (variantPermission === "forbidden") {
      return jsonError(
        403,
        "VARIANT_PENDING_RESTRICTED",
        "You can only submit offers for approved variants or variants you submitted.",
      );
    }

    try {
      const result = await createOfferOrPriceUpdateProposal({
        ...parsed.data,
        createdById: user.id,
        status: "pending",
      });

      if (result.outcome === "offer") {
        return jsonOk(
          {
            outcome: "offer_submission_created",
            offer: result.offer,
          },
          { status: 201 },
        );
      }

      if (result.outcome === "price_update") {
        return jsonOk(
          {
            outcome: "price_update_proposed",
            proposal: result.proposal,
            offer: result.offer,
          },
          { status: 201 },
        );
      }

      if (result.outcome === "existing_offer_not_approved") {
        return jsonError(
          409,
          "EXISTING_OFFER_PENDING",
          "A matching offer already exists but is not yet approved.",
        );
      }

      return jsonError(
        409,
        "SAME_PRICE_ALREADY_ACTIVE",
        "The submitted price is already the currently approved price.",
      );
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002")) {
        return jsonError(
          409,
          "OFFER_CONFLICT",
          "A conflicting offer already exists for this location, variant, size, and serving.",
        );
      }

      if (isPrismaErrorCode(error, "P2003")) {
        return jsonError(
          404,
          "RELATION_NOT_FOUND",
          "One of the related entities (location or variant) does not exist.",
        );
      }

      throw error;
    }
  });
}

export const GET = withMetrics("GET", "/api/v1/beers", getBeers);
export const POST = withMetrics("POST", "/api/v1/beers", postBeer);
