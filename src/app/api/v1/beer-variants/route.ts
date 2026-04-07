import { Prisma } from "@/generated/prisma/client";
import { UnauthorizedError, requireAuthUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { createBeerVariant, getBeerVariants, getBrandContributionPermission } from "@/lib/query";
import { createBeerVariantBodySchema } from "@/lib/validation";

function isKnownRequestError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export async function GET(request: Request): Promise<Response> {
  const brandId = new URL(request.url).searchParams.get("brandId") ?? undefined;
  const variants = await getBeerVariants({
    brandId,
  });

  return jsonOk({
    brandId,
    count: variants.length,
    variants,
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

  const parsed = createBeerVariantBodySchema.safeParse(body);

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

  const permission = await getBrandContributionPermission(userId, parsed.data.brandId);

  if (permission === "missing") {
    return jsonError(404, "BRAND_NOT_FOUND", "No beer brand found for the supplied brandId.");
  }

  if (permission === "forbidden") {
    return jsonError(
      403,
      "BRAND_PENDING_RESTRICTED",
      "You can only submit variants for approved brands or brands you submitted.",
    );
  }

  try {
    const variant = await createBeerVariant({
      name: parsed.data.name,
      brandId: parsed.data.brandId,
      styleId: parsed.data.styleId,
      createdById: userId,
      status: "pending",
    });

    return jsonOk({ variant }, { status: 201 });
  } catch (error) {
    if (isKnownRequestError(error) && error.code === "P2002") {
      return jsonError(
        409,
        "VARIANT_CONFLICT",
        "A variant with this name already exists for the selected brand.",
      );
    }

    if (isKnownRequestError(error) && error.code === "P2003") {
      return jsonError(
        404,
        "STYLE_OR_BRAND_NOT_FOUND",
        "No brand or style found for the supplied identifiers.",
      );
    }

    throw error;
  }
}
