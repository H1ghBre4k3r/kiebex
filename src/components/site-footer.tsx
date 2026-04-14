import Link from "next/link";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <p className={styles.name}>Kiel Beer Index</p>
          <p className={styles.tagline}>Tracking prices for the greater good.</p>
        </div>
        <nav className={styles.nav}>
          <Link href="/impressum" className={styles.link}>
            Impressum
          </Link>
          <Link href="/datenschutz" className={styles.link}>
            Datenschutz
          </Link>
          <Link href="/agb" className={styles.link}>
            AGB
          </Link>
        </nav>
      </div>
      <div className={styles.bottom}>
        <p>&copy; {new Date().getFullYear()} Kiel Beer Index. No rights reserved. It&apos;s a project.</p>
      </div>
    </footer>
  );
}
