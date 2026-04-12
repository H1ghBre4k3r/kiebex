import { jsonError, jsonOk } from "@/lib/http";
import { isPrismaErrorCode } from "@/lib/prisma";
import { createReview, getLocationReviewPermission, getLocationReviews } from "@/lib/query";
import { jsonQueryValidationError, parseJsonBody, withApiAuth } from "@/lib/route-handlers";
import { createReviewBodySchema, parseReviewQueryParams } from "@/lib/validation";

export async function GET(request: Request): Promise<Response> {
  const parsed = parseReviewQueryParams(new URL(request.url).searchParams);

  if (!parsed.success) {
    return jsonQueryValidationError(parsed.error);
  }

  const permission = await getLocationReviewPermission(parsed.data.locationId);

  if (permission !== "allowed") {
    return jsonError(
      404,
      "LOCATION_NOT_FOUND",
      `No approved location found for id '${parsed.data.locationId}'.`,
    );
  }

  const reviews = await getLocationReviews(parsed.data.locationId);
  return jsonOk({
    locationId: parsed.data.locationId,
    count: reviews.length,
    reviews,
  });
}

export async function POST(request: Request): Promise<Response> {
  return withApiAuth(async (user) => {
    const parsed = await parseJsonBody(request, createReviewBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const permission = await getLocationReviewPermission(parsed.data.locationId);

    if (permission === "missing") {
      return jsonError(404, "LOCATION_NOT_FOUND", "No location found for the supplied locationId.");
    }

    if (permission === "forbidden") {
      return jsonError(
        403,
        "LOCATION_NOT_APPROVED",
        "Reviews can only be submitted for approved locations.",
      );
    }

    try {
      const review = await createReview({
        locationId: parsed.data.locationId,
        userId: user.id,
        rating: parsed.data.rating,
        title: parsed.data.title,
        body: parsed.data.body,
        status: "approved",
      });

      return jsonOk({ review }, { status: 201 });
    } catch (error) {
      if (isPrismaErrorCode(error, "P2003")) {
        return jsonError(
          404,
          "RELATION_NOT_FOUND",
          "A related entity referenced by this review does not exist.",
        );
      }

      throw error;
    }
  });
}
