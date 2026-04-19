import { jsonOk } from "@/lib/http";
import {
  getPendingBeerBrandSubmissions,
  getPendingBeerOfferSubmissions,
  getPendingBeerVariantSubmissions,
  getPendingLocationSubmissions,
  getPendingPriceUpdateProposals,
} from "@/lib/query";
import { withApiModerator, withMetrics } from "@/lib/route-handlers";

async function getHandler(): Promise<Response> {
  return withApiModerator(async () => {
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
  });
}

export const GET = withMetrics("GET", "/api/v1/moderation/submissions", getHandler);
