import type { Metadata } from "next";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
};

export default function DatenschutzPage() {
  return (
    <div className={styles.container}>
      <main className={styles.content}>
        <h1>Datenschutzerklärung</h1>
        <p>[Placeholder for Privacy Policy compliant with GDPR / DSGVO]</p>
        <h2>1. Datenschutz auf einen Blick</h2>
        <p>Allgemeine Hinweise und Pflichtinformationen.</p>
        <h2>2. Datenerfassung auf dieser Website</h2>
        <p>Cookies, Server-Log-Dateien, Kontaktformular, etc.</p>
        <h2>3. Analyse-Tools und Werbung</h2>
        <p>Informationen zu verwendeten Analyse-Diensten.</p>
      </main>
    </div>
  );
}
