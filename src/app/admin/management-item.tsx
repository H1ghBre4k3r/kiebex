"use client";

import type { ReactNode } from "react";
import styles from "./shared-management.module.css";

type ManagementItemProps = {
  title: ReactNode;
  status: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function ManagementItem({
  title,
  status,
  expanded,
  onToggle,
  children,
}: ManagementItemProps) {
  return (
    <li className={`${styles.item} ${expanded ? styles.expanded : ""}`}>
      <button
        type="button"
        className={styles.rowHeader}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className={styles.rowTitle}>{title}</span>
        <span className={styles.rowStatus}>{status}</span>
        <span className={styles.rowIcon}>{expanded ? "−" : "+"}</span>
      </button>

      {expanded ? <div className={styles.rowBody}>{children}</div> : null}
    </li>
  );
}

export function ManagementError({ message }: { message: string }) {
  return (
    <p className={styles.error} role="alert" aria-live="polite">
      {message}
    </p>
  );
}
