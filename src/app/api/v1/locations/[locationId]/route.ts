import {
  getLocationById,
  getLocationOffers,
  getLocationReviews,
  getOfferPriceHistoryBatch,
} from "@/lib/query";
import { jsonError, jsonOk } from "@/lib/http";
import { withMetrics } from "@/lib/route-handlers";

async function getLocation(
  _request: Request,
  context: { params: Promise<{ locationId: string }> },
): Promise<Response> {
  const { locationId } = await context.params;
  const location = await getLocationById(locationId);

  if (!location) {
    return jsonError(404, "LOCATION_NOT_FOUND", `No location found for id '${locationId}'.`);
  }

  const offers = await getLocationOffers(locationId);
  const reviews = await getLocationReviews(locationId);
  const historyByOfferId = await getOfferPriceHistoryBatch(offers.map((offer) => offer.id));
  const offersWithHistory = offers.map((offer) => ({
    ...offer,
    priceHistory: historyByOfferId.get(offer.id) ?? [],
  }));

  return jsonOk({
    location,
    count: offersWithHistory.length,
    offers: offersWithHistory,
    reviews,
    reviewCount: reviews.length,
  });
}

export const GET = withMetrics("GET", "/api/v1/locations/:id", getLocation);
