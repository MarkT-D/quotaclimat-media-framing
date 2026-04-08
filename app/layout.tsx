import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuotaClimat — Media Analysis Dashboard",
  description: "Computational analysis of environmental newspaper coverage in France and Belgium.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-neutral-50 text-neutral-900 flex">
        <Nav />
        <main className="flex-1 ml-56 min-h-screen p-8">{children}</main>
      </body>
    </html>
  );
}
