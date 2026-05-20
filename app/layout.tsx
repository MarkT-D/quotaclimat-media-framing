import type { Metadata } from "next";
import {
  IBM_Plex_Sans,
  Playfair_Display,
  Playfair_Display_SC,
  Podkova,
  Quantico,
  Source_Serif_4,
} from "next/font/google";
import "./globals.css";
import NewspaperHeader from "@/components/NewspaperHeader";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
});
const playfairDisplaySC = Playfair_Display_SC({
  variable: "--font-playfair-sc",
  subsets: ["latin"],
  weight: ["400", "700"],
});
const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
});
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const podkova = Podkova({
  variable: "--font-podkova",
  subsets: ["latin"],
  weight: ["400", "600"],
});
const quantico = Quantico({
  variable: "--font-quantico",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
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
    <html lang="en" className={fontVars}>
      <body className="min-h-full">
        <NewspaperHeader />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
