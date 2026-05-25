import Link from "next/link";
import TypingGreeting from "@/components/TypingGreeting";
import ScrollReveal from "@/components/ScrollReveal";

const F = {
  plex:     "var(--font-plex-sans)",
  playfair: "var(--font-playfair)",
  serif:    "var(--font-source-serif)",
};

// ─── Edition data ─────────────────────────────────────────────────────────────

type Edition = {
  label: string;
  number: string;
  title: string;
  italic: boolean;
  desc: string;
  cta: string;
  href: string;
  accent: string;
  Teaser: React.FC;
};

// ─── Teaser content ───────────────────────────────────────────────────────────

function TeaserDashboard() {
  const sectors = [
    { label: "Energy",       media: 48, ghg: 24 },
    { label: "Transport",    media: 32, ghg: 28 },
    { label: "Industry",     media: 22, ghg: 30 },
    { label: "Buildings",    media: 14, ghg: 31 },
    { label: "Agriculture",  media: 8,  ghg: 11 },
  ];
  return (
    <div className="flex flex-col" style={{ gap: 0 }}>
      <div className="flex gap-4" style={{ marginBottom: 14 }}>
        {[["Media coverage", "var(--red)"], ["GHG share", "var(--green)"]].map(([l, c]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: F.plex, fontSize: 10, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <span style={{ width: 8, height: 8, background: c, display: "inline-block", flexShrink: 0 }} />{l}
          </span>
        ))}
      </div>
      {sectors.map(r => (
        <div key={r.label} style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{r.label}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ height: 7, width: `${r.media * 1.8}%`, background: "var(--red)", flexShrink: 0 }} />
              <span style={{ fontFamily: F.plex, fontSize: 10, color: "var(--red)" }}>{r.media}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ height: 7, width: `${r.ghg * 1.8}%`, background: "var(--green)", flexShrink: 0 }} />
              <span style={{ fontFamily: F.plex, fontSize: 10, color: "var(--green)" }}>{r.ghg}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeaserReader() {
  const articles = [
    { outlet: "Le Monde", date: "12 Mai", title: "Les émissions du transport aérien dépassent les objectifs climatiques 2030", sector: "Transport", frame: "Conséquences" },
    { outlet: "Libération", date: "9 Mai", title: "Chaleurs extrêmes : l'agriculture française face à une crise silencieuse", sector: "Agriculture", frame: "Solutions" },
    { outlet: "Les Échos", date: "6 Mai", title: "Nucléaire et renouvelables : le débat énergétique s'intensifie", sector: "Énergie", frame: "Politique" },
  ];
  return (
    <div className="flex flex-col" style={{ gap: 0 }}>
      {articles.map((a, i) => (
        <div key={i} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)", paddingTop: i === 0 ? 0 : 12, paddingBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t1)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>{a.outlet}</span>
            <span style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)" }}>{a.date}</span>
          </div>
          <div style={{ fontFamily: F.playfair, fontStyle: "italic", fontSize: 13, lineHeight: "18px", color: "var(--t1)", marginBottom: 7 }}>{a.title}</div>
          <div style={{ display: "flex", gap: 5 }}>
            <span style={{ fontFamily: F.plex, fontSize: 9, color: "var(--green)", border: "1px solid var(--green)", padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{a.sector}</span>
            <span style={{ fontFamily: F.plex, fontSize: 9, color: "var(--t2)", border: "1px solid var(--border)", padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{a.frame}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeaserDiscrepancy() {
  const outlets = [
    { name: "Le Monde",   gap: +24 },
    { name: "Le Figaro",  gap: -18 },
    { name: "Libération", gap: +12 },
    { name: "Les Échos",  gap: -31 },
    { name: "20 Minutes", gap: +7  },
  ];
  const max = 35;
  return (
    <div className="flex flex-col" style={{ gap: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontFamily: F.plex, fontSize: 9, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.06em" }}>← sous-couvert</span>
        <span style={{ fontFamily: F.plex, fontSize: 9, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.06em" }}>sur-couvert →</span>
      </div>
      {outlets.map(o => (
        <div key={o.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
          <span style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t1)", width: 76, flexShrink: 0 }}>{o.name}</span>
          <div style={{ flex: 1, position: "relative", height: 8 }}>
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--border)" }} />
            {o.gap > 0
              ? <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: `${(o.gap / max) * 50}%`, background: "var(--red)" }} />
              : <div style={{ position: "absolute", right: "50%", top: 0, bottom: 0, width: `${(Math.abs(o.gap) / max) * 50}%`, background: "var(--green)" }} />
            }
          </div>
          <span style={{ fontFamily: F.plex, fontSize: 10, color: o.gap > 0 ? "var(--red)" : "var(--green)", width: 36, textAlign: "right", flexShrink: 0 }}>
            {o.gap > 0 ? "+" : ""}{o.gap}pp
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Edition list ─────────────────────────────────────────────────────────────

const EDITIONS: Edition[] = [
  {
    label: "Edition I",
    number: "01",
    title: "Dashboard",
    italic: true,
    desc: "Sector coverage vs. GHG proportionality across 74 outlets.",
    cta: "Open dashboard",
    href: "/overview",
    accent: "var(--red)",
    Teaser: TeaserDashboard,
  },
  {
    label: "Edition II",
    number: "02",
    title: "The Reader",
    italic: true,
    desc: "Browse and filter 20 000+ classified articles by outlet, sector, and frame.",
    cta: "Browse articles",
    href: "/search",
    accent: "var(--green)",
    Teaser: TeaserReader,
  },
  {
    label: "Edition III",
    number: "03",
    title: "Discrepancy desk",
    italic: false,
    desc: "Per-outlet framing patterns and publication statistics.",
    cta: "Open desk",
    href: "/newspapers",
    accent: "var(--t1)",
    Teaser: TeaserDiscrepancy,
  },
];

// ─── EditionTeaser column ─────────────────────────────────────────────────────

function EditionTeaser({ ed }: { ed: Edition }) {
  return (
    <Link href={ed.href} className="group block h-full">
      <div className="flex flex-col h-full" style={{ padding: "28px 24px 24px" }}>

        {/* Accent top rule */}
        <div style={{ height: 2, background: ed.accent, marginBottom: 24 }} />

        {/* Edition label */}
        <div style={{
          fontFamily: F.plex, fontSize: 10, color: "var(--t2)",
          textTransform: "uppercase", letterSpacing: "0.08em",
          marginBottom: 12,
        }}>
          {ed.label}
        </div>

        {/* Number */}
        <div style={{
          fontFamily: F.playfair, fontWeight: 400,
          fontSize: 80, lineHeight: 1, color: ed.accent,
          marginBottom: 16,
        }}>
          {ed.number}
        </div>

        {/* Title */}
        <div style={{
          fontFamily: F.playfair, fontWeight: 400,
          fontSize: 28, lineHeight: "32px",
          fontStyle: ed.italic ? "italic" : "normal",
          color: "var(--t1)",
          marginBottom: 10,
        }}>
          {ed.title}
        </div>

        {/* Description */}
        <div style={{
          fontFamily: F.serif, fontWeight: 300,
          fontSize: 13, lineHeight: "19px",
          color: "var(--t2)",
          marginBottom: 24,
        }}>
          {ed.desc}
        </div>

        {/* Teaser — always visible, fills remaining space */}
        <div style={{ flex: 1, minHeight: 0, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <ed.Teaser />
        </div>

        {/* CTA */}
        <div className="flex items-center gap-1" style={{ marginTop: 20 }}>
          <span style={{
            fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
            textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            {ed.cta}
          </span>
          <span className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"
            style={{ fontFamily: F.plex, fontSize: 11, color: ed.accent }}>
            &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="max-w-[1440px] mx-auto px-11">

      {/* Hero — sticky background layer, sits behind the sliding content */}
      <div className="flex flex-col" style={{
        height: "calc(97vh - var(--header-h))",
        position: "sticky",
        top: "var(--header-h)",
        zIndex: 0,
      }}>
        {/* Main content row */}
        <div className="relative flex gap-12 pt-8 pb-8 flex-1">
          <div className="flex-1 self-end">
            <TypingGreeting style={{
              fontFamily: F.playfair, fontWeight: 400,
              fontSize: 140, lineHeight: "130px",
              color: "var(--t1)",
            }} />
          </div>
          <div className="shrink-0 self-start" style={{ width: 491 }}>
            <p style={{
              fontFamily: F.serif, fontWeight: 400,
              fontSize: 24, lineHeight: "33px",
              color: "var(--t1)",
              marginBottom: 28,
            }}>
              Climate journalism shapes how the public understands the crisis. But who shapes climate journalism?
            </p>
            <p style={{
              fontFamily: F.serif, fontWeight: 300,
              fontSize: 17, lineHeight: "23px",
              color: "var(--t1)",
            }}>
              The Climate Narrative Review tracks how 74 French and Belgian outlets frame the crisis &mdash; which sectors they cover, which they overlook, and whether reporting reflects actual emissions.
            </p>
          </div>
          <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)" }}>
            <a href="#editions" aria-label="Scroll to editions">
              <div style={{ width: 15, height: 15, borderRight: "1px solid currentColor", borderBottom: "1px solid currentColor", transform: "rotate(45deg)" }} />
            </a>
          </div>
        </div>

      </div>

      {/* Sliding layer — solid background covers the hero as you scroll */}
      <div style={{ position: "relative", zIndex: 1, backgroundColor: "var(--bg)", marginTop: "60px" }}>

        <div id="editions" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {EDITIONS.map((ed, i) => (
              <ScrollReveal key={ed.href} delay={i * 120} style={{
                borderRight: i < EDITIONS.length - 1 ? "1px solid var(--t1)" : "none",
              }}>
                <EditionTeaser ed={ed} />
              </ScrollReveal>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
