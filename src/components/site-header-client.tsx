"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import type { AuthUser } from "@/lib/types";
import styles from "./site-header.module.css";

type Props = {
  authUser: AuthUser | null;
  pendingCount: number;
};

export function SiteHeaderClient({ authUser, pendingCount }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  function close() {
    setIsOpen(false);
  }

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link href="/" className={styles.brand} onClick={close}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M22 14C27 14 30 17 30 21C30 25 27 28 22 28"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <rect
              x="3"
              y="10"
              width="19"
              height="19"
              rx="1"
              fill="#FFD46B"
              stroke="currentColor"
              strokeWidth="2"
            />
            <rect
              x="2"
              y="5"
              width="7"
              height="7"
              fill="white"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="9"
              y="1"
              width="8"
              height="11"
              fill="white"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <rect
              x="17"
              y="4"
              width="7"
              height="8"
              fill="white"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
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
                {pendingCount > 0 && (
                  <span className={styles.queueBadge} aria-label={`${pendingCount} pending`}>
                    {pendingCount}
                  </span>
                )}
              </Link>
            )}
            {authUser.role === "admin" && (
              <Link href="/admin" className={styles.navLink} onClick={close}>
                Admin
                {pendingCount > 0 && (
                  <span className={styles.queueBadge} aria-label={`${pendingCount} pending`}>
                    {pendingCount}
                  </span>
                )}
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
