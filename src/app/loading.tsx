import styles from "./page.module.css";

export default function Loading() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.kicker}>Public Price Tracker</p>
        <h1>Kiel Beer Index</h1>
        <p>Loading the latest offers and filters...</p>
      </header>

      <main className={styles.main}>
        <section className={styles.panel} aria-busy="true" aria-live="polite">
          <h2>Loading offers</h2>
          <p>Fetching current prices and filter options.</p>
        </section>
      </main>
    </div>
  );
}
