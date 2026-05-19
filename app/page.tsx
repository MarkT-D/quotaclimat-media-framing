import Link from "next/link";
import TypingGreeting from "@/components/TypingGreeting";

const F = {
  plex:     "var(--font-plex-sans)",
  playfair: "var(--font-playfair)",
  serif:    "var(--font-source-serif)",
};

// ─── Edition data ─────────────────────────────────────────────────────────────

type Edition = {
  label: string;
  number: string;
  bordered: boolean; // Special edition only — boxed number treatment
  title: string;
  italic: boolean;
  desc: string;
  cta: string;
  href: string;
  Teaser: React.FC;
};

// ─── Placeholder teaser content ───────────────────────────────────────────────
// Real teaser content fills in via a follow-up PR. These are explicit
// placeholders — the structure is real, the text is obviously fake — so any
// pre-launch screenshots aren't mistaken for production copy.

function TeaserDashboard() {
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <div className="flex items-baseline justify-between">
        <span style={{
          fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
          textTransform: "uppercase", letterSpacing: "0.04em",
        }}>
          Sector coverage placeholder
        </span>
        <span style={{ fontFamily: F.playfair, fontSize: 22, lineHeight: 1, color: "var(--red)" }}>
          +12pp
        </span>
      </div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none"
        style={{ width: "100%", height: 60, display: "block" }}>
        <rect x="2"  y="22" width="20" height="18" fill="var(--red)" />
        <rect x="26" y="10" width="20" height="30" fill="var(--green)" />
        <rect x="50" y="28" width="20" height="12" fill="var(--red-m)" />
        <rect x="74" y="16" width="20" height="24" fill="var(--green-m)" />
      </svg>
    </div>
  );
}

function TeaserReader() {
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <div style={{
        fontFamily: F.playfair, fontSize: 16, lineHeight: "20px", color: "var(--t1)",
      }}>
        Headline placeholder lorem ipsum dolor.
      </div>
      <div style={{
        fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
        textTransform: "uppercase", letterSpacing: "0.04em",
      }}>
        Byline placeholder &middot; 2026
      </div>
      <div style={{
        fontFamily: F.serif, fontStyle: "italic",
        fontSize: 13, lineHeight: "18px", color: "var(--t2)",
      }}>
        Excerpt placeholder consectetur adipiscing elit, sed do eiusmod tempor incididunt.
      </div>
    </div>
  );
}

function TeaserDiscrepancy() {
  const outlets = [
    { name: "Outlet A", color: "var(--red)" },
    { name: "Outlet B", color: "var(--green)" },
    { name: "Outlet C", color: "var(--red-m)" },
  ];
  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      {outlets.map(o => (
        <div key={o.name} className="flex items-center" style={{ gap: 10 }}>
          <span style={{
            width: 8, height: 8, background: o.color,
            display: "inline-block", flexShrink: 0,
          }} />
          <span style={{ fontFamily: F.plex, fontSize: 13, color: "var(--t1)" }}>
            {o.name}
          </span>
        </div>
      ))}
    </div>
  );
}

function TeaserAbout() {
  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <div style={{
        fontFamily: F.serif, fontStyle: "italic",
        fontSize: 16, lineHeight: "24px", color: "var(--t1)",
        borderLeft: "2px solid var(--t1)", paddingLeft: 12,
      }}>
        &ldquo;Quote placeholder lorem ipsum dolor sit amet consectetur.&rdquo;
      </div>
      <div style={{
        fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
        textTransform: "uppercase", letterSpacing: "0.04em",
      }}>
        &mdash; Attribution placeholder
      </div>
    </div>
  );
}

// ─── Edition list ─────────────────────────────────────────────────────────────

const EDITIONS: Edition[] = [
  {
    label: "Edition I",
    number: "01",
    bordered: false,
    title: "Dashboard",
    italic: true,
    desc: "Sector coverage vs. GHG proportionality across 74 outlets.",
    cta: "Open dashboard",
    href: "/overview",
    Teaser: TeaserDashboard,
  },
  {
    label: "Edition II",
    number: "02",
    bordered: false,
    title: "The Reader",
    italic: true,
    desc: "Where reported emissions diverge from measurable impact.",
    cta: "Pick & compare",
    href: "/search",
    Teaser: TeaserReader,
  },
  {
    label: "Edition III",
    number: "03",
    bordered: false,
    title: "Discrepancy desk",
    italic: false,
    desc: "Per-outlet framing patterns and publication statistics.",
    cta: "Open desk",
    href: "/newspapers",
    Teaser: TeaserDiscrepancy,
  },
  {
    label: "Special Edition",
    number: "Special",
    bordered: true,
    title: "About us",
    italic: false,
    desc: "Mission, methodology, and the research team behind the Lab.",
    cta: "Read",
    href: "/about",
    Teaser: TeaserAbout,
  },
];

// ─── EditionTeaser column ─────────────────────────────────────────────────────

function EditionTeaser({ ed }: { ed: Edition }) {
  return (
    <Link href={ed.href} className="group block h-full">
      <div className="flex flex-col h-full" style={{ padding: 16 }}>

        {/* Edition label */}
        <div style={{
          fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
          textTransform: "uppercase", letterSpacing: "0.04em",
          marginBottom: 8,
        }}>
          {ed.label}
        </div>

        {/* Edition number — all three numbered editions render identically;
            Special gets a boxed treatment because the label is a word, not a
            numeral, and the box keeps its visual weight comparable. */}
        <div>
          {ed.bordered ? (
            <span style={{
              fontFamily: F.playfair, fontWeight: 400,
              fontSize: 28, lineHeight: 1, color: "var(--t1)",
              border: "1px solid var(--t1)",
              display: "inline-block", padding: "2px 10px",
            }}>
              {ed.number}
            </span>
          ) : (
            <span style={{
              fontFamily: F.playfair, fontWeight: 400,
              fontSize: 44, lineHeight: 1, color: "var(--t1)",
            }}>
              {ed.number}
            </span>
          )}
        </div>

        {/* Title */}
        <div style={{
          fontFamily: F.playfair, fontWeight: 400,
          fontSize: 24, lineHeight: "28px",
          fontStyle: ed.italic ? "italic" : "normal",
          color: "var(--t1)",
          marginTop: 12,
        }}>
          {ed.title}
        </div>

        {/* Description */}
        <div style={{
          fontFamily: F.serif, fontWeight: 300,
          fontSize: 13, lineHeight: "18px",
          color: "var(--t2)",
          marginTop: 8,
        }}>
          {ed.desc}
        </div>

        {/* Hairline divider */}
        <div style={{
          borderTop: "1px solid var(--border)",
          marginTop: 16, marginBottom: 16,
        }} />

        {/* Placeholder teaser content — flex-1 fills remaining vertical space */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <ed.Teaser />
        </div>

        {/* CTA — arrow appearance on hover is the functional clickability cue;
            no other hover effects on the column. */}
        <div className="flex items-center gap-1" style={{ marginTop: 16 }}>
          <span style={{
            fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            {ed.cta}
          </span>
          <span className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
            style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t1)" }}>
            &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Stats ticker ─────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  "Coverage gaps", "Framing bias", "Sector proportionality",
  "GHG alignment", "Outlet accountability", "74 outlets monitored",
  "Narrative tracking", "Climate journalism",
];
const TICKER_TEXT = TICKER_ITEMS.join("  ·  ") + "  ·  ";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="max-w-[1440px] mx-auto px-11">

      {/* Hero pair — Welcome on left, intro on right.
          Mobile (<lg): stacks single-column. Desktop: two columns top-aligned. */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12"
        style={{ paddingTop: 24, paddingBottom: 32 }}>
        <div className="flex-1">
          <TypingGreeting style={{
            fontFamily: F.playfair, fontWeight: 400,
            fontSize: 44, lineHeight: "48px",
            color: "var(--t1)",
          }} />
        </div>
        <div className="flex-1">
          <p style={{
            fontFamily: F.serif, fontWeight: 400,
            fontSize: 20, lineHeight: "30px",
            color: "var(--t1)",
            marginBottom: 24,
          }}>
            Climate journalism shapes how the public understands the crisis. But who shapes climate journalism?
          </p>
          <p style={{
            fontFamily: F.serif, fontWeight: 300,
            fontSize: 16, lineHeight: "24px",
            color: "var(--t1)",
          }}>
            The Climate Narrative Review tracks how 74 French and Belgian outlets frame the crisis &mdash; which sectors they cover, which they overlook, and whether reporting reflects actual emissions.
          </p>
        </div>
      </div>

      {/* Stats ticker — visual section break between the hero pair and the
          teaser grid. Has a top rule (separating it from the hero pair) but
          no bottom rule — the teaser grid sits as a free-standing block
          beneath, separated only by 24px of paper. */}
      <div style={{ borderTop: "1px solid var(--t1)" }} />
      <div className="py-2 overflow-hidden">
        <div style={{
          display: "flex", width: "max-content", whiteSpace: "nowrap",
          animation: "ticker 40s linear infinite",
          fontFamily: F.plex, fontSize: 14, color: "var(--t2)",
        }}>
          <span>{TICKER_TEXT}</span>
          <span aria-hidden="true">{TICKER_TEXT}</span>
        </div>
      </div>

      {/* Four-up teaser grid — free-standing.
          24px paddingTop separates it from the ticker (padding, not margin,
          to keep the margin-collapse class of issue we already fixed for the
          sticky header off the table). No rule above or below the grid; the
          three vertical hairlines between columns stand alone, and bare paper
          texture extends below the grid to the viewport bottom.
          Tablet (md): 2-col. Mobile (<md): 1-col stacked. */}
      <div style={{ paddingTop: 24 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 xl:h-[320px]">
          {EDITIONS.map((ed, i) => (
            <div key={ed.href} style={{
              borderRight: i < EDITIONS.length - 1 ? "1px solid var(--t1)" : "none",
            }}>
              <EditionTeaser ed={ed} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
