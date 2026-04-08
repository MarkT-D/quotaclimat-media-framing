"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  Search,
  Upload,
  Info,
} from "lucide-react";

const links = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/newspapers", label: "Outlets", icon: Newspaper },
  { href: "/search", label: "Articles", icon: Search },
  { href: "/upload", label: "Analyse Article", icon: Upload },
  { href: "/about", label: "Our Mission", icon: Info },
];

const Logo = () => (
  <svg width="38" height="38" viewBox="0 0 42 42" fill="none">
    <rect width="42" height="42" rx="11" fill="#2D6A4F" />
    <rect x="8" y="12" width="18" height="2.5" rx="1.25" fill="white" />
    <rect x="8" y="17.5" width="14" height="2.5" rx="1.25" fill="white" opacity="0.7" />
    <rect x="8" y="23" width="16" height="2.5" rx="1.25" fill="white" opacity="0.5" />
    <circle cx="31" cy="16" r="6.5" fill="#C8392B" />
    <path d="M31 13 L31 16 L33 18" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="8" y="28.5" width="26" height="1.5" rx="0.75" fill="white" opacity="0.2" />
  </svg>
);

export default function Nav() {
  const pathname = usePathname();
  return (
    <aside
      className="fixed left-0 top-0 h-full w-56 flex flex-col z-40"
      style={{ background: "var(--bg)", borderRight: "0.5px solid var(--border)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: "2px solid var(--red)" }}>
        <Logo />
        <div>
          <p className="font-medium text-sm leading-tight" style={{ color: "var(--t1)" }}>
            The Climate<br />Narrative Lab
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--t2)" }}>
            Media analysis platform
          </p>
        </div>
      </div>

      {/* Pills */}
      <div className="flex flex-col gap-1.5 px-4 py-3" style={{ borderBottom: "0.5px solid var(--border)" }}>
        <span
          className="inline-flex w-fit items-center px-2.5 py-1 rounded-full text-[11px] font-medium"
          style={{ background: "var(--green-l)", color: "var(--green-d)" }}
        >
          74 outlets monitored
        </span>
        <span
          className="inline-flex w-fit items-center px-2.5 py-1 rounded-full text-[11px] font-medium"
          style={{ background: "var(--red-l)", color: "var(--red-d)" }}
        >
          Prototype · 2026
        </span>
      </div>

      {/* Links */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={
                active
                  ? { background: "var(--red-l)", color: "var(--red)", fontWeight: 500 }
                  : { color: "var(--t2)" }
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4" style={{ borderTop: "0.5px solid var(--border)" }}>
        <p className="text-[10px] leading-relaxed" style={{ color: "var(--t2)" }}>
          Mock data prototype.<br />
          BERT analysis pending.
        </p>
      </div>
    </aside>
  );
}
