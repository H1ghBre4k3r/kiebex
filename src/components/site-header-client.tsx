"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import type { AuthUser } from "@/lib/types";
import styles from "./site-header.module.css";

type Props = {
  authUser: AuthUser | null;
};

export function SiteHeaderClient({ authUser }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  function close() {
    setIsOpen(false);
  }

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link href="/" className={styles.brand} onClick={close}>
          Kiel Beer Index
        </Link>
        <button
          className={styles.hamburger}
          aria-expanded={isOpen}
          aria-controls="site-nav"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setIsOpen((o) => !o)}
        >
          {isOpen ? "✕" : "≡"}
        </button>
      </div>

      <nav
        id="site-nav"
        className={isOpen ? styles.navOpen : styles.nav}
        aria-label="Site navigation"
      >
        {authUser ? (
          <>
            <span className={styles.navStatus}>{authUser.displayName}</span>
            <Link href="/contribute" className={styles.navLink} onClick={close}>
              Contribute
            </Link>
            <Link href="/profile" className={styles.navLink} onClick={close}>
              Profile
            </Link>
            {authUser.role === "moderator" && (
              <Link href="/moderation" className={styles.navLink} onClick={close}>
                Moderation
              </Link>
            )}
            {authUser.role === "admin" && (
              <Link href="/admin" className={styles.navLink} onClick={close}>
                Admin
              </Link>
            )}
            <LogoutButton className={styles.navButton} />
          </>
        ) : (
          <>
            <Link href="/login" className={styles.navLink} onClick={close}>
              Sign In
            </Link>
            <Link href="/register" className={styles.navLink} onClick={close}>
              Create Account
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
