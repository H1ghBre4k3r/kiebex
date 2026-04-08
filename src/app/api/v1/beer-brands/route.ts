import { Prisma } from "@/generated/prisma/client";
import { UnauthorizedError, requireAuthUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { createBeerBrand, getBeerBrands } from "@/lib/query";
import { createBeerBrandBodySchema } from "@/lib/validation";

function isKnownRequestError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export async function GET(): Promise<Response> {
  const brands = await getBeerBrands();
  return jsonOk({
    count: brands.length,
    brands,
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

  const parsed = createBeerBrandBodySchema.safeParse(body);

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
    const brand = await createBeerBrand({
      name: parsed.data.name,
      createdById: userId,
      status: "pending",
    });

    return jsonOk({ brand }, { status: 201 });
  } catch (error) {
    if (isKnownRequestError(error) && error.code === "P2002") {
      return jsonError(409, "BRAND_CONFLICT", "A beer brand with this name already exists.");
    }

    throw error;
  }
}
