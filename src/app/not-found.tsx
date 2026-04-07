import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        padding: "1rem",
        display: "grid",
        gap: "1rem",
      }}
    >
      <section
        style={{
          border: "var(--border-heavy)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-block)",
          padding: "1rem",
        }}
      >
        <h1>Location not found</h1>
        <p>The requested location does not exist in this dataset.</p>
        <p>
          <Link href="/">Go back to Kiel Beer Index</Link>
        </p>
      </section>
    </main>
  );
}
