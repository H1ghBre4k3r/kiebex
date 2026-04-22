/**
 * Pure URL helpers for the beer directory page.
 *
 * All functions are side-effect-free and work with a plain RawMap so they can
 * be used in server components, route handlers, and unit tests without a
 * browser or React runtime.
 */

export type SearchValue = string | string[] | undefined;

/** A normalized representation of URL search params. */
export type RawMap = Record<string, string[]>;

/**
 * Normalize raw Next.js searchParams (where each value may be a string,
 * string[], or undefined) into a compact RawMap.  Blank/empty values are
 * dropped so downstream code never sees empty strings.
 */
export function toRawMap(raw: Record<string, SearchValue>): RawMap {
  const map: RawMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      const compact = value.filter(Boolean);
      if (compact.length > 0) map[key] = compact;
    } else if (value) {
      map[key] = [value];
    }
  }
  return map;
}

/** Serialize a RawMap back to an absolute URL string rooted at "/". */
export function rawMapToUrl(map: RawMap): string {
  const params = new URLSearchParams();
  for (const [key, values] of Object.entries(map)) {
    for (const value of values) {
      params.append(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

/**
 * Remove a single occurrence of `value` from the `key` array in `map`.
 * If the array becomes empty the key is deleted.
 * Does NOT drop `page` — use this for chip removal where page is preserved.
 */
export function removeOneValue(map: RawMap, key: string, value: string): RawMap {
  const next = { ...map };
  next[key] = (next[key] ?? []).filter((v) => v !== value);
  if (next[key].length === 0) delete next[key];
  return next;
}

/** Internal helper — always drop `page` on any filter change. */
function dropPage(map: RawMap): RawMap {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { page: _page, ...rest } = map;
  return rest;
}

/**
 * Toggle a single value within a multi-select key, resetting pagination.
 * If `value` is already present it is removed; otherwise it is appended.
 */
export function toggleValue(map: RawMap, key: string, value: string): RawMap {
  const current = map[key] ?? [];
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  const updated = { ...map, [key]: next };
  if (next.length === 0) delete updated[key];
  return dropPage(updated);
}

/**
 * Toggle a variant group (one or more IDs that share a display name).
 * If any of the IDs are currently selected the whole group is deselected;
 * otherwise all IDs in the group are added.  Resets pagination.
 */
export function toggleVariantGroup(map: RawMap, ids: string[]): RawMap {
  const current = map.variantId ?? [];
  const anySelected = ids.some((id) => current.includes(id));
  const next = anySelected
    ? current.filter((v) => !ids.includes(v))
    : [...current, ...ids.filter((id) => !current.includes(id))];
  if (next.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { variantId: _variantId, ...rest } = map;
    return dropPage(rest);
  }
  return dropPage({ ...map, variantId: next });
}

/**
 * Replace the `sort` value.  Omits the key entirely when `value` is the
 * default ("price_asc") to keep URLs canonical.  Always resets pagination.
 */
export function setSort(map: RawMap, value: string): RawMap {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sort: _sort, ...withoutSort } = dropPage(map);
  if (value !== "price_asc") {
    return { ...withoutSort, sort: [value] };
  }
  return withoutSort;
}

/**
 * Build a pagination URL for `targetPage`, preserving all current filters.
 * Omits the `page` param entirely when `targetPage` is 1 for canonical URLs.
 */
export function buildPaginationUrl(raw: Record<string, SearchValue>, targetPage: number): string {
  const map = toRawMap(raw);
  delete map.page;
  if (targetPage > 1) map.page = [String(targetPage)];
  return rawMapToUrl(map);
}
