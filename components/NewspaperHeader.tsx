"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/overview", label: "Dashboard" },
  { href: "/search", label: "The Reader" },
  { href: "/newspapers", label: "Discrepancy Desk" },
  { href: "/about", label: "About us" },
];

const COLLAPSE_AT = 160;
const EXPAND_AT = 20;
const MAX_HEIGHT = 280;

export default function NewspaperHeader() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const hoveringRef = useRef(false);

  useEffect(() => {
    const el = headerRef.current;

    const onScroll = () => {
      if (hoveringRef.current) return;
      const y = window.scrollY;
      if (y < EXPAND_AT) setCollapsed(false);
      else if (y > COLLAPSE_AT) setCollapsed(true);
    };

    const onEnter = () => { hoveringRef.current = true; if (window.scrollY > EXPAND_AT) setCollapsed(false); };
    const onLeave = () => { hoveringRef.current = false; if (window.scrollY > COLLAPSE_AT) setCollapsed(true); };

    window.addEventListener("scroll", onScroll, { passive: true });
    el?.addEventListener("mouseenter", onEnter);
    el?.addEventListener("mousemove", onEnter);
    el?.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("scroll", onScroll);
      el?.removeEventListener("mouseenter", onEnter);
      el?.removeEventListener("mousemove", onEnter);
      el?.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <header ref={headerRef} className="sticky top-0 z-50 w-full"
      style={{ backgroundColor: "var(--bg)" }}>
      <div className="max-w-[1440px] mx-auto px-11">

        {/* Collapsible masthead */}
        <div style={{
          maxHeight: collapsed ? 0 : MAX_HEIGHT,
          opacity: collapsed ? 0 : 1,
          overflow: "hidden",
          transition: "max-height 0.4s ease, opacity 0.25s ease",
        }}>
          <div className="relative flex items-start justify-between pt-12 pb-6">
            <div style={{ fontFamily: "var(--font-plex-sans)", fontSize: 13, lineHeight: "17px", color: "var(--t2)" }}>
              Tuesday, May 5, 2026 Vol. I &mdash; No. 17
            </div>

            <div
              className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none"
              style={{ top: 20 }}
            >
              <div style={{
                fontFamily: "var(--font-playfair-sc)",
                fontWeight: 700,
                fontSize: 29,
                lineHeight: "39px",
                letterSpacing: "0.05em",
                color: "var(--t1)",
              }}>
                THE CLIMATE NARRATIVE REVIEW
              </div>
              <div style={{
                fontFamily: "var(--font-playfair)",
                fontStyle: "italic",
                fontSize: 14,
                lineHeight: "17px",
                color: "var(--t2)",
                marginTop: 8,
              }}>
                &ldquo;Frame analysis for those who shape coverage.&rdquo;
              </div>
            </div>

            <div className="text-right" style={{ fontFamily: "var(--font-plex-sans)", fontSize: 13, lineHeight: "20px", color: "var(--t2)" }}>
              <div>Climate Desk</div>
            </div>
          </div>

          <div className="border-t border-[var(--t2)]" />
        </div>

        {/* Nav strip — always visible */}
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
