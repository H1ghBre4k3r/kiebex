import { jsonError, jsonOk } from "@/lib/http";
import { isPrismaErrorCode } from "@/lib/prisma-errors";
import { createBeerBrand, getBeerBrands } from "@/lib/query";
import { parseJsonBody, withApiAuth, withMetrics } from "@/lib/route-handlers";
import { createBeerBrandBodySchema } from "@/lib/validation";

async function getBrands(): Promise<Response> {
  const brands = await getBeerBrands();
  return jsonOk({
    count: brands.length,
    brands,
  });
}

async function postBrand(request: Request): Promise<Response> {
  return withApiAuth(async (user) => {
    const parsed = await parseJsonBody(request, createBeerBrandBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    try {
      const brand = await createBeerBrand({
        name: parsed.data.name,
        createdById: user.id,
        status: "pending",
      });

      return jsonOk({ brand }, { status: 201 });
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002")) {
        return jsonError(409, "BRAND_CONFLICT", "A beer brand with this name already exists.");
      }

      throw error;
    }
  });
}

export const GET = withMetrics("GET", "/api/v1/beer-brands", getBrands);
export const POST = withMetrics("POST", "/api/v1/beer-brands", postBrand);
