"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/overview", label: "Dashboard" },
  { href: "/search", label: "The Reader" },
  { href: "/newspapers", label: "Discrepancy Desk" },
  { href: "/about", label: "About us" },
];

// Single masthead layout: one-line wordmark with date / desk labels on the
// sides, italic tagline below, hairline, nav strip, hairline. Same size and
// structure on every page. Header is always sticky.
export default function NewspaperHeader() {
  const pathname = usePathname();

  // "Updated HH:MM CET" timestamp displayed under "Climate Desk" on the right
  // side of the masthead row. Computed in useEffect to avoid SSR/hydration
  // mismatch when the minute changes between server render and client hydration.
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    setTime(`${h}:${m}`);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{ backgroundColor: "var(--bg)" }}
    >
      {/* paddingTop on the wrapper (not marginTop on the inner masthead row) —
          margin would collapse through the header into <body>, offsetting body's
          top by 16px and exposing a visible band of the page background as a
          seam at the top of the viewport. Padding doesn't collapse, so the
          sticky header sits flush against the viewport top. */}
      <div className="max-w-[1440px] mx-auto px-11" style={{ paddingTop: 24 }}>

        {/* Masthead row: date / wordmark / desk, one line, wordmark page-centered.
            Wordmark uses clamp() so the page degrades gracefully on narrow
            viewports without breaking the layout. Side labels are flex children
            anchored to the edges; the wordmark is absolutely positioned at the
            page horizontal center, with pointer-events: none so the labels
            remain interactive even if the wordmark visually overlaps them on
            narrow viewports.

            Wordmark is fontWeight 400 (regular). Playfair SC at 48px + all-caps
            + letter-spacing 0.05em already does substantial weight-feeling
            work; bold would push the high-contrast didone letterforms into
            shouty register. Regular reads as authoritative and gives the date
            label ~32px of breathing room. */}
        <div className="relative flex items-center justify-between"
          style={{ height: 56 }}>

          {/* Date metadata: two-line stack, left-aligned. The whole block is
              vertically centered against the masthead's midpoint by the row's
              `items-center` — its optical center shares the same horizontal
              axis as the wordmark's. */}
          <div style={{
            fontFamily: "var(--font-plex-sans)",
            fontSize: 13,
            lineHeight: 1.25,
            color: "var(--t2)",
          }}>
            <div>Tuesday, May 5, 2026</div>
            <div>Vol. I &mdash; No. 17</div>
          </div>

          <div className="absolute"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              fontFamily: "var(--font-playfair-sc)",
              fontWeight: 400,
              fontSize: "clamp(20px, 3.4vw, 48px)",
              lineHeight: 1,
              letterSpacing: "0.05em",
              color: "var(--t1)",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}>
            THE CLIMATE NARRATIVE REVIEW
          </div>

          {/* Right side: "Climate Desk" stacked above "Updated HH:MM CET".
              Replaces the previous per-page sub-strip's timestamp; the
              sub-strip itself is retired site-wide. */}
          <div className="flex flex-col items-end" style={{
            fontFamily: "var(--font-plex-sans)",
            color: "var(--t2)",
          }}>
            <div style={{ fontSize: 13, lineHeight: "17px" }}>
              Climate Desk
            </div>
            <div style={{ fontSize: 12, lineHeight: "16px" }}>
              Updated {time ?? "  :  "} CET
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="text-center" style={{
          fontFamily: "var(--font-playfair)",
          fontStyle: "italic",
          fontSize: 16,
          lineHeight: "20px",
          color: "var(--t2)",
          marginTop: 8,
          marginBottom: 16,
        }}>
          &ldquo;Frame analysis for those who shape coverage.&rdquo;
        </div>

        <div className="border-t border-[var(--t2)]" />

        {/* Nav strip */}
        <div className="flex items-center justify-center py-[7px]">
          {NAV.map((link, i) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <div key={link.href} className="flex items-center">
                {i > 0 && <div className="w-px h-[14px] bg-[var(--t2)] mx-5" />}
                <Link
                  href={link.href}
                  style={{
                    fontFamily: "var(--font-plex-sans)",
                    fontSize: 13,
                    lineHeight: "14px",
                    color: active ? "var(--t1)" : "var(--t2)",
                  }}
                >
                  {link.label}
                </Link>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[var(--t2)]" />
      </div>
    </header>
  );
}
