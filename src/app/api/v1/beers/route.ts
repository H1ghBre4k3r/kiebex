import { getBeerOffers } from "@/lib/query";
import { jsonError, jsonOk } from "@/lib/http";
import { parseBeerQueryParams } from "@/lib/validation";

export async function GET(request: Request): Promise<Response> {
  const parsed = parseBeerQueryParams(new URL(request.url).searchParams);

  if (!parsed.success) {
    return jsonError(
      400,
      "INVALID_QUERY",
      "One or more query parameters are invalid.",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  const offers = await getBeerOffers(parsed.data);
  return jsonOk({
    filters: parsed.data,
    count: offers.length,
    offers,
  });
}
