import type { Metadata } from "next";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Impressum",
};

export default function ImpressumPage() {
  return (
    <div className={styles.container}>
      <main className={styles.content}>
        <h1>Impressum</h1>
        <p>[Placeholder for Legal Notice according to German law (§ 5 TMG)]</p>
        <h2>Angaben gemäß § 5 TMG</h2>
        <p>
          [Name des Betreibers]<br />
          [Straße und Hausnummer]<br />
          [PLZ und Ort]
        </p>
        <h2>Kontakt</h2>
        <p>
          Telefon: [Telefonnummer]<br />
          E-Mail: [E-Mail-Adresse]
        </p>
        <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>
          [Name]<br />
          [Straße und Hausnummer]<br />
          [PLZ und Ort]
        </p>
      </main>
    </div>
  );
}
