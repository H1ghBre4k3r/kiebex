import { db } from "@/lib/db";
import type { BeerQuery } from "@/lib/types";

export function shouldResolveApprovedVariantIds(query: BeerQuery): boolean {
  return !query.variantId?.length && Boolean(query.brandId?.length || query.styleId?.length);
}

export async function resolveApprovedVariantIdsForBeerQuery(
  query: BeerQuery,
): Promise<string[] | null> {
  if (!shouldResolveApprovedVariantIds(query)) {
    return null;
  }

  const variants = await db.beerVariant.findMany({
    where: {
      brandId: query.brandId?.length ? { in: query.brandId } : undefined,
      styleId: query.styleId?.length ? { in: query.styleId } : undefined,
      status: "approved",
      brand: {
        status: "approved",
      },
    },
    select: {
      id: true,
    },
  });

  return variants.map((variant) => variant.id);
}
