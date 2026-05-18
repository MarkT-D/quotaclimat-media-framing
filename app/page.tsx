import Link from "next/link";
import TypingGreeting from "@/components/TypingGreeting";

const F = {
  podkova:    "var(--font-podkova)",
  quattro:    "var(--font-quattrocento)",
  playfair:   "var(--font-playfair)",
  playfairSC: "var(--font-playfair-sc)",
  serif:      "var(--font-source-serif)",
  quantico:   "var(--font-quantico)",
};

type Edition = {
  number: string;
  numberColor: string;
  underline: boolean;
  border: boolean;
  numberSize: number;
  titleSize: number;
  numberMarginTop: number;
  labelSide: "left" | "right";
  label: string;
  title: string;
  italic: boolean;
  desc: string;
  cta: string;
  href: string;
};

function Rule() {
  return <div className="border-t border-[#616161]" />;
}

function EditionCard({ ed, height, padLeft, padRight }: {
  ed: Edition;
  height: number;
  padLeft: number;
  padRight: number;
}) {
  const labelLeft = ed.labelSide === "left";
  return (
    <Link href={ed.href} className="group block">
      <div
        className="relative flex flex-col"
        style={{ height, paddingTop: 17, paddingBottom: 20, paddingLeft: padLeft, paddingRight: padRight }}
      >
        {/* Edition label - side alternates to mirror across the column divider */}
        <div
          className={`absolute top-[17px] ${labelLeft ? "left-0 text-left" : "right-0 text-right"}`}
          style={{
            fontFamily: F.podkova,
            fontSize: 13,
            color: "#616161",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            paddingLeft:  labelLeft ? padLeft  : 0,
            paddingRight: labelLeft ? 0 : padRight,
          }}
        >
          {ed.label}
        </div>

        {/* Number */}
        <div
          className="transition-transform duration-300 group-hover:-translate-y-1"
          style={{ marginTop: ed.numberMarginTop }}
        >
          {ed.border ? (
            <span style={{
              fontFamily: F.playfair, fontWeight: 400,
              fontSize: ed.numberSize, lineHeight: "1",
              color: ed.numberColor,
              border: "1px solid #000", display: "inline-block", padding: "2px 10px",
            }}>
              {ed.number}
            </span>
          ) : (
            <span style={{
              fontFamily: F.playfair, fontWeight: 400,
              fontSize: ed.numberSize, lineHeight: "1",
              color: ed.numberColor,
              textDecoration: ed.underline ? "underline" : "none",
            }}>
              {ed.number}
            </span>
          )}
        </div>

        {/* Title */}
        <div style={{
          fontFamily: F.playfair, fontWeight: 400,
          fontSize: ed.titleSize, lineHeight: "1.1",
          fontStyle: ed.italic ? "italic" : "normal",
          color: "#000", marginTop: 10,
        }}>
          {ed.title}
        </div>

        {/* Description */}
        <div
          className="flex-1 mt-4"
          style={{ fontFamily: F.podkova, fontSize: 15, color: "#616161", lineHeight: "21px" }}
        >
          {ed.desc}
        </div>

        {/* Divider */}
        <div className="border-t border-black mb-3" style={{ boxShadow: "0 4px 4px rgba(0,0,0,0.25)" }} />

        {/* CTA */}
        <div className="flex items-center gap-1">
          <span
            className="transition-colors group-hover:text-black"
            style={{ fontFamily: F.podkova, fontSize: 14, color: "#616161" }}
          >
            {ed.cta}
          </span>
          <span
            className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
            style={{ fontFamily: F.podkova, fontSize: 14, color: "#000" }}
          >
            &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}

type Slot = { ed: Edition; height: number };

// Left column: Dashboard (top, 310px) + Discrepancy Desk (bottom, 190px)
// Right column: The Reader (top, 240px) + About (bottom, 260px)
// The inner borders are deliberately mis-aligned (310 vs 240) — that offset IS the asymmetry.
const LEFT: Slot[] = [
  {
    height: 310,
    ed: {
      number: "01", numberColor: "#000", underline: true, border: false,
      numberSize: 96, titleSize: 38, numberMarginTop: 60, labelSide: "right",
      label: "Edition I", title: "Dashboard", italic: true,
      desc: "Sector coverage vs. GHG proportionality across 74 outlets.",
      cta: "Open Dashboard", href: "/overview",
    },
  },
  {
    height: 190,
    ed: {
      number: "02", numberColor: "#8EE339", underline: false, border: false,
      numberSize: 72, titleSize: 26, numberMarginTop: 24, labelSide: "right",
      label: "Edition II", title: "The Reader", italic: true,
      desc: "Where reported emissions diverge from measurable impact.",
      cta: "Pick & compare", href: "/search",
    },
  },
];

const RIGHT: Slot[] = [
  {
    height: 240,
    ed: {
      number: "03", numberColor: "#000", underline: false, border: false,
      numberSize: 76, titleSize: 28, numberMarginTop: 40, labelSide: "left",
      label: "Edition III", title: "Discrepancy desk", italic: false,
      desc: "Per-outlet framing patterns and publication statistics.",
      cta: "Search & Upload", href: "/newspapers",
    },
  },
  {
    height: 260,
    ed: {
      number: "Special", numberColor: "#000", underline: false, border: true,
      numberSize: 28, titleSize: 22, numberMarginTop: 28, labelSide: "left",
      label: "Special Edition", title: "About us", italic: false,
      desc: "Mission, methodology, and the research team behind the Lab.",
      cta: "Explore", href: "/about",
    },
  },
];

const TICKER_ITEMS = [
  "Coverage gaps", "Framing bias", "Sector proportionality",
  "GHG alignment", "Outlet accountability", "74 outlets monitored",
  "Narrative tracking", "Climate journalism",
];
const TICKER_TEXT = TICKER_ITEMS.join("  ·  ") + "  ·  ";

export default function HomePage() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");

  return (
    <div>
      <div className="max-w-[1440px] mx-auto px-11">

        {/* Sub-strip */}
        <div className="flex justify-between items-center py-[7px]">
          <span style={{ fontFamily: F.quantico, fontSize: 14, color: "#616161", textTransform: "uppercase", lineHeight: "25px" }}>
            Limited Edition &middot; The reading room
          </span>
          <span style={{ fontFamily: F.quantico, fontSize: 14, color: "#616161", textTransform: "uppercase", lineHeight: "25px" }}>
            Updated {h}:{m} CET
          </span>
        </div>

        {/* Hero */}
        <div className="relative flex gap-12 pt-8 pb-16" style={{ minHeight: 470 }}>
          <div className="flex-1 self-end">
            <TypingGreeting style={{ fontFamily: F.playfair, fontWeight: 400, fontSize: 140, lineHeight: "130px", color: "#000" }} />
          </div>
          <div className="shrink-0 self-start" style={{ width: 491 }}>
            <p style={{ fontFamily: F.serif, fontWeight: 400, fontSize: 24, lineHeight: "33px", color: "#000", marginBottom: 28 }}>
              Climate journalism shapes how the public understands the crisis. But who shapes climate journalism?
            </p>
            <p style={{ fontFamily: F.serif, fontWeight: 300, fontSize: 17, lineHeight: "23px", color: "#000" }}>
              The Climate Narrative Lab tracks how 74 French and Belgian outlets frame the crisis &mdash; which sectors they cover, which they overlook, and whether reporting reflects actual emissions.
            </p>
          </div>
          <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)" }}>
            <a href="#editions" className="scroll-hint" aria-label="Scroll to editions">
              <div style={{ width: 15, height: 15, borderRight: "1px solid currentColor", borderBottom: "1px solid currentColor", transform: "rotate(45deg)" }} />
            </a>
          </div>
        </div>

        <Rule />

        {/* Ticker */}
        <div className="py-[8px] overflow-hidden">
          <div style={{ display: "flex", width: "max-content", whiteSpace: "nowrap", animation: "ticker 40s linear infinite", fontFamily: F.podkova, fontSize: 16, color: "#616161" }}>
            <span>{TICKER_TEXT}</span>
            <span aria-hidden="true">{TICKER_TEXT}</span>
          </div>
        </div>

        <Rule />

        {/* Section heading */}
        <div id="editions" style={{ paddingTop: 44, paddingBottom: 66 }}>
          <div style={{ fontFamily: F.playfair, fontWeight: 400, fontSize: 43, lineHeight: "45px", color: "#000" }}>
            The index &mdash; four editions of<br />the Climate Narrative Lab
          </div>
        </div>

        <Rule />

        {/* Edition cards — intentionally asymmetric two-column layout.
            Left border between cards sits at 310px; right border at 240px.
            The 70px offset is the visible asymmetry. */}
        <div style={{ display: "flex" }}>

          {/* Left column — 60% */}
          <div style={{ flex: "3 3 0%", minWidth: 0 }}>
            {LEFT.map((slot, j) => (
              <div key={slot.ed.href}>
                {j > 0 && <div style={{ borderTop: "1px solid #000" }} />}
                <EditionCard ed={slot.ed} height={slot.height} padLeft={0} padRight={24} />
              </div>
            ))}
          </div>

          {/* Right column — 40% */}
          <div style={{ flex: "2 2 0%", minWidth: 0, borderLeft: "1px solid #000" }}>
            {RIGHT.map((slot, j) => (
              <div key={slot.ed.href}>
                {j > 0 && <div style={{ borderTop: "1px solid #000" }} />}
                <EditionCard ed={slot.ed} height={slot.height} padLeft={24} padRight={0} />
              </div>
            ))}
          </div>

        </div>

        <div className="mt-[45px]"><Rule /></div>

        <Rule />

        {/* Footer breadcrumb */}
        <div className="flex justify-between items-center py-4">
          <span style={{ fontFamily: F.podkova, fontSize: 16, color: "#616161" }}>
            The Climate Narrative Lab &middot; Home
          </span>
          <span style={{ fontFamily: F.podkova, fontSize: 16, color: "#616161" }}>
            Limited Edition
          </span>
        </div>

      </div>
    </div>
  );
}
