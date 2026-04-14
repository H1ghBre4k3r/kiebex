import type { Metadata } from "next";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "AGB",
};

export default function AgbPage() {
  return (
    <div className={styles.container}>
      <main className={styles.content}>
        <h1>Allgemeine Geschäftsbedingungen</h1>
        <p>[Placeholder for Terms and Conditions]</p>
        <h2>§1 Geltungsbereich</h2>
        <p>Beschreibung des Geltungsbereichs der AGB.</p>
        <h2>§2 Leistungen</h2>
        <p>Beschreibung der angebotenen Leistungen.</p>
        <h2>§3 Haftung</h2>
        <p>Haftungsausschluss und -begrenzung.</p>
      </main>
    </div>
  );
}
