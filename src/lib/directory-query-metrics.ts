import { recordDirectoryQuery, type DirectoryQueryMetricLabels } from "@/lib/metrics";
import type { BeerQuery } from "@/lib/types";

export function buildDirectoryFilterShape(
  query: BeerQuery,
): DirectoryQueryMetricLabels["filter_shape"] {
  const activeFilters: Exclude<DirectoryQueryMetricLabels["filter_shape"], "none" | "multi">[] = [];

  if (query.brandId?.length) {
    activeFilters.push("brand");
  }

  if (query.variantId?.length) {
    activeFilters.push("variant");
  }

  if (query.styleId?.length) {
    activeFilters.push("style");
  }

  if (query.sizeMl?.length) {
    activeFilters.push("size");
  }

  if (query.serving?.length) {
    activeFilters.push("serving");
  }

  if (query.locationType?.length) {
    activeFilters.push("location_type");
  }

  if (query.locationId?.length) {
    activeFilters.push("location");
  }

  if (activeFilters.length === 0) {
    return "none";
  }

  if (activeFilters.length === 1) {
    return activeFilters[0];
  }

  return "multi";
}

export function buildDirectoryPageBucket(page: number): DirectoryQueryMetricLabels["page_bucket"] {
  if (page <= 1) {
    return "1";
  }

  if (page <= 5) {
    return "2_5";
  }

  return "6_plus";
}

export async function timeDirectoryQuery<T>(
  labels: DirectoryQueryMetricLabels,
  work: () => Promise<T>,
): Promise<T> {
  const start = performance.now();

  try {
    return await work();
  } finally {
    recordDirectoryQuery(labels, (performance.now() - start) / 1000);
  }
}

export function buildBeerOffersDirectoryMetricLabels(
  query: BeerQuery,
  page: number,
): Omit<DirectoryQueryMetricLabels, "query_name"> {
  return {
    sort: query.sort ?? "price_asc",
    filter_shape: buildDirectoryFilterShape(query),
    page_bucket: buildDirectoryPageBucket(page),
  };
}
