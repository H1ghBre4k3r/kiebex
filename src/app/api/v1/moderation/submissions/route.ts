import { ForbiddenError, UnauthorizedError, requireModeratorUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import {
  getPendingBeerBrandSubmissions,
  getPendingBeerOfferSubmissions,
  getPendingBeerVariantSubmissions,
  getPendingLocationSubmissions,
  getPendingPriceUpdateProposals,
} from "@/lib/query";

export async function GET(): Promise<Response> {
  try {
    await requireModeratorUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    if (error instanceof ForbiddenError) {
      return jsonError(403, "FORBIDDEN", "Moderator permissions required.");
    }

    throw error;
  }

  const [pendingLocations, pendingBrands, pendingVariants, pendingOffers, pendingPriceUpdates] =
    await Promise.all([
      getPendingLocationSubmissions(),
      getPendingBeerBrandSubmissions(),
      getPendingBeerVariantSubmissions(),
      getPendingBeerOfferSubmissions(),
      getPendingPriceUpdateProposals(),
    ]);

  return jsonOk({
    pendingLocations,
    pendingBrands,
    pendingVariants,
    pendingOffers,
    pendingPriceUpdates,
    counts: {
      locations: pendingLocations.length,
      brands: pendingBrands.length,
      variants: pendingVariants.length,
      offers: pendingOffers.length,
      priceUpdates: pendingPriceUpdates.length,
    },
  });
}
