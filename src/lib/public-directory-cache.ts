import { revalidateTag, unstable_cache } from "next/cache";
import {
  getBeerBrands,
  getBeerStyles,
  getBeerVariants,
  getDistinctApprovedOfferSizes,
  getLocations,
} from "@/lib/query";

const PUBLIC_DIRECTORY_FILTER_METADATA_TAG = "public-directory-filter-metadata";

function isMissingRevalidateContextError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("static generation store missing in revalidateTag")
  );
}

const getCachedPublicDirectoryFilterMetadataInternal = unstable_cache(
  async () => {
    const [locations, brands, stylesList, variants, sizes] = await Promise.all([
      getLocations(),
      getBeerBrands(),
      getBeerStyles(),
      getBeerVariants(),
      getDistinctApprovedOfferSizes(),
    ]);

    return {
      locations,
      brands,
      stylesList,
      variants,
      sizes,
    };
  },
  ["public-directory-filter-metadata"],
  {
    tags: [PUBLIC_DIRECTORY_FILTER_METADATA_TAG],
  },
);

export async function getCachedPublicDirectoryFilterMetadata() {
  return getCachedPublicDirectoryFilterMetadataInternal();
}

export function invalidatePublicDirectoryFilterMetadataCache(): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  try {
    revalidateTag(PUBLIC_DIRECTORY_FILTER_METADATA_TAG, "max");
  } catch (error) {
    // Route/unit/integration tests can invoke handlers outside Next's revalidation context.
    if (isMissingRevalidateContextError(error)) {
      return;
    }

    throw error;
  }
}

export { PUBLIC_DIRECTORY_FILTER_METADATA_TAG };
