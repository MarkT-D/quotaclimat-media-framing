"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell,
} from "recharts";
import {
  FRAMES, STAGES, SECTORS, CRISIS_DOMAINS, ANGLES,
  type Sector, type Frame, type Stage, type CrisisDomain, type Article, type Angle,
} from "@/lib/articleTypes";
import { useArticles } from "@/lib/useArticles";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_COUNTRIES = ["GB", "FR", "NL"];

const F = {
  playfair: "var(--font-playfair)",
  serif:    "var(--font-source-serif)",
  plex:     "var(--font-plex-sans)",
};

const GHG_SHARES: Record<Sector, number> = {
  Energy: 34, Transport: 16, Agriculture: 11, Industry: 13,
  Buildings: 6, Water: 4, Ecosystem: 6, "Resource Economy": 10,
};

const FRAME_DEFS: { key: Frame; short: string; color: string }[] = [
  { key: "Attribution of Responsibility", short: "Responsibility", color: "var(--red)" },
  { key: "Human Interest",                short: "Human Interest", color: "var(--green)" },
  { key: "Conflict",                      short: "Conflict",       color: "var(--red-m)" },
  { key: "Morality",                      short: "Morality",       color: "#7C3AED" },
  { key: "Economic Consequences",         short: "Economic",       color: "#EF9F27" },
];

const DOMAIN_COLORS = ["var(--red)", "var(--green)", "var(--green-m)"];
const ANGLE_COLORS  = ["var(--red)", "#EF9F27", "var(--green)", "var(--red-m)", "#7C3AED", "var(--green-m)"];
const SECTOR_COLORS = [
  "var(--red)",    "var(--green)",   "var(--red-m)",
  "var(--green-d)","#C4943A",       "var(--green-m)",
  "var(--t2)",     "var(--red-d)",  "#8A9A50",
];

// ─── Aggregation helpers ──────────────────────────────────────────────────────

function sectorCountsFrom(arts: Article[]) {
  const counts: Record<Sector, number> = {
    Energy: 0, Transport: 0, Agriculture: 0, Industry: 0,
    Buildings: 0, Water: 0, Ecosystem: 0, "Resource Economy": 0,
  };
  arts.forEach((a) => { if (a.sector != null) counts[a.sector]++; });
  return Object.entries(counts).map(([sector, count]) => ({
    sector: sector as Sector, count, ghgShare: GHG_SHARES[sector as Sector],
  }));
}

function frameCountsFrom(arts: Article[]) {
  const counts = Object.fromEntries(FRAMES.map((f) => [f, 0])) as Record<Frame, number>;
  arts.forEach((a) => { FRAMES.forEach((f) => { if (a.frameScores[f] != null) counts[f]++; }); });
  return FRAMES.map((f) => ({ frame: f, count: counts[f] }));
}

function frameStatsFrom(arts: Article[]) {
  return FRAMES.map((frame) => {
    const matching = arts.filter((a) => a.frameScores[frame] != null);
    const count = matching.length;
    const outletMap = new Map<string, number>();
    matching.forEach((a) => outletMap.set(a.outlet, (outletMap.get(a.outlet) ?? 0) + 1));
    const topOutlet = [...outletMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const sectorMap = new Map<string, number>();
    matching.forEach((a) => { if (a.sector) sectorMap.set(a.sector, (sectorMap.get(a.sector) ?? 0) + 1); });
    const topSector = [...sectorMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { frame, count, outletCount: outletMap.size, topOutlet, topSector };
  });
}

function stageCountsFrom(arts: Article[]) {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  arts.forEach((a) => { a.stages.forEach((s) => counts[s]++); });
  return STAGES.map((s) => ({ stage: s, count: counts[s] }));
}

function domainCountsFrom(arts: Article[]) {
  const counts = Object.fromEntries(CRISIS_DOMAINS.map((d) => [d, 0])) as Record<CrisisDomain, number>;
  arts.forEach((a) => { a.crisisDomains.forEach((d) => counts[d]++); });
  return CRISIS_DOMAINS.map((d) => ({ domain: d, count: counts[d] }));
}

function sectorStatsFrom(arts: Article[]) {
  return SECTORS.map((sector) => {
    const matching = arts.filter((a) => a.sector === sector);
    const count = matching.length;
    const outletMap = new Map<string, number>();
    matching.forEach((a) => outletMap.set(a.outlet, (outletMap.get(a.outlet) ?? 0) + 1));
    const topOutlet = [...outletMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const frameCounts = new Map<string, number>();
    matching.forEach((a) => { if (a.primaryFrame) frameCounts.set(a.primaryFrame, (frameCounts.get(a.primaryFrame) ?? 0) + 1); });
    const topFrame = [...frameCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { sector, count, outletCount: outletMap.size, topOutlet, topFrame };
  });
}

function outletStatsFrom(arts: Article[]) {
  const outletNames = Array.from(new Set(arts.map((a) => a.outlet))).sort();
  return outletNames.map((name) => {
    const oa = arts.filter((a) => a.outlet === name);
    const total = oa.length || 1;
    const fc = Object.fromEntries(FRAMES.map((f) => [f, 0])) as Record<Frame, number>;
    oa.forEach((a) => { FRAMES.forEach((f) => { if (a.frameScores[f] != null) fc[f]++; }); });
    const ac = Object.fromEntries(ANGLES.map((a) => [a, 0])) as Record<Angle, number>;
    oa.forEach((a) => { if (a.primaryAngle != null) ac[a.primaryAngle]++; });
    const topFrame = FRAMES.reduce((a, b) => fc[a] >= fc[b] ? a : b);
    const topAngle = ANGLES.reduce((a, b) => ac[a] >= ac[b] ? a : b);
    const framePcts = FRAME_DEFS.map((fd) => ({
      frame: fd.key, pct: Math.round((fc[fd.key] / total) * 100), color: fd.color,
    }));
    const anglePcts = [...ANGLES]
      .map((a) => ({ angle: a, pct: Math.round((ac[a] / total) * 100) }))
      .sort((a, b) => b.pct - a.pct);
    return { id: name, name, count: oa.length, topFrame, topAngle, framePcts, anglePcts };
  });
}

function countryLabel(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function detectCountry(locale: string, options: string[]): string | null {
  for (const part of locale.split("-").slice(1)) {
    const code = part.toUpperCase();
    if (options.includes(code)) return code;
  }
  return null;
}

function filterByCountry(arts: Article[], country: string | null): Article[] {
  if (!country) return arts;
  return arts.filter((a) => a.country === country);
}

function angleCountsFrom(arts: Article[]) {
  const counts = Object.fromEntries(ANGLES.map((a) => [a, 0])) as Record<Angle, number>;
  arts.forEach((a) => { if (a.primaryAngle != null) counts[a.primaryAngle]++; });
  return ANGLES.map((a) => ({ angle: a, count: counts[a] }));
}

function timeSeriesFrom(arts: Article[]) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months.map((month, i) => ({
    month,
    articles: arts.filter((a) => new Date(a.publishedAt).getMonth() === i).length,
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Rule({ color = "var(--border)", thick = false }: { color?: string; thick?: boolean }) {
  return <div style={{ borderTop: `${thick ? "2px" : "1px"} solid ${color}` }} />;
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: F.playfair, fontWeight: 400, fontSize: 24, lineHeight: "1.15", color: "var(--t1)", marginBottom: 4 }}>
      {children}
    </div>
  );
}

function SectionMeta({ children, bg }: { children: React.ReactNode; bg?: string }) {
  if (bg) {
    return (
      <div style={{ marginBottom: 18 }}>
        <span style={{
          display: "inline-block", background: bg,
          padding: "3px 10px", lineHeight: "19px",
          fontFamily: F.plex, fontSize: 13, color: "var(--t2)",
          textTransform: "uppercase", letterSpacing: "0.01em",
        }}>
          {children}
        </span>
      </div>
    );
  }
  return (
    <div style={{ fontFamily: F.plex, fontSize: 13, color: "var(--t2)", marginBottom: 18 }}>
      {children}
    </div>
  );
}

function EditorialNote({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderTop: "1px solid var(--border)", marginTop: 16, paddingTop: 12 }}>
      <p style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 13, color: "var(--t2)", lineHeight: "19px" }}>
        {children}
      </p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { stroke?: string; fill?: string; name?: string; value?: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--t1)", padding: "8px 12px", fontFamily: F.plex, fontSize: 12 }}>
      <p style={{ color: "var(--t1)", marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.stroke ?? p.fill }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

const RadarTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: { payload?: {
    fullFrame: string; value: number; count: number;
    outletCount: number; topOutlet: string; topSector: string;
  } }[];
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d) return null;
  const rows: [string, string, string?][] = [
    ["Articles",   `${d.count.toLocaleString()} (${d.value}%)`, "var(--t1)"],
    ["Outlets",    String(d.outletCount)],
    ["Top outlet", d.topOutlet],
    ["Top sector", d.topSector],
  ];
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--t1)", padding: "12px 16px", fontFamily: F.plex, fontSize: 12, minWidth: 210 }}>
      <p style={{ color: "var(--t1)", fontWeight: 700, marginBottom: 10, fontSize: 13 }}>{d.fullFrame}</p>
      {rows.map(([label, val, color]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 4 }}>
          <span style={{ color: "var(--t2)" }}>{label}</span>
          <span style={{ color: color ?? "var(--t1)", fontWeight: 600 }}>{val}</span>
        </div>
      ))}
    </div>
  );
};

const SectorTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: { payload?: {
    name: string; value: number; pct: number;
    ghgShare: number; gap: number; outletCount: number; topOutlet: string; topFrame: string;
  } }[];
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (!d) return null;
  const gapColor = d.gap > 0 ? "var(--red)" : "var(--green)";
  const rows: [string, string, string?][] = [
    ["Articles",   `${d.value.toLocaleString()} (${d.pct}%)`, "var(--t1)"],
    ["GHG share",  `${d.ghgShare}%`],
    ["Coverage gap", `${d.gap > 0 ? "+" : ""}${d.gap}pp`, gapColor],
    ["Outlets",    String(d.outletCount)],
    ["Top outlet", d.topOutlet],
    ["Top frame",  d.topFrame],
  ];
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--t1)", padding: "12px 16px", fontFamily: F.plex, fontSize: 12, minWidth: 210 }}>
      <p style={{ color: "var(--t1)", fontWeight: 700, marginBottom: 10, fontSize: 13 }}>{d.name}</p>
      {rows.map(([label, val, color]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 20, marginBottom: 4 }}>
          <span style={{ color: "var(--t2)" }}>{label}</span>
          <span style={{ color: color ?? "var(--t1)", fontWeight: 600 }}>{val}</span>
        </div>
      ))}
    </div>
  );
};

function DotPlotRow({ sector, mediaPct, ghgShare, gap, y, plotLeft, plotWidth }: {
  sector: string; mediaPct: number; ghgShare: number; gap: number;
  y: number; plotLeft: number; plotWidth: number;
}) {
  const xMedia = plotLeft + (mediaPct / 100) * plotWidth;
  const xGhg   = plotLeft + (ghgShare  / 100) * plotWidth;
  const over   = gap > 0;
  // Gap label always sits 8px right of the rightmost dot, anchored start.
  // Previously it floated next to the media (red) dot on the inside of the
  // pair; when media was small AND gap was negative, the leftward-anchored
  // label collided with the sector label at the plot's left edge. Pinning it
  // to the right of max(xGhg, xMedia) guarantees zero collision regardless
  // of value, and the labels form a tidy right-aligned column.
  const xLabel = Math.max(xMedia, xGhg) + 8;
  return (
    <g>
      <text x={plotLeft - 8} y={y + 5} textAnchor="end" fontFamily={F.plex} fontSize={11} fill="var(--t2)">{sector}</text>
      <line x1={plotLeft} x2={plotLeft + plotWidth} y1={y} y2={y} stroke="var(--bg2)" strokeWidth={1} />
      <line
        x1={Math.min(xGhg, xMedia)} x2={Math.max(xGhg, xMedia)} y1={y} y2={y}
        stroke={over ? "var(--red-m)" : "var(--green-m)"} strokeWidth={1.5}
      />
      <circle cx={xGhg}   cy={y} r={5} fill="var(--green)" />
      <circle cx={xMedia} cy={y} r={5} fill="var(--red)" />
      <text
        x={xLabel} y={y + 4}
        textAnchor="start"
        fontFamily={F.plex} fontSize={10}
        fill={over ? "var(--red)" : "var(--green)"}
      >
        {over ? "+" : ""}{gap}pp
      </text>
    </g>
  );
}

type OutletStat = ReturnType<typeof outletStatsFrom>[number];
function OutletCard({ outlet, onNavigate }: {
  outlet: OutletStat;
  onNavigate: (params: Record<string, string>) => void;
}) {
  const [hovFrame, setHovFrame] = useState<string | null>(null);
  const [hovAngle, setHovAngle] = useState<string | null>(null);
  return (
    <div style={{ padding: "16px 18px 18px", opacity: outlet.count === 0 ? 0.4 : 1 }}>
      <div
        onClick={() => onNavigate({ outlet: outlet.name })}
        title={`Show all ${outlet.name} articles`}
        style={{ fontFamily: F.plex, fontSize: 12, color: "var(--t1)", marginBottom: 10, cursor: "pointer" }}
      >
        {outlet.name}
      </div>
      <Rule color="var(--border)" />
      <div
        onClick={() => onNavigate({ outlet: outlet.name })}
        title={`Show all ${outlet.name} articles`}
        style={{ margin: "10px 0", cursor: "pointer" }}
      >
        <span style={{ fontFamily: F.playfair, fontSize: 32, lineHeight: 1, color: "var(--t1)" }}>{outlet.count}</span>
        <span style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.05em", marginLeft: 6 }}>articles</span>
      </div>
      <Rule color="var(--border)" />
      {outlet.count > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Frames</div>
          <div style={{ display: "flex", height: 8, overflow: "hidden" }}>
            {outlet.framePcts.map((fp) => (
              <div key={fp.frame}
                style={{
                  flexGrow: fp.pct, flexShrink: fp.pct, flexBasis: 0,
                  minWidth: hovFrame === fp.frame ? 25 : 0,
                  height: "100%", background: fp.color, cursor: "pointer",
                  opacity: hovFrame && hovFrame !== fp.frame ? 0.3 : 1,
                  transition: "min-width 0.15s ease, opacity 0.1s",
                }}
                onMouseEnter={() => setHovFrame(fp.frame)}
                onMouseLeave={() => setHovFrame(null)}
                onClick={() => onNavigate({ outlet: outlet.name, frame: fp.frame })}
                title={`${outlet.name} · ${FRAME_DEFS.find(d => d.key === fp.frame)?.short ?? fp.frame}`}
              />
            ))}
          </div>
          <div style={{ height: 14, marginBottom: 6 }}>
            {hovFrame && (() => { const f = FRAME_DEFS.find(d => d.key === hovFrame); const fp = outlet.framePcts.find(d => d.frame === hovFrame); return f && fp ? <span style={{ fontFamily: F.plex, fontSize: 10, color: f.color, fontWeight: 600 }}>{f.short} · {fp.pct}%</span> : null; })()}
          </div>
          <div style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Angles</div>
          <div style={{ display: "flex", height: 8, overflow: "hidden" }}>
            {outlet.anglePcts.map((ap, i) => (
              <div key={ap.angle}
                style={{
                  flexGrow: ap.pct, flexShrink: ap.pct, flexBasis: 0,
                  minWidth: hovAngle === ap.angle ? 25 : 0,
                  height: "100%", background: ANGLE_COLORS[i % ANGLE_COLORS.length], cursor: "pointer",
                  opacity: hovAngle && hovAngle !== ap.angle ? 0.3 : 1,
                  transition: "min-width 0.15s ease, opacity 0.1s",
                }}
                onMouseEnter={() => setHovAngle(ap.angle)}
                onMouseLeave={() => setHovAngle(null)}
                onClick={() => onNavigate({ outlet: outlet.name, angle: ap.angle })}
                title={`${outlet.name} · ${ap.angle}`}
              />
            ))}
          </div>
          <div style={{ height: 14, marginBottom: 6 }}>
            {hovAngle && (() => { const i = outlet.anglePcts.findIndex(a => a.angle === hovAngle); const ap = outlet.anglePcts[i]; return ap ? <span style={{ fontFamily: F.plex, fontSize: 10, color: ANGLE_COLORS[i % ANGLE_COLORS.length], fontWeight: 600 }}>{ap.angle} · {ap.pct}%</span> : null; })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function toSearch(params: Record<string, string>, currentCountry: string | null): string {
  const p = new URLSearchParams(params);
  if (currentCountry) p.set("country", currentCountry);
  return `/search?${p.toString()}`;
}

export default function OverviewPage() {
  const router = useRouter();
  const { articles: allArticles } = useArticles();
  const [hoveredAngleBar, setHoveredAngleBar] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [countrySearchOpen, setCountrySearchOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [hoveredDropdownItem, setHoveredDropdownItem] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Countries with >= 100 articles, derived from data
  const countryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    allArticles.forEach((a) => { if (a.country) counts.set(a.country, (counts.get(a.country) ?? 0) + 1); });
    return [...counts.entries()]
      .filter(([, n]) => n >= 100)
      .sort(([ac, an], [bc, bn]) => {
        const pa = PRIORITY_COUNTRIES.indexOf(ac);
        const pb = PRIORITY_COUNTRIES.indexOf(bc);
        if (pa !== -1 && pb !== -1) return pa - pb;
        if (pa !== -1) return -1;
        if (pb !== -1) return 1;
        return bn - an;
      })
      .map(([code]) => code);
  }, [allArticles]);

  const topCountries  = useMemo(() => countryOptions.slice(0, 3), [countryOptions]);
  const moreCountries = useMemo(() => countryOptions.slice(3),    [countryOptions]);

  // Default to browser locale on first load
  useEffect(() => {
    const locale = navigator.language || (navigator.languages?.[0] ?? "");
    const detected = detectCountry(locale, countryOptions);
    if (detected) setCountry(detected);
  }, [countryOptions]);

  useEffect(() => {
    if (!countrySearchOpen) return;
    function handleDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCountrySearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [countrySearchOpen]);

  const arts = useMemo(() => filterByCountry(allArticles, country), [allArticles, country]);

  const sectorData = useMemo(() => sectorCountsFrom(arts), [arts]);
  const frameData  = useMemo(() => frameCountsFrom(arts), [arts]);
  const stageData  = useMemo(() => stageCountsFrom(arts), [arts]);
  const domainData = useMemo(() => domainCountsFrom(arts), [arts]);
  const outletData = useMemo(() => outletStatsFrom(arts).sort((a, b) => b.count - a.count).slice(0, 10), [arts]);
  const angleData  = useMemo(() => angleCountsFrom(arts), [arts]);
  const timeData   = useMemo(() => timeSeriesFrom(arts), [arts]);
  const dataYear   = useMemo(() => {
    const years = arts.map(a => new Date(a.publishedAt).getFullYear()).filter(y => y > 2000);
    if (!years.length) return new Date().getFullYear();
    const freq = new Map<number, number>();
    years.forEach(y => freq.set(y, (freq.get(y) ?? 0) + 1));
    return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }, [arts]);
  const angleBars  = useMemo(() => {
    const total = angleData.reduce((s, d) => s + d.count, 0) || 1;
    return [...angleData]
      .sort((a, b) => b.count - a.count)
      .map((a) => ({ angle: a.angle, pct: Math.round((a.count / total) * 100) }));
  }, [angleData]);

  const gapData = useMemo(() => {
    const total = arts.length || 1;
    return sectorData
      .map((s) => ({
        sector:   s.sector,
        mediaPct: Math.round((s.count / total) * 100),
        ghgShare: s.ghgShare,
        gap:      Math.round((s.count / total) * 100) - s.ghgShare,
      }))
      .sort((a, b) => b.gap - a.gap);
  }, [sectorData, arts.length]);

  const frameStats  = useMemo(() => frameStatsFrom(arts), [arts]);
  const sectorStats = useMemo(() => sectorStatsFrom(arts), [arts]);

  const radarData = useMemo(() => FRAME_DEFS.map((fd) => {
    const stats = frameStats.find((s) => s.frame === fd.key);
    return {
      frame:       fd.short,
      fullFrame:   fd.key,
      value:       Math.round(((frameData.find((f) => f.frame === fd.key)?.count ?? 0) / (arts.length || 1)) * 100),
      count:       stats?.count ?? 0,
      outletCount: stats?.outletCount ?? 0,
      topOutlet:   stats?.topOutlet ?? "—",
      topSector:   stats?.topSector ?? "—",
    };
  }), [frameData, arts.length, frameStats]);

  const totalArts   = arts.length;
  const outletCount = new Set(arts.map((a) => a.outlet)).size;
  const topSector   = [...sectorData].sort((a, b) => b.count - a.count)[0];
  const solutionPct = totalArts
    ? Math.round(arts.filter((a) => a.stages.includes("Solutions")).length / totalArts * 100) : 0;

  const totalDomain = domainData.reduce((s, d) => s + d.count, 0);
  const totalStage  = stageData.reduce((s, d) => s + d.count, 0);
  const topAngle    = [...angleData].sort((a, b) => b.count - a.count)[0];

  const stageTicks = STAGES.map((s) => ({
    stage: s,
    pct: Math.round(((stageData.find((d) => d.stage === s)?.count ?? 0) / (totalStage || 1)) * 100),
  }));

  const filteredMore    = moreCountries.filter(c =>
    countryLabel(c).toLowerCase().includes(countryQuery.toLowerCase()) ||
    c.toLowerCase().includes(countryQuery.toLowerCase())
  );
  const activeIsInMore  = country !== null && !topCountries.includes(country);
  const countryDisplayLabel = country ? countryLabel(country) : "All";

  const STATS = [
    { label: "Articles analysed",  value: totalArts.toLocaleString(), sub: `2024 · ${countryDisplayLabel}` },
    { label: "Outlets in scope",   value: String(outletCount), sub: countryDisplayLabel },
    { label: "Top covered sector", value: topSector?.sector.split(" ")[0] ?? "—", sub: `${Math.round((topSector?.count ?? 0) / (totalArts || 1) * 100)}% of coverage` },
    { label: "Top angle",          value: topAngle?.angle.split(" ")[0] ?? "—", sub: `${Math.round((topAngle?.count ?? 0) / (totalArts || 1) * 100)}% of coverage` },
  ];

  const ROW_H  = 38;
  const LABEL  = 130;
  const RPAD   = 56;
  const SVG_W  = 600;
  const PLOT_W = SVG_W - LABEL - RPAD;
  const svgH   = gapData.length * ROW_H + 24;
  const cols   = Math.min(outletData.length, 5);

  return (
    <div>
      <div className="max-w-[1440px] mx-auto px-11">

        {/* Lede + 2×2 KPI quadrant — page-anchor block.
            55/45 split: H1 + subhead carry editorial weight on the left; the
            KPI quadrant pairs the data summary with the headline on the right.
            Country filter sits at the top of the KPI column (right-aligned) so
            it co-locates with the data it affects, retiring the standalone
            filter strip that previously lived between the heavy rule and the
            stat row. Cells in the 2×2 use soft-rule dividers (vertical between
            the two columns, horizontal between the two rows) — same pattern as
            the prior four-up strip, extended into a grid. */}
        <div className="flex flex-col lg:flex-row" style={{ paddingTop: 40, paddingBottom: 28 }}>
          <div className="w-full lg:w-[55%] lg:pr-8">
            <div style={{ fontFamily: F.playfair, fontWeight: 400, fontSize: 36, lineHeight: "40px", color: "var(--t1)", maxWidth: 780 }}>
              The Gap Between<br />Ink and Environment
            </div>
            <p style={{ fontFamily: F.serif, fontWeight: 300, fontSize: 18, lineHeight: "26px", color: "var(--t2)", marginTop: 16, maxWidth: 560 }}>
              Tracking how news coverage reflects environmental crises — across climate, biodiversity, and natural resources — and how that attention aligns with scientific urgency.
            </p>
          </div>

          <div className="w-full lg:w-[45%] mt-6 lg:mt-0">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {STATS.map((stat, i) => (
                <div key={stat.label} style={{
                  borderRight: i % 2 === 0 ? "1px solid var(--border)" : "none",
                  borderBottom: i < 2 ? "1px solid var(--border)" : "none",
                  padding: "16px 18px",
                }}>
                  <div style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontFamily: F.playfair, fontWeight: 400, fontSize: 44, lineHeight: 1, color: "var(--t1)", marginBottom: 18 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontFamily: F.plex, fontSize: 12, color: "var(--t2)" }}>{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {countryOptions.length > 0 && (
          <div className="flex items-center justify-center gap-2" style={{ paddingBottom: 32 }}>
            {([null, ...topCountries] as (string | null)[]).map((c) => {
              const active = country === c;
              const label  = c ? countryLabel(c) : "All";
              return (
                <button key={c ?? "all"} onClick={() => { setCountry(c); setCountrySearchOpen(false); }} style={{
                  fontFamily: F.plex, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em",
                  background: active ? "var(--t1)" : "transparent",
                  color: active ? "var(--bg)" : "var(--t2)",
                  border: `1px solid ${active ? "var(--t1)" : "var(--border)"}`,
                  padding: "3px 14px", cursor: "pointer", transition: "all 0.12s",
                }}>
                  {label}
                </button>
              );
            })}
            {moreCountries.length > 0 && (
              <div style={{ position: "relative" }} ref={dropdownRef}>
                <button
                  onClick={() => { setCountrySearchOpen(o => !o); setCountryQuery(""); }}
                  style={{
                    fontFamily: F.plex, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em",
                    background: activeIsInMore ? "var(--t1)" : "transparent",
                    color: activeIsInMore ? "var(--bg)" : "var(--t2)",
                    border: `1px solid ${activeIsInMore ? "var(--t1)" : "var(--border)"}`,
                    padding: "3px 14px", cursor: "pointer", transition: "all 0.12s",
                  }}
                >
                  {activeIsInMore ? countryLabel(country!) : `▾ ${moreCountries.length} more`}
                </button>
                {countrySearchOpen && (
                  <div style={{
                    position: "absolute", left: "50%", transform: "translateX(-50%)", top: "calc(100% + 4px)",
                    background: "var(--bg)", border: "1px solid var(--border)",
                    width: 220, zIndex: 50,
                  }}>
                    <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)" }}>
                      <input
                        autoFocus
                        value={countryQuery}
                        onChange={e => setCountryQuery(e.target.value)}
                        placeholder="Search…"
                        style={{
                          width: "100%", background: "transparent", border: "none", outline: "none",
                          fontFamily: F.plex, fontSize: 12, color: "var(--t1)",
                        }}
                      />
                    </div>
                    <div style={{ maxHeight: 200, overflowY: "auto" }}>
                      {filteredMore.map(c => (
                        <div key={c}
                          onClick={() => { setCountry(c); setCountrySearchOpen(false); setCountryQuery(""); }}
                          onMouseEnter={() => setHoveredDropdownItem(c)}
                          onMouseLeave={() => setHoveredDropdownItem(null)}
                          style={{
                            padding: "7px 12px", fontFamily: F.plex, fontSize: 12, cursor: "pointer",
                            color: "var(--t1)",
                            background: c === country || c === hoveredDropdownItem ? "var(--bg2)" : "transparent",
                          }}
                        >
                          {countryLabel(c)}
                          <span style={{ color: "var(--t2)", fontSize: 10, marginLeft: 6 }}>{c}</span>
                        </div>
                      ))}
                      {filteredMore.length === 0 && (
                        <div style={{ padding: "10px 12px", fontFamily: F.plex, fontSize: 12, color: "var(--t2)" }}>
                          No matches
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Coverage over time + Frame distribution — no enclosing border; soft-rule column divider between cells. */}
        <div className="grid grid-cols-2 mt-6">

          <div style={{ padding: "22px 26px 24px", borderRight: "1px solid var(--border)" }}>
            {/* Deliberate breathing room between section head and chart — matches
                the optical density of cells that carry a SectionMeta chip below
                the head (Frame Distribution, Coverage vs. Emissions, etc.). */}
            <div style={{ marginBottom: 20 }}>
              <SectionHead>Coverage over time</SectionHead>
            </div>
            <div style={{ cursor: "pointer" }} title="Click a month to browse its articles">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={timeData}
                  margin={{ left: -10, right: 10 }}
                  onClick={(data) => {
                    if (data?.activeLabel) {
                      const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                      const mi = MONTHS.indexOf(String(data.activeLabel));
                      if (mi >= 0) {
                        const mm = String(mi + 1).padStart(2, "0");
                        const lastDay = new Date(dataYear, mi + 1, 0).getDate();
                        router.push(toSearch({
                          dateFrom: `${dataYear}-${mm}-01`,
                          dateTo:   `${dataYear}-${mm}-${String(lastDay).padStart(2, "0")}`,
                        }, country));
                      }
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="articlesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="10%" stopColor="var(--red)" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="var(--red)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 5" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontFamily: F.plex, fontSize: 11, fill: "var(--t2)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis tick={{ fontFamily: F.plex, fontSize: 11, fill: "var(--t2)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--t1)", strokeWidth: 1, strokeDasharray: "3 3" }} />
                  <Area type="stepAfter" dataKey="articles" name="Articles"
                    stroke="var(--red)" strokeWidth={2}
                    fill="url(#articlesFill)" dot={false} activeDot={{ r: 4, fill: "var(--red)", stroke: "var(--bg)", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <EditorialNote>
              Click any month to browse its articles.
            </EditorialNote>
          </div>

          <div style={{ padding: "22px 26px 24px" }}>
            <SectionHead>Frame Distribution</SectionHead>
            <SectionMeta bg="var(--red-l)">Semetko &amp; Valkenburg 2000</SectionMeta>
            {/* Radar + vertical legend, 60/40 split. Radar needs near-square
                space for polar axis labels; vertical legend column gives each
                frame its own line for label + value pairing. */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: "0 0 60%" }}>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="frame" tick={{ fontFamily: F.plex, fontSize: 10, fill: "var(--t2)" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="All outlets" dataKey="value"
                      stroke="var(--red)" fill="var(--red)" fillOpacity={0.18} strokeWidth={1.5}
                    />
                    <Tooltip content={<RadarTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: "1 1 40%", display: "flex", flexDirection: "column", gap: 8 }}>
                {FRAME_DEFS.map((fd) => {
                  const count = frameData.find((f) => f.frame === fd.key)?.count ?? 0;
                  const pct   = Math.round((count / (totalArts || 1)) * 100);
                  return (
                    <div key={fd.key} className="flex items-center gap-2"
                      onClick={() => router.push(toSearch({ frame: fd.key }, country))}
                      title={`Show ${fd.short} articles`}
                      style={{ cursor: "pointer" }}
                    >
                      <span style={{ width: 9, height: 9, display: "inline-block", background: fd.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t2)" }}>{fd.short}</span>
                      <span style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t1)", marginLeft: "auto" }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Editorial angles + Sectors — no enclosing border; soft-rule column divider between cells. */}
        <div className="grid grid-cols-2 mt-6">

          <div style={{ padding: "22px 26px 24px", borderRight: "1px solid var(--border)" }}>
            <SectionHead>Editorial angles</SectionHead>
            <div style={{ display: "flex", height: 32, marginBottom: 6 }}>
              {angleBars.map((b, i) => (
                <div key={b.angle}
                  style={{
                    flexGrow: b.pct, flexShrink: b.pct, flexBasis: 0,
                    minWidth: hoveredAngleBar === b.angle ? 28 : 0,
                    height: "100%", background: ANGLE_COLORS[i % ANGLE_COLORS.length],
                    cursor: "pointer",
                    opacity: hoveredAngleBar && hoveredAngleBar !== b.angle ? 0.35 : 1,
                    transition: "min-width 0.15s ease, opacity 0.12s",
                  }}
                  onMouseEnter={() => setHoveredAngleBar(b.angle)}
                  onMouseLeave={() => setHoveredAngleBar(null)}
                  onClick={() => router.push(toSearch({ angle: b.angle }, country))}
                  title={`Show ${b.angle} articles`}
                />
              ))}
            </div>
            <div style={{ height: 22, marginBottom: 12 }}>
              {hoveredAngleBar ? (() => {
                const i = angleBars.findIndex(x => x.angle === hoveredAngleBar);
                const b = angleBars[i];
                return b ? <span style={{ fontFamily: F.plex, fontSize: 13, color: ANGLE_COLORS[i % ANGLE_COLORS.length], fontWeight: 600 }}>{b.angle} — {b.pct}%</span> : null;
              })() : (
                <div style={{ display: "flex" }}>
                  {angleBars.map((b, i) => (
                    <div key={b.angle} style={{ flexGrow: b.pct, flexShrink: b.pct, flexBasis: 0, overflow: "hidden", paddingRight: 2 }}>
                      {b.pct >= 8 && <span style={{ fontFamily: F.playfair, fontSize: 14, lineHeight: 1, color: ANGLE_COLORS[i % ANGLE_COLORS.length] }}>{b.pct}%</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
              {angleBars.map((b, i) => (
                <div key={b.angle}
                  onClick={() => router.push(toSearch({ angle: b.angle }, country))}
                  title={`Show ${b.angle} articles`}
                  style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                >
                  <span style={{ width: 8, height: 8, display: "inline-block", background: ANGLE_COLORS[i % ANGLE_COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t2)" }}>{b.angle}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: "22px 26px 24px" }}>
            <SectionHead>Sectors</SectionHead>
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={sectorData.map((s) => {
                    const stats = sectorStats.find((x) => x.sector === s.sector);
                    const pct   = Math.round((s.count / (totalArts || 1)) * 100);
                    const gap   = pct - s.ghgShare;
                    return {
                      name: s.sector, value: s.count, pct, ghgShare: s.ghgShare, gap,
                      outletCount: stats?.outletCount ?? 0,
                      topOutlet:   stats?.topOutlet ?? "—",
                      topFrame:    stats?.topFrame ?? "—",
                    };
                  })}
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={88}
                  paddingAngle={1} dataKey="value"
                  onClick={(d) => { if (d.name) router.push(toSearch({ sector: String(d.name) }, country)); }}
                  style={{ cursor: "pointer" }}
                >
                  {sectorData.map((s, i) => (
                    <Cell key={s.sector} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} cursor="pointer" />
                  ))}
                </Pie>
                <Tooltip content={<SectorTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", marginTop: 8 }}>
              {sectorData.map((s, i) => {
                const pct = Math.round((s.count / (totalArts || 1)) * 100);
                return (
                  <div key={s.sector}
                    onClick={() => router.push(toSearch({ sector: s.sector }, country))}
                    title={`Show ${s.sector} articles`}
                    style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                  >
                    <span style={{ width: 8, height: 8, display: "inline-block", background: SECTOR_COLORS[i % SECTOR_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.sector}</span>
                    <span style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t1)", fontWeight: 600 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Outlet small multiples — no enclosing border, no header-band rule. */}
        <div className="mt-6">
          <div style={{ paddingBottom: 14 }}>
            <SectionHead>Outlet breakdown</SectionHead>
            <SectionMeta bg="var(--bg2)">
              {outletData.length} outlet{outletData.length !== 1 ? "s" : ""} in scope
            </SectionMeta>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {outletData.map((outlet, i) => (
              <div key={outlet.id} style={{
                borderRight: (i % cols < cols - 1) && i < outletData.length - 1 ? "1px solid var(--border)" : "none",
                borderBottom: i < outletData.length - cols ? "1px solid var(--border)" : "none",
              }}>
                <OutletCard
                  outlet={outlet}
                  onNavigate={(params) => router.push(toSearch(params, country))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Coverage vs. Emissions — no enclosing border, no column divider
            between meta and dot-plot. The chart's tonal weight (red/green dots,
            axis ticks, gap labels) provides enough visual separation from the
            meta column; an additional vertical rule was reading as chrome. */}
        <div className="mt-6" style={{ display: "flex" }}>
          <div style={{ width: "36%", padding: "22px 24px 24px 0", flexShrink: 0 }}>
            <SectionHead>Coverage vs. Emissions</SectionHead>
            <SectionMeta bg="var(--green-l)">Media share vs. sector greenhouse gas (GHG) share · 2024</SectionMeta>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              <div className="flex items-center gap-3">
                <svg width={14} height={14}><circle cx={7} cy={7} r={5} fill="var(--red)" /></svg>
                <span style={{ fontFamily: F.plex, fontSize: 12, color: "var(--t2)" }}>Media coverage (%)</span>
              </div>
              <div className="flex items-center gap-3">
                <svg width={14} height={14}><circle cx={7} cy={7} r={5} fill="var(--green)" /></svg>
                <span style={{ fontFamily: F.plex, fontSize: 12, color: "var(--t2)" }}>GHG emissions share (%)</span>
              </div>
            </div>
            <EditorialNote>
              Transport receives roughly double its emissions share in coverage. Energy — responsible for 34% of GHG — remains systematically under-reported across all monitored outlets.
            </EditorialNote>
          </div>
          <div style={{ flex: 1, padding: "22px 0 24px 0", overflowX: "auto" }}>
            <svg width="100%" viewBox={`0 0 ${SVG_W} ${svgH}`} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
              {[0, 25, 50, 75, 100].map((tick) => {
                const x = LABEL + (tick / 100) * PLOT_W;
                return (
                  <g key={tick}>
                    <line x1={x} x2={x} y1={0} y2={svgH - 20} stroke="var(--bg2)" strokeWidth={0.5} strokeDasharray="2 3" />
                    <text x={x} y={svgH - 4} textAnchor="middle" fontFamily={F.plex} fontSize={9} fill="var(--t2)">{tick}%</text>
                  </g>
                );
              })}
              {gapData.map((row, i) => (
                <DotPlotRow key={row.sector} {...row} y={i * ROW_H + ROW_H / 2} plotLeft={LABEL} plotWidth={PLOT_W} />
              ))}
            </svg>
          </div>
        </div>

        {/* Crisis domains + Causal stage — French data only (QuotaClimat taxonomy) */}
        {country === "FR" && (
          <>
            <div className="mt-6">
              <div style={{ paddingBottom: 14 }}>
                <SectionHead>Crisis domains</SectionHead>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
                {domainData.map((d, i) => {
                  const pct = Math.round((d.count / (totalDomain || 1)) * 100);
                  return (
                    <div key={d.domain}
                      onClick={() => router.push(toSearch({ domain: d.domain }, country))}
                      title={`Show ${d.domain} articles`}
                      style={{
                        borderRight: i < domainData.length - 1 ? "1px solid var(--border)" : "none",
                        padding: "16px 22px", cursor: "pointer",
                      }}
                    >
                      <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                        <span style={{ width: 9, height: 9, display: "inline-block", background: DOMAIN_COLORS[i], flexShrink: 0 }} />
                        <span style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          {d.domain}
                        </span>
                      </div>
                      <div style={{ fontFamily: F.playfair, fontWeight: 400, fontSize: 44, lineHeight: 1, color: "var(--t1)" }}>
                        {pct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <div style={{ paddingBottom: 14 }}>
                <SectionHead>Causal stage distribution</SectionHead>
                <SectionMeta bg="var(--bg2)">What aspects of the crisis do articles focus on?</SectionMeta>
              </div>
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
                  {stageTicks.map((s) => {
                    const color = s.stage === "Solutions" ? "var(--green)" : "var(--t2)";
                    return (
                      <div key={s.stage}
                        onClick={() => router.push(toSearch({ stage: s.stage }, country))}
                        title={`Show ${s.stage} articles`}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}
                      >
                        <div style={{ fontFamily: F.playfair, fontWeight: 400, fontSize: 44, lineHeight: 1, color }}>
                          {s.pct}%
                        </div>
                        <div style={{ width: 1.5, height: 22, background: color, marginTop: 10 }} />
                      </div>
                    );
                  })}
                </div>
                <div style={{ borderTop: "0.5px solid var(--border)" }} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", marginTop: 8 }}>
                  {stageTicks.map((s) => (
                    <div key={s.stage}
                      onClick={() => router.push(toSearch({ stage: s.stage }, country))}
                      title={`Show ${s.stage} articles`}
                      style={{ textAlign: "center", fontFamily: F.plex, fontSize: 10, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer" }}
                    >
                      {s.stage}
                    </div>
                  ))}
                </div>
                <EditorialNote>
                  Solutions-focused articles account for only {solutionPct}% of coverage. Research consistently shows solution framing increases reader action intent.
                </EditorialNote>
              </div>
            </div>
          </>
        )}

        {/* footer */}
        <div style={{ marginTop: 80 }}>
          <div style={{ borderTop: "1px solid var(--border)", marginBottom: 16 }} />
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontFamily: F.plex, fontSize: 15, lineHeight: "25px", color: "var(--t2)",
          }}>
            <span>The Climate Narrative Review · Dashboard</span>
            <span>Edition I</span>
          </div>
        </div>

        <div className="pb-12" />

      </div>
    </div>
  );
}
