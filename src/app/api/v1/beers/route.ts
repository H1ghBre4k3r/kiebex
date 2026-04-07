import { Prisma } from "@/generated/prisma/client";
import { UnauthorizedError, requireAuthUser } from "@/lib/auth";
import { createBeerOffer, getBeerOffers } from "@/lib/query";
import { jsonError, jsonOk } from "@/lib/http";
import { createBeerOfferBodySchema, parseBeerQueryParams } from "@/lib/validation";

function isKnownRequestError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

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

export async function POST(request: Request): Promise<Response> {
  try {
    await requireAuthUser();
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

  const parsed = createBeerOfferBodySchema.safeParse(body);

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

  try {
    const offer = await createBeerOffer(parsed.data);

    return jsonOk({ offer }, { status: 201 });
  } catch (error) {
    if (isKnownRequestError(error) && error.code === "P2002") {
      return jsonError(
        409,
        "OFFER_CONFLICT",
        "An offer with this location, brand, variant, size, and serving already exists.",
      );
    }

    if (isKnownRequestError(error) && error.code === "P2003") {
      return jsonError(404, "LOCATION_NOT_FOUND", "No location found for the supplied locationId.");
    }

    throw error;
  }
}
