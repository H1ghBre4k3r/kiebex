import styles from "./page.module.css";

export default function Loading() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Loading location...</h1>
        <p>Fetching offers, reviews, and recent price history.</p>
      </header>

      <section className={styles.panel} aria-busy="true" aria-live="polite">
        <h2>Loading details</h2>
        <p>Please wait while the page is assembled.</p>
      </section>
    </main>
  );
}
