import type { Metadata } from "next";
import {
  Podkova,
  Quattrocento,
  Playfair_Display,
  Playfair_Display_SC,
  Source_Serif_4,
  Quantico,
  Special_Elite,
} from "next/font/google";
import "./globals.css";
import NewspaperHeader from "@/components/NewspaperHeader";

const podkova = Podkova({
  variable: "--font-podkova",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const quattrocento = Quattrocento({
  variable: "--font-quattrocento",
  subsets: ["latin"],
  weight: ["400", "700"],
});
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
});
const quantico = Quantico({
  variable: "--font-quantico",
  subsets: ["latin"],
  weight: ["400", "700"],
});
const specialElite = Special_Elite({
  variable: "--font-special-elite",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "The Climate Narrative Review",
  description: "Frame analysis for those who shape coverage.",
};

const fontVars = [
  podkova.variable,
  quattrocento.variable,
  playfairDisplay.variable,
  playfairDisplaySC.variable,
  sourceSerif4.variable,
  quantico.variable,
  specialElite.variable,
].join(" ");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body className="min-h-full text-neutral-900">
        <NewspaperHeader />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
