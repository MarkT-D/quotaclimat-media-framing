import Link from "next/link";
import TypingGreeting from "@/components/TypingGreeting";
import ScrollReveal from "@/components/ScrollReveal";
import sql from "@/lib/db";

const F = {
  plex:     "var(--font-plex-sans)",
  playfair: "var(--font-playfair)",
  serif:    "var(--font-source-serif)",
};

// ─── Angle config ─────────────────────────────────────────────────────────────

const ANGLE_CFG = [
  { key: "health",           label: "Health",        color: "var(--red)" },
  { key: "economics",        label: "Economics",     color: "#EF9F27" },
  { key: "jobs",             label: "Jobs",          color: "var(--green)" },
  { key: "politics",         label: "Politics",      color: "var(--red-m)" },
  { key: "geopolitics",      label: "Geopolitics",   color: "#7C3AED" },
  { key: "purchasing_power", label: "Purch. Power",  color: "var(--green-m)" },
] as const;

// ─── DB row types ─────────────────────────────────────────────────────────────

type ArticleRow = {
  title: string; outlet: string; published_at: Date | string;
  sector_energy: boolean | null; sector_transport: boolean | null;
  sector_agriculture: boolean | null; sector_industry: boolean | null;
  sector_buildings: boolean | null; sector_water: boolean | null;
  sector_ecosystem: boolean | null; sector_resource_economy: boolean | null;
  frame_attribution: number | null; frame_human_interest: number | null;
  frame_conflict: number | null; frame_morality: number | null;
  frame_economic: number | null;
};

type OutletRow = {
  outlet: string;
  health: number; economics: number; jobs: number;
  politics: number; geopolitics: number; purchasing_power: number;
};

type SectorRow = {
  energy: number; transport: number; agriculture: number; industry: number;
  buildings: number; water: number; ecosystem: number; resource_economy: number;
  total: number;
};

const GHG: Record<string, number> = {
  Energy: 34, Transport: 16, Agriculture: 11, Industry: 13,
  Buildings: 6, Water: 4, Ecosystem: 6, "Resource Economy": 10,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSector(row: ArticleRow): string {
  if (row.sector_energy)           return "Energy";
  if (row.sector_transport)        return "Transport";
  if (row.sector_agriculture)      return "Agriculture";
  if (row.sector_industry)         return "Industry";
  if (row.sector_buildings)        return "Buildings";
  if (row.sector_water)            return "Water";
  if (row.sector_ecosystem)        return "Ecosystem";
  if (row.sector_resource_economy) return "Resource Economy";
  return "";
}

function getPrimaryFrame(row: ArticleRow): string {
  const candidates: [number | null, string][] = [
    [row.frame_attribution,    "Responsib."],
    [row.frame_human_interest, "Human Int."],
    [row.frame_conflict,       "Conflict"],
    [row.frame_morality,       "Morality"],
    [row.frame_economic,       "Economic"],
  ];
  const valid = candidates.filter((c): c is [number, string] => c[0] != null);
  if (!valid.length) return "";
  return [...valid].sort((a, b) => b[0] - a[0])[0][1];
}

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en", { day: "numeric", month: "short" });
}

// ─── Teasers ──────────────────────────────────────────────────────────────────

function TeaserDashboard({ sectors }: { sectors: { label: string; media: number; ghg: number }[] }) {
  const scale = 1.8;
  return (
    <div className="flex flex-col" style={{ gap: 0 }}>
      <div className="flex gap-4" style={{ marginBottom: 14 }}>
        {[["Media", "var(--red)"], ["GHG", "var(--green)"]].map(([l, c]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: F.plex, fontSize: 10, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <span style={{ width: 8, height: 8, background: c as string, display: "inline-block", flexShrink: 0 }} />{l}
          </span>
        ))}
      </div>
      {sectors.map(r => (
        <div key={r.label} style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{r.label}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ height: 7, width: `${Math.min(r.media * scale, 100)}%`, background: "var(--red)", flexShrink: 0 }} />
              <span style={{ fontFamily: F.plex, fontSize: 10, color: "var(--red)" }}>{r.media}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ height: 7, width: `${Math.min(r.ghg * scale, 100)}%`, background: "var(--green)", flexShrink: 0 }} />
              <span style={{ fontFamily: F.plex, fontSize: 10, color: "var(--green)" }}>{r.ghg}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeaserReader({ articles }: { articles: ArticleRow[] }) {
  return (
    <div className="flex flex-col" style={{ gap: 0 }}>
      {articles.map((a, i) => {
        const sector = getSector(a);
        const frame  = getPrimaryFrame(a);
        return (
          <div key={i} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)", paddingTop: i === 0 ? 0 : 12, paddingBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t1)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>{a.outlet}</span>
              <span style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)" }}>{fmtDate(a.published_at)}</span>
            </div>
            <div style={{ fontFamily: F.playfair, fontStyle: "italic", fontSize: 13, lineHeight: "18px", color: "var(--t1)", marginBottom: 7 }}>
              {a.title.length > 90 ? a.title.slice(0, 90) + "…" : a.title}
            </div>
            {(sector || frame) && (
              <div style={{ display: "flex", gap: 5 }}>
                {sector && <span style={{ fontFamily: F.plex, fontSize: 9, color: "var(--green)", border: "1px solid var(--green)", padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{sector}</span>}
                {frame  && <span style={{ fontFamily: F.plex, fontSize: 9, color: "var(--t2)",   border: "1px solid var(--border)", padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{frame}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TeaserDiscrepancy({ outlets }: { outlets: OutletRow[] }) {
  return (
    <div className="flex flex-col" style={{ gap: 0 }}>
      {outlets.map((o, i) => {
        const scores = ANGLE_CFG.map(a => ({ ...a, val: (o as unknown as Record<string, number>)[a.key] ?? 0 }));
        const total  = scores.reduce((s, a) => s + a.val, 0) || 1;
        const pcts   = scores.map(a => ({ ...a, pct: (a.val / total) * 100 }));
        const dominant = [...pcts].sort((a, b) => b.pct - a.pct)[0];

        return (
          <div key={o.outlet} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)", paddingTop: i === 0 ? 0 : 10, paddingBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t1)", fontWeight: 500 }}>{o.outlet}</span>
              <span style={{ fontFamily: F.plex, fontSize: 9, color: dominant.color, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {dominant.label}
              </span>
            </div>
            <div style={{ display: "flex", height: 7, width: "100%", overflow: "hidden" }}>
              {pcts.map(a => (
                <div key={a.key} style={{ width: `${a.pct}%`, background: a.color, flexShrink: 0 }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Edition list ─────────────────────────────────────────────────────────────

type Edition = {
  label: string; number: string; title: string; italic: boolean;
  desc: string; cta: string; href: string; accent: string;
  Teaser: React.FC;
};

function EditionTeaser({ ed }: { ed: Edition }) {
  return (
    <Link href={ed.href} className="group block h-full">
      <div className="flex flex-col h-full" style={{ padding: "28px 24px 24px" }}>
        <div style={{ height: 2, background: ed.accent, marginBottom: 24 }} />
        <div style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          {ed.label}
        </div>
        <div style={{ fontFamily: F.playfair, fontWeight: 400, fontSize: 80, lineHeight: 1, color: ed.accent, marginBottom: 16 }}>
          {ed.number}
        </div>
        <div style={{ fontFamily: F.playfair, fontWeight: 400, fontSize: 28, lineHeight: "32px", fontStyle: ed.italic ? "italic" : "normal", color: "var(--t1)", marginBottom: 10 }}>
          {ed.title}
        </div>
        <div style={{ fontFamily: F.serif, fontWeight: 300, fontSize: 13, lineHeight: "19px", color: "var(--t2)", marginBottom: 24 }}>
          {ed.desc}
        </div>
        <div style={{ flex: 1, minHeight: 0, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <ed.Teaser />
        </div>
        <div className="flex items-center gap-1" style={{ marginTop: 20 }}>
          <span style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
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

export default async function HomePage() {
  const [recentArticles, topOutlets, sectorRow] = await Promise.all([
    sql<ArticleRow[]>`
      SELECT title, outlet, published_at,
        sector_energy, sector_transport, sector_agriculture, sector_industry,
        sector_buildings, sector_water, sector_ecosystem, sector_resource_economy,
        frame_attribution, frame_human_interest, frame_conflict, frame_morality, frame_economic
      FROM articles
      ORDER BY published_at DESC
      LIMIT 3
    `.catch(() => [] as ArticleRow[]),

    sql<OutletRow[]>`
      SELECT outlet,
        AVG(COALESCE(angle_health,           0))::float AS health,
        AVG(COALESCE(angle_economics,        0))::float AS economics,
        AVG(COALESCE(angle_jobs,             0))::float AS jobs,
        AVG(COALESCE(angle_politics,         0))::float AS politics,
        AVG(COALESCE(angle_geopolitics,      0))::float AS geopolitics,
        AVG(COALESCE(angle_purchasing_power, 0))::float AS purchasing_power
      FROM articles
      WHERE outlet IS NOT NULL AND outlet != ''
      GROUP BY outlet
      ORDER BY COUNT(*) DESC
      LIMIT 5
    `.catch(() => [] as OutletRow[]),

    sql<SectorRow[]>`
      SELECT
        COUNT(*) FILTER (WHERE sector_energy)           AS energy,
        COUNT(*) FILTER (WHERE sector_transport)        AS transport,
        COUNT(*) FILTER (WHERE sector_agriculture)      AS agriculture,
        COUNT(*) FILTER (WHERE sector_industry)         AS industry,
        COUNT(*) FILTER (WHERE sector_buildings)        AS buildings,
        COUNT(*) FILTER (WHERE sector_water)            AS water,
        COUNT(*) FILTER (WHERE sector_ecosystem)        AS ecosystem,
        COUNT(*) FILTER (WHERE sector_resource_economy) AS resource_economy,
        COUNT(*)                                         AS total
      FROM articles
    `.then(r => r[0]).catch(() => null),
  ]);

  // Sector dashboard data
  const sectorMap: Record<string, string> = {
    energy: "Energy", transport: "Transport", agriculture: "Agriculture",
    industry: "Industry", buildings: "Buildings", water: "Water",
    ecosystem: "Ecosystem", resource_economy: "Resource Economy",
  };
  const total = Number(sectorRow?.total ?? 0);
  const sectorData = total > 0
    ? Object.entries(sectorMap)
        .map(([key, label]) => ({
          label,
          media: Math.round((Number((sectorRow as unknown as Record<string, number>)[key] ?? 0) / total) * 100),
          ghg: GHG[label] ?? 0,
        }))
        .filter(s => s.media > 0 || s.ghg > 0)
        .sort((a, b) => b.media - a.media)
        .slice(0, 5)
    : [
        { label: "Energy",      media: 48, ghg: 34 },
        { label: "Transport",   media: 32, ghg: 16 },
        { label: "Industry",    media: 22, ghg: 13 },
        { label: "Buildings",   media: 14, ghg: 6  },
        { label: "Agriculture", media: 8,  ghg: 11 },
      ];

  // Fallback teasers if DB is empty
  const fallbackArticles: ArticleRow[] = recentArticles.length ? recentArticles : [
    { title: "Les émissions du transport aérien dépassent les objectifs climatiques 2030", outlet: "Le Monde",   published_at: "2024-05-12", sector_energy: null, sector_transport: true,  sector_agriculture: null, sector_industry: null, sector_buildings: null, sector_water: null, sector_ecosystem: null, sector_resource_economy: null, frame_attribution: 0.6, frame_human_interest: null, frame_conflict: null, frame_morality: null, frame_economic: null },
    { title: "Chaleurs extrêmes : l'agriculture française face à une crise silencieuse",  outlet: "Libération",  published_at: "2024-05-09", sector_energy: null, sector_transport: null,  sector_agriculture: true, sector_industry: null, sector_buildings: null, sector_water: null, sector_ecosystem: null, sector_resource_economy: null, frame_attribution: null, frame_human_interest: 0.7, frame_conflict: null, frame_morality: null, frame_economic: null },
    { title: "Nucléaire et renouvelables : le débat énergétique s'intensifie",             outlet: "Les Échos",   published_at: "2024-05-06", sector_energy: true, sector_transport: null,  sector_agriculture: null, sector_industry: null, sector_buildings: null, sector_water: null, sector_ecosystem: null, sector_resource_economy: null, frame_attribution: null, frame_human_interest: null, frame_conflict: 0.5, frame_morality: null, frame_economic: null },
  ];

  const fallbackOutlets: OutletRow[] = topOutlets.length ? topOutlets : [
    { outlet: "Le Monde",   health: 0.2, economics: 0.3, jobs: 0.1, politics: 0.2, geopolitics: 0.1, purchasing_power: 0.1 },
    { outlet: "Le Figaro",  health: 0.1, economics: 0.4, jobs: 0.2, politics: 0.2, geopolitics: 0.05, purchasing_power: 0.05 },
    { outlet: "Libération", health: 0.3, economics: 0.2, jobs: 0.15, politics: 0.15, geopolitics: 0.1, purchasing_power: 0.1 },
    { outlet: "Les Échos",  health: 0.05, economics: 0.5, jobs: 0.2, politics: 0.1, geopolitics: 0.1, purchasing_power: 0.05 },
    { outlet: "20 Minutes", health: 0.25, economics: 0.2, jobs: 0.15, politics: 0.2, geopolitics: 0.1, purchasing_power: 0.1 },
  ];

  const EDITIONS: Edition[] = [
    {
      label: "Edition I", number: "01", title: "Dashboard", italic: true,
      desc: "Sector coverage vs. greenhouse gas (GHG) proportionality across 74 outlets.",
      cta: "Open dashboard", href: "/overview", accent: "var(--red)",
      Teaser: () => <TeaserDashboard sectors={sectorData} />,
    },
    {
      label: "Edition II", number: "02", title: "The Reader", italic: true,
      desc: "Browse and filter 20 000+ classified articles by outlet, sector, and frame.",
      cta: "Browse articles", href: "/search", accent: "var(--green)",
      Teaser: () => <TeaserReader articles={fallbackArticles} />,
    },
    {
      label: "Edition III", number: "03", title: "Discrepancy desk", italic: false,
      desc: "Per-outlet framing patterns and publication statistics.",
      cta: "Open desk", href: "/newspapers", accent: "var(--t1)",
      Teaser: () => <TeaserDiscrepancy outlets={fallbackOutlets} />,
    },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-11">
      <div className="flex flex-col" style={{ height: "calc(97vh - var(--header-h))", position: "sticky", top: "var(--header-h)", zIndex: 0 }}>
        <div className="relative flex gap-12 pt-8 pb-8 flex-1">
          <div className="flex-1 self-end">
            <TypingGreeting style={{ fontFamily: F.playfair, fontWeight: 400, fontSize: 140, lineHeight: "130px", color: "var(--t1)" }} />
          </div>
          <div className="shrink-0 self-start" style={{ width: 491 }}>
            <p style={{ fontFamily: F.serif, fontWeight: 400, fontSize: 24, lineHeight: "33px", color: "var(--t1)", marginBottom: 28 }}>
              Climate journalism shapes how the public understands the crisis. But who shapes climate journalism?
            </p>
            <p style={{ fontFamily: F.serif, fontWeight: 300, fontSize: 17, lineHeight: "23px", color: "var(--t1)" }}>
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

      <div style={{ position: "relative", zIndex: 1, backgroundColor: "var(--bg)", marginTop: "60px" }}>
        <div id="editions" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {EDITIONS.map((ed, i) => (
              <ScrollReveal key={ed.href} delay={i * 120} style={{ borderRight: i < EDITIONS.length - 1 ? "1px solid var(--t1)" : "none" }}>
                <EditionTeaser ed={ed} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
