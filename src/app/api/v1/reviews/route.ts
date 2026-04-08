import { Prisma } from "@/generated/prisma/client";
import { UnauthorizedError, requireAuthUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { createReview, getLocationReviewPermission, getLocationReviews } from "@/lib/query";
import { createReviewBodySchema, parseReviewQueryParams } from "@/lib/validation";

function isKnownRequestError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export async function GET(request: Request): Promise<Response> {
  const parsed = parseReviewQueryParams(new URL(request.url).searchParams);

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
  let userId: string;

  try {
    const user = await requireAuthUser();
    userId = user.id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    throw error;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = createReviewBodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      400,
      "INVALID_BODY",
      "One or more fields are invalid.",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
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
      userId,
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      status: "approved",
    });

    return jsonOk({ review }, { status: 201 });
  } catch (error) {
    if (isKnownRequestError(error) && error.code === "P2003") {
      return jsonError(
        404,
        "RELATION_NOT_FOUND",
        "A related entity referenced by this review does not exist.",
      );
    }

    throw error;
  }
}
