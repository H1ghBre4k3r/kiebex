import Link from "next/link";
import { LOCATION_TYPE_OPTIONS, SERVING_TYPE_OPTIONS } from "@/lib/display";
import {
  type SearchValue,
  toRawMap,
  rawMapToUrl,
  toggleValue,
  toggleVariantGroup,
} from "@/lib/beer-directory-url";
import styles from "./filter-panel.module.css";

type Props = {
  brands: { id: string; name: string }[];
  variants: { id: string; name: string; brandId: string }[];
  stylesList: { id: string; name: string }[];
  sizes: number[];
  locations: { id: string; name: string }[];
  searchParams: Record<string, SearchValue>;
};

export function FilterPanel({ brands, variants, stylesList, sizes, locations, searchParams }: Props) {
  const map = toRawMap(searchParams);

  const selectedBrands = map.brandId ?? [];
  const selectedVariants = map.variantId ?? [];
  const selectedStyles = map.styleId ?? [];
  const selectedSizes = map.sizeMl ?? [];
  const selectedServings = map.serving ?? [];
  const selectedLocationTypes = map.locationType ?? [];
  const selectedLocations = map.locationId ?? [];
  const currentSort = (map.sort ?? ["price_asc"])[0];

  // Only show variants for selected brands (or all if no brand filter is active).
  const visibleVariants =
    selectedBrands.length > 0
      ? variants.filter((v) => selectedBrands.includes(v.brandId))
      : variants;

  // Merge variants with the same display name into a single toggle entry.
  const variantGroups: { name: string; ids: string[] }[] = [];
  const variantGroupIndex = new Map<string, number>();
  for (const v of visibleVariants) {
    const existing = variantGroupIndex.get(v.name);
    if (existing !== undefined) {
      variantGroups[existing].ids.push(v.id);
    } else {
      variantGroupIndex.set(v.name, variantGroups.length);
      variantGroups.push({ name: v.name, ids: [v.id] });
    }
  }

  const hasAnyFilter =
    selectedBrands.length > 0 ||
    selectedVariants.length > 0 ||
    selectedStyles.length > 0 ||
    selectedSizes.length > 0 ||
    selectedServings.length > 0 ||
    selectedLocationTypes.length > 0 ||
    selectedLocations.length > 0 ||
    currentSort !== "price_asc";

  const activeFilterCount = [
    selectedBrands.length > 0,
    selectedVariants.length > 0,
    selectedStyles.length > 0,
    selectedSizes.length > 0,
    selectedServings.length > 0,
    selectedLocationTypes.length > 0,
    selectedLocations.length > 0,
    currentSort !== "price_asc",
  ].filter(Boolean).length;

  return (
    <section className={styles.panel} aria-label="Filter offers">
      {/*
       * <details> / <summary> provides the mobile collapse with zero JavaScript.
       * On desktop, CSS forces the body to be permanently visible and hides the
       * summary toggle, so the open attribute has no visible effect there.
       */}
      <details className={styles.disclosure} open>
        <summary className={styles.toggle}>
          <span>Filter Offers{activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}</span>
          <span aria-hidden="true" className={styles.toggleIcon}>&#9660;</span>
        </summary>

        <div className={styles.body}>
          <div className={styles.panelHeader}>
            <h2 id="filter-heading">Filter Offers</h2>
            {hasAnyFilter && (
              <Link href="/" className={styles.clearAll}>
                Clear All
              </Link>
            )}
          </div>

          <div className={styles.groups}>
            {/* ── Sort ── */}
            <div className={styles.group}>
              <p className={styles.groupLabel} id="sort-group-label">Sort By</p>
              {/*
               * Native <form method="GET"> + <input type="radio"> restores correct keyboard
               * semantics (arrow-key navigation, spacebar selection) that <a role="radio">
               * cannot provide.  Hidden inputs preserve all active filters; the sort radio
               * replaces only the sort param.  An inline script auto-submits on change so
               * JS users get immediate navigation; the <noscript> button covers the no-JS path.
               */}
              <form
                id="sort-form"
                method="GET"
                action="/"
                aria-labelledby="sort-group-label"
              >
                {Object.entries(map)
                  .filter(([k]) => k !== "sort" && k !== "page")
                  .flatMap(([k, vs]) =>
                    vs.map((v, i) => (
                      <input key={`${k}-${i}`} type="hidden" name={k} value={v} />
                    )),
                  )}
                <ul className={styles.radioList} role="group" aria-labelledby="sort-group-label">
                  {[
                    { value: "price_asc", label: "Price: Low to High" },
                    { value: "price_desc", label: "Price: High to Low" },
                    { value: "name_asc", label: "Brand: A to Z" },
                    { value: "name_desc", label: "Brand: Z to A" },
                  ].map(({ value, label }) => {
                    const checked = currentSort === value;
                    const id = `sort-${value}`;
                    return (
                      <li key={value}>
                        <label
                          htmlFor={id}
                          className={`${styles.radioItem}${checked ? ` ${styles.selected}` : ""}`}
                        >
                          <input
                            type="radio"
                            id={id}
                            name="sort"
                            value={value}
                            defaultChecked={checked}
                            className={styles.srOnly}
                          />
                          <span className={styles.radioIndicator} aria-hidden="true" />
                          {label}
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <noscript>
                  <button type="submit" className={styles.sortSubmit}>
                    Apply sort
                  </button>
                </noscript>
              </form>
              {/* Auto-submit the form immediately on radio change when JS is available. */}
              <script
                dangerouslySetInnerHTML={{
                  __html:
                    "var _sf=document.getElementById('sort-form');if(_sf)_sf.addEventListener('change',function(){_sf.submit();});",
                }}
              />
            </div>

            {/* ── Brand ── */}
            {brands.length > 0 && (
              <div className={styles.group}>
                <p className={styles.groupLabel}>Brand</p>
                <ul className={`${styles.checkList} ${styles.scrollable}`} role="list">
                  {brands.map((brand) => {
                    const checked = selectedBrands.includes(brand.id);
                    return (
                      <li key={brand.id}>
                        <Link
                          href={rawMapToUrl(toggleValue(map, "brandId", brand.id))}
                          role="checkbox"
                          aria-checked={checked}
                          className={`${styles.checkItem}${checked ? ` ${styles.selected}` : ""}`}
                        >
                          <span className={styles.checkIndicator} aria-hidden="true" />
                          {brand.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* ── Variant ── */}
            {variantGroups.length > 0 && (
              <div className={styles.group}>
                <p className={styles.groupLabel}>Variant</p>
                <ul className={`${styles.checkList} ${styles.scrollable}`} role="list">
                  {variantGroups.map((group) => {
                    const checked = group.ids.some((id) => selectedVariants.includes(id));
                    return (
                      <li key={group.name}>
                        <Link
                          href={rawMapToUrl(toggleVariantGroup(map, group.ids))}
                          role="checkbox"
                          aria-checked={checked}
                          className={`${styles.checkItem}${checked ? ` ${styles.selected}` : ""}`}
                        >
                          <span className={styles.checkIndicator} aria-hidden="true" />
                          {group.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* ── Style ── */}
            {stylesList.length > 0 && (
              <div className={styles.group}>
                <p className={styles.groupLabel}>Style</p>
                <ul className={styles.checkList} role="list">
                  {stylesList.map((style) => {
                    const checked = selectedStyles.includes(style.id);
                    return (
                      <li key={style.id}>
                        <Link
                          href={rawMapToUrl(toggleValue(map, "styleId", style.id))}
                          role="checkbox"
                          aria-checked={checked}
                          className={`${styles.checkItem}${checked ? ` ${styles.selected}` : ""}`}
                        >
                          <span className={styles.checkIndicator} aria-hidden="true" />
                          {style.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* ── Serving ── */}
            <div className={styles.group}>
              <p className={styles.groupLabel}>Serving</p>
              <ul className={styles.checkList} role="list">
                {SERVING_TYPE_OPTIONS.map(({ value, label }) => {
                  const checked = selectedServings.includes(value);
                  return (
                    <li key={value}>
                      <Link
                        href={rawMapToUrl(toggleValue(map, "serving", value))}
                        role="checkbox"
                        aria-checked={checked}
                        className={`${styles.checkItem}${checked ? ` ${styles.selected}` : ""}`}
                      >
                        <span className={styles.checkIndicator} aria-hidden="true" />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* ── Size ── */}
            {sizes.length > 0 && (
              <div className={styles.group}>
                <p className={styles.groupLabel}>Size (ml)</p>
                <ul className={styles.checkList} role="list">
                  {sizes.map((size) => {
                    const checked = selectedSizes.includes(String(size));
                    return (
                      <li key={size}>
                        <Link
                          href={rawMapToUrl(toggleValue(map, "sizeMl", String(size)))}
                          role="checkbox"
                          aria-checked={checked}
                          className={`${styles.checkItem}${checked ? ` ${styles.selected}` : ""}`}
                        >
                          <span className={styles.checkIndicator} aria-hidden="true" />
                          {size} ml
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* ── Location Type ── */}
            <div className={styles.group}>
              <p className={styles.groupLabel}>Location Type</p>
              <ul className={styles.checkList} role="list">
                {LOCATION_TYPE_OPTIONS.map(({ value, label }) => {
                  const checked = selectedLocationTypes.includes(value);
                  return (
                    <li key={value}>
                      <Link
                        href={rawMapToUrl(toggleValue(map, "locationType", value))}
                        role="checkbox"
                        aria-checked={checked}
                        className={`${styles.checkItem}${checked ? ` ${styles.selected}` : ""}`}
                      >
                        <span className={styles.checkIndicator} aria-hidden="true" />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* ── Location ── */}
            {locations.length > 0 && (
              <div className={styles.group}>
                <p className={styles.groupLabel}>Location</p>
                <ul className={`${styles.checkList} ${styles.scrollable}`} role="list">
                  {locations.map((location) => {
                    const checked = selectedLocations.includes(location.id);
                    return (
                      <li key={location.id}>
                        <Link
                          href={rawMapToUrl(toggleValue(map, "locationId", location.id))}
                          role="checkbox"
                          aria-checked={checked}
                          className={`${styles.checkItem}${checked ? ` ${styles.selected}` : ""}`}
                        >
                          <span className={styles.checkIndicator} aria-hidden="true" />
                          {location.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}
