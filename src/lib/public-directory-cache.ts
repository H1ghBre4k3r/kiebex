import { revalidateTag, unstable_cache } from "next/cache";
import {
  getBeerBrands,
  getBeerStyles,
  getBeerVariants,
  getDistinctApprovedOfferSizes,
  getLocations,
} from "@/lib/query";

const PUBLIC_DIRECTORY_FILTER_METADATA_TAG = "public-directory-filter-metadata";

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
  revalidateTag(PUBLIC_DIRECTORY_FILTER_METADATA_TAG, "max");
}

export { PUBLIC_DIRECTORY_FILTER_METADATA_TAG };
