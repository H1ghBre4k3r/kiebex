"use client";

import { useRef } from "react";
import styles from "./filter-panel.module.css";

type SortValue = "price_asc" | "price_desc" | "name_asc" | "name_desc";

type Props = {
  currentSort: string;
  preservedParams: Record<string, string[]>;
};

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Brand: A to Z" },
  { value: "name_desc", label: "Brand: Z to A" },
];

export function SortForm({ currentSort, preservedParams }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      method="GET"
      action="/"
      aria-labelledby="sort-group-label"
      onChange={(event) => {
        if ((event.target as HTMLElement).tagName === "INPUT") {
          formRef.current?.requestSubmit();
        }
      }}
    >
      {Object.entries(preservedParams).flatMap(([key, values]) =>
        values.map((value, index) => (
          <input key={`${key}-${index}`} type="hidden" name={key} value={value} />
        )),
      )}
      <ul className={styles.radioList} role="group" aria-labelledby="sort-group-label">
        {SORT_OPTIONS.map(({ value, label }) => {
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
  );
}
