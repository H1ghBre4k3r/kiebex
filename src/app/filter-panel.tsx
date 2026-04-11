"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "./filter-panel.module.css";

const SERVING_TYPES = [
  { value: "tap", label: "On Tap" },
  { value: "bottle", label: "Bottle" },
  { value: "can", label: "Can" },
] as const;

const LOCATION_TYPES = [
  { value: "pub", label: "Pub" },
  { value: "bar", label: "Bar" },
  { value: "restaurant", label: "Restaurant" },
  { value: "supermarket", label: "Supermarket" },
] as const;

type Props = {
  brands: { id: string; name: string }[];
  variants: { id: string; name: string; brandId: string }[];
  stylesList: { id: string; name: string }[];
  sizes: number[];
  locations: { id: string; name: string }[];
};

export function FilterPanel({ brands, variants, stylesList, sizes, locations }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const selectedBrands = searchParams.getAll("brandId");
  const selectedVariants = searchParams.getAll("variantId");
  const selectedStyles = searchParams.getAll("styleId");
  const selectedSizes = searchParams.getAll("sizeMl");
  const selectedServings = searchParams.getAll("serving");
  const selectedLocationTypes = searchParams.getAll("locationType");
  const selectedLocations = searchParams.getAll("locationId");
  const currentSort = searchParams.get("sort") ?? "price_asc";

  const visibleVariants =
    selectedBrands.length > 0
      ? variants.filter((v) => selectedBrands.includes(v.brandId))
      : variants;

  // Merge variants with the same name into a single checkbox entry.
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

  const [isOpen, setIsOpen] = useState(false);

  function buildUrl(updates: Record<string, string[]>): string {
    const params = new URLSearchParams();

    // Carry over all existing params, then apply updates.
    // Always drop "page" unless it is explicitly included in updates, so any
    // filter change resets pagination back to page 1.
    const keys = new Set([...Array.from(searchParams.keys()), ...Object.keys(updates)]);

    for (const key of keys) {
      if (key === "page" && !(key in updates)) continue;
      const updated = updates[key];
      if (updated !== undefined) {
        for (const v of updated) {
          params.append(key, v);
        }
      } else {
        for (const v of searchParams.getAll(key)) {
          params.append(key, v);
        }
      }
    }

    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  function toggle(key: string, value: string) {
    const current = searchParams.getAll(key);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    const url = buildUrl({ [key]: next });
    startTransition(() => {
      router.push(url, { scroll: false });
    });
  }

  function toggleVariantGroup(ids: string[]) {
    const current = searchParams.getAll("variantId");
    const anySelected = ids.some((id) => current.includes(id));
    const next = anySelected
      ? current.filter((v) => !ids.includes(v))
      : [...current, ...ids.filter((id) => !current.includes(id))];
    const url = buildUrl({ variantId: next });
    startTransition(() => {
      router.push(url, { scroll: false });
    });
  }

  function handleBrandToggle(brandId: string) {
    const currentBrands = searchParams.getAll("brandId");
    const isDeselecting = currentBrands.includes(brandId);
    const nextBrands = isDeselecting
      ? currentBrands.filter((b) => b !== brandId)
      : [...currentBrands, brandId];

    const url = buildUrl({ brandId: nextBrands });
    startTransition(() => {
      router.push(url, { scroll: false });
    });
  }

  function setSort(value: string) {
    const params = new URLSearchParams();
    for (const [k, v] of searchParams.entries()) {
      if (k !== "sort" && k !== "page") params.append(k, v);
    }
    if (value !== "price_asc") {
      params.set("sort", value);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/?${qs}` : "/", { scroll: false });
    });
  }

  return (
    <section
      className={`${styles.panel}${isPending ? ` ${styles.pending}` : ""}`}
      aria-label="Filter offers"
    >
      {/* Mobile toggle — hidden on desktop via CSS */}
      <button
        className={styles.toggle}
        aria-expanded={isOpen}
        aria-controls="filter-body"
        onClick={() => setIsOpen((o) => !o)}
      >
        <span>Filter Offers{activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}</span>
        <span aria-hidden="true">{isOpen ? "▲" : "▼"}</span>
      </button>

      {/* Body: collapsed on mobile until toggled, always visible on desktop */}
      <div id="filter-body" className={isOpen ? styles.bodyOpen : styles.body}>
        <div className={styles.panelHeader}>
          <h2 id="filter-heading">Filter Offers</h2>
          {hasAnyFilter && (
            <Link href="/" className={styles.clearAll}>
              Clear All
            </Link>
          )}
        </div>

        <div className={styles.groups}>
          {/* Sort */}
          <div className={styles.group}>
            <p className={styles.groupLabel}>Sort By</p>
            <ul className={styles.radioList} role="list">
              {[
                { value: "price_asc", label: "Price: Low to High" },
                { value: "price_desc", label: "Price: High to Low" },
              ].map(({ value, label }) => (
                <li key={value} className={styles.radioItem}>
                  <input
                    type="radio"
                    id={`sort-${value}`}
                    name="sort"
                    className={styles.radioInput}
                    checked={currentSort === value}
                    onChange={() => setSort(value)}
                  />
                  <label htmlFor={`sort-${value}`}>{label}</label>
                </li>
              ))}
            </ul>
          </div>

          {/* Brand */}
          {brands.length > 0 && (
            <div className={styles.group}>
              <p className={styles.groupLabel}>Brand</p>
              <ul className={`${styles.checkList} ${styles.scrollable}`} role="list">
                {brands.map((brand) => (
                  <li key={brand.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      id={`brand-${brand.id}`}
                      className={styles.checkInput}
                      checked={selectedBrands.includes(brand.id)}
                      onChange={() => handleBrandToggle(brand.id)}
                    />
                    <label htmlFor={`brand-${brand.id}`}>{brand.name}</label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Variant */}
          {variantGroups.length > 0 && (
            <div className={styles.group}>
              <p className={styles.groupLabel}>Variant</p>
              <ul className={`${styles.checkList} ${styles.scrollable}`} role="list">
                {variantGroups.map((group) => (
                  <li key={group.name} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      id={`variant-${group.name}`}
                      className={styles.checkInput}
                      checked={group.ids.some((id) => selectedVariants.includes(id))}
                      onChange={() => toggleVariantGroup(group.ids)}
                    />
                    <label htmlFor={`variant-${group.name}`}>{group.name}</label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Style */}
          {stylesList.length > 0 && (
            <div className={styles.group}>
              <p className={styles.groupLabel}>Style</p>
              <ul className={styles.checkList} role="list">
                {stylesList.map((style) => (
                  <li key={style.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      id={`style-${style.id}`}
                      className={styles.checkInput}
                      checked={selectedStyles.includes(style.id)}
                      onChange={() => toggle("styleId", style.id)}
                    />
                    <label htmlFor={`style-${style.id}`}>{style.name}</label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Serving */}
          <div className={styles.group}>
            <p className={styles.groupLabel}>Serving</p>
            <ul className={styles.checkList} role="list">
              {SERVING_TYPES.map(({ value, label }) => (
                <li key={value} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    id={`serving-${value}`}
                    className={styles.checkInput}
                    checked={selectedServings.includes(value)}
                    onChange={() => toggle("serving", value)}
                  />
                  <label htmlFor={`serving-${value}`}>{label}</label>
                </li>
              ))}
            </ul>
          </div>

          {/* Size */}
          {sizes.length > 0 && (
            <div className={styles.group}>
              <p className={styles.groupLabel}>Size (ml)</p>
              <ul className={styles.checkList} role="list">
                {sizes.map((size) => (
                  <li key={size} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      id={`size-${size}`}
                      className={styles.checkInput}
                      checked={selectedSizes.includes(String(size))}
                      onChange={() => toggle("sizeMl", String(size))}
                    />
                    <label htmlFor={`size-${size}`}>{size} ml</label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Location Type */}
          <div className={styles.group}>
            <p className={styles.groupLabel}>Location Type</p>
            <ul className={styles.checkList} role="list">
              {LOCATION_TYPES.map(({ value, label }) => (
                <li key={value} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    id={`loctype-${value}`}
                    className={styles.checkInput}
                    checked={selectedLocationTypes.includes(value)}
                    onChange={() => toggle("locationType", value)}
                  />
                  <label htmlFor={`loctype-${value}`}>{label}</label>
                </li>
              ))}
            </ul>
          </div>

          {/* Location */}
          {locations.length > 0 && (
            <div className={styles.group}>
              <p className={styles.groupLabel}>Location</p>
              <ul className={`${styles.checkList} ${styles.scrollable}`} role="list">
                {locations.map((location) => (
                  <li key={location.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      id={`location-${location.id}`}
                      className={styles.checkInput}
                      checked={selectedLocations.includes(location.id)}
                      onChange={() => toggle("locationId", location.id)}
                    />
                    <label htmlFor={`location-${location.id}`}>{location.name}</label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
