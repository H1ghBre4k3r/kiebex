import type { Metadata } from "next";
import { Oswald, Space_Mono } from "next/font/google";
import "./globals.css";

const headingFont = Oswald({
  variable: "--font-heading",
  subsets: ["latin"],
});

const bodyFont = Space_Mono({
  variable: "--font-body",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Kiel Beer Index",
    template: "%s | Kiel Beer Index",
  },
  description: "Compare beer prices across bars, pubs, restaurants, and supermarkets in Kiel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
