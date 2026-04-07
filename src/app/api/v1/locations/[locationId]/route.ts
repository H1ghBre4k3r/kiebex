import { getLocationById, getLocationOffers, getOfferPriceHistory } from "@/lib/query";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(
  _request: Request,
  context: { params: Promise<{ locationId: string }> },
): Promise<Response> {
  const { locationId } = await context.params;
  const location = await getLocationById(locationId);

  if (!location) {
    return jsonError(404, "LOCATION_NOT_FOUND", `No location found for id '${locationId}'.`);
  }

  const offers = await getLocationOffers(locationId);
  const offersWithHistory = await Promise.all(
    offers.map(async (offer) => ({
      ...offer,
      priceHistory: await getOfferPriceHistory(offer.id),
    })),
  );

  return jsonOk({
    location,
    count: offersWithHistory.length,
    offers: offersWithHistory,
  });
}
