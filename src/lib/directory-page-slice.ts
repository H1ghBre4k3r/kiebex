import type { BeerOfferWithLocation } from "@/lib/types";

export function getDirectoryPageSliceTake(pageSize: number): number {
  return pageSize + 1;
}

export function toDirectoryPageSlice(
  rows: BeerOfferWithLocation[],
  pageSize: number,
): { offers: BeerOfferWithLocation[]; hasNextPage: boolean } {
  const hasNextPage = rows.length > pageSize;

  return {
    offers: hasNextPage ? rows.slice(0, pageSize) : rows,
    hasNextPage,
  };
}
