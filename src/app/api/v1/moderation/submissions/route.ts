import { jsonOk } from "@/lib/http";
import {
  getPendingBeerBrandSubmissions,
  getPendingBeerOfferSubmissions,
  getPendingBeerVariantSubmissions,
  getPendingLocationSubmissions,
  getPendingPriceUpdateProposals,
} from "@/lib/query";
import { withApiModerator } from "@/lib/route-handlers";

export async function GET(): Promise<Response> {
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
