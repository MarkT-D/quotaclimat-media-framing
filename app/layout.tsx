import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import NewspaperHeader from "@/components/NewspaperHeader";

const playfairDisplay = localFont({
  variable: "--font-playfair",
  src: [
    { path: "../node_modules/@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../node_modules/@fontsource/playfair-display/files/playfair-display-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../node_modules/@fontsource/playfair-display/files/playfair-display-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "../node_modules/@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../node_modules/@fontsource/playfair-display/files/playfair-display-latin-700-italic.woff2", weight: "700", style: "italic" },
  ],
});
const playfairDisplaySC = localFont({
  variable: "--font-playfair-sc",
  src: [
    { path: "../node_modules/@fontsource/playfair-display-sc/files/playfair-display-sc-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/playfair-display-sc/files/playfair-display-sc-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});
const sourceSerif4 = localFont({
  variable: "--font-source-serif",
  src: [
    { path: "../node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "../node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-300-italic.woff2", weight: "300", style: "italic" },
    { path: "../node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-600-italic.woff2", weight: "600", style: "italic" },
  ],
});
const ibmPlexSans = localFont({
  variable: "--font-plex-sans",
  src: [
    { path: "../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
});
const podkova = localFont({
  variable: "--font-podkova",
  src: [
    { path: "../node_modules/@fontsource/podkova/files/podkova-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/podkova/files/podkova-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
});
const quantico = localFont({
  variable: "--font-quantico",
  src: [
    { path: "../node_modules/@fontsource/quantico/files/quantico-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/quantico/files/quantico-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../node_modules/@fontsource/quantico/files/quantico-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../node_modules/@fontsource/quantico/files/quantico-latin-700-italic.woff2", weight: "700", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: "The Climate Narrative Review",
  description: "Frame analysis for those who shape coverage.",
};

const fontVars = [
  playfairDisplay.variable,
  playfairDisplaySC.variable,
  sourceSerif4.variable,
  ibmPlexSans.variable,
  podkova.variable,
  quantico.variable,
].join(" ");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars} data-scroll-behavior="smooth">
      <body className="min-h-full">
        <NewspaperHeader />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
