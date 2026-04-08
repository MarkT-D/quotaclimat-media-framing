"use client";
import { useState, useMemo } from "react";
import {
  PieChart, Pie, Sector as PieSector, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import {
  SECTORS, ARTICLES, getSectorCounts, getDomainCounts,
  getStageCounts, getFrameCounts, getTimeSeriesData, getFrameBySector,
  type Sector,
} from "@/lib/mockData";
import StatCard from "@/components/StatCard";

// ── simple bar row ────────────────────────────────────────────────────────────
function BarRow({
  label, pct, color,
}: { label: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-2.5">
      <span className="text-xs text-right w-28 shrink-0" style={{ color: "var(--t2)" }}>{label}</span>
      <div className="flex-1 h-2 rounded-full" style={{ background: "var(--bg2)" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs w-8 text-right" style={{ color: "var(--t2)" }}>{pct}%</span>
    </div>
  );
}

// ── dual bar (media vs ghg) ───────────────────────────────────────────────────
function DualRow({ label, media, ghg }: { label: string; media: number; ghg: number }) {
  return (
    <div className="mb-3">
      <p className="text-xs mb-1" style={{ color: "var(--t2)" }}>{label}</p>
      <div className="h-2 rounded-full mb-1" style={{ background: "var(--bg2)" }}>
        <div className="h-full rounded-full" style={{ width: `${media}%`, background: "var(--red)" }} />
      </div>
      <div className="h-2 rounded-full" style={{ background: "var(--bg2)" }}>
        <div className="h-full rounded-full" style={{ width: `${ghg}%`, background: "var(--green)" }} />
      </div>
    </div>
  );
}

// ── frame card ────────────────────────────────────────────────────────────────
const FRAME_DEFS = [
  {
    key: "Attribution of Responsibility",
    short: "Responsibility",
    color: "var(--red)",
    bg: "var(--red-l)",
    iconFill: "var(--red)",
    desc: "Who is accountable? Articles assign blame to governments, industries, or systemic failures.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    key: "Human Interest",
    short: "Human Interest",
    color: "var(--green)",
    bg: "var(--green-l)",
    iconFill: "var(--green)",
    desc: "Personal stories connecting readers to the ecological crisis.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    key: "Conflict",
    short: "Conflict",
    color: "var(--red-m)",
    bg: "#FEF3F2",
    iconFill: "var(--red)",
    desc: "Opposing sides framed as dispute — farmers vs. NGOs, governments vs. industry.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "Economic Consequences",
    short: "Economic",
    color: "#EF9F27",
    bg: "#FAEEDA",
    iconFill: "#854F0B",
    desc: "Cost, investment, and financial impact — used to contest or justify climate policies.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    key: "Morality",
    short: "Morality",
    color: "#7C3AED",
    bg: "#EDE9FE",
    iconFill: "#7C3AED",
    desc: "Ethical and moral judgements — framing environmental issues as right vs. wrong.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
];

const DOMAIN_COLORS = ["var(--red)", "var(--green)", "var(--green-m)"];

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`rounded-xl p-4 ${className}`}
    style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}
  >
    {children}
  </div>
);

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm font-medium mb-1" style={{ color: "var(--t1)" }}>{children}</p>
);

const CardSub = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] mb-4" style={{ color: "var(--t2)" }}>{children}</p>
);

const Insight = ({ children, variant = "red" }: { children: React.ReactNode; variant?: "red" | "green" }) => (
  <div
    className="mt-3 p-3 rounded-lg text-xs leading-relaxed"
    style={
      variant === "red"
        ? { background: "var(--red-l)", color: "var(--red-d)" }
        : { background: "var(--green-l)", color: "var(--green-d)" }
    }
  >
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg p-3 shadow-md text-xs" style={{ border: "0.5px solid var(--border)" }}>
      <p className="font-medium mb-1" style={{ color: "var(--t1)" }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.stroke ?? p.fill }}>
          {p.name}: <span className="font-medium">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function OverviewPage() {
  const [selectedSector, setSelectedSector] = useState<Sector | "All">("All");
  const [hoveredSectorIdx, setHoveredSectorIdx] = useState<number | null>(null);
  const [hoveredDomainIdx, setHoveredDomainIdx] = useState<number | null>(null);

  const filtered =
    selectedSector === "All" ? ARTICLES : ARTICLES.filter((a) => a.sector === selectedSector);

  const sectorData = getSectorCounts();
  const domainData = getDomainCounts();
  const stageData = getStageCounts();
  const frameData = getFrameCounts();
  const timeData = useMemo(() => getTimeSeriesData(), []);

  const totalArticles = filtered.length;
  const avgMisinfo = filtered.reduce((s, a) => s + a.misinformationScore, 0) / (totalArticles || 1);
  const solutionPct = Math.round(
    (filtered.filter((a) => a.stage === "Solutions").length / (totalArticles || 1)) * 100
  );
  const dominantStage = stageData.sort((a, b) => b.count - a.count)[0]?.stage ?? "";

  // Total for pct
  const totalStage = stageData.reduce((s, d) => s + d.count, 0);
  const stageRows = [
    { label: "Consequences", pct: Math.round((stageData.find((s) => s.stage === "Consequences")?.count ?? 0) / totalStage * 100), color: "var(--red)" },
    { label: "General Concepts", pct: Math.round((stageData.find((s) => s.stage === "General Concepts")?.count ?? 0) / totalStage * 100), color: "var(--red-m)" },
    { label: "Causes", pct: Math.round((stageData.find((s) => s.stage === "Causes")?.count ?? 0) / totalStage * 100), color: "var(--red-m)" },
    { label: "Solutions", pct: Math.round((stageData.find((s) => s.stage === "Solutions")?.count ?? 0) / totalStage * 100), color: "var(--green-m)" },
  ];

  const totalFrames = frameData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-medium" style={{ color: "var(--t1)" }}>Overview</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--t2)" }}>
            Environmental media coverage · France &amp; Belgium · 2024
          </p>
        </div>

        {/* Sector filter chips */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="text-xs" style={{ color: "var(--t2)" }}>Filter by sector:</span>
          {(["All", "Energy", "Transport", "Agriculture", "Biodiversity"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSector(s === "All" ? "All" : (s as Sector))}
              className="text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer"
              style={
                selectedSector === s
                  ? { borderColor: "var(--red)", background: "var(--red-l)", color: "var(--red-d)", fontWeight: 500 }
                  : { borderColor: "var(--border)", background: "var(--bg)", color: "var(--t2)" }
              }
            >
              {s === "All" ? "All sectors" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Articles analysed" value={totalArticles.toLocaleString()} sub="2024 coverage" variant="red" />
        <StatCard label="Outlets monitored" value={74} sub="France & Belgium" variant="green" />
        <StatCard
          label="Dominant stage"
          value={dominantStage.split(" ")[0]}
          sub={`Solutions at ${solutionPct}%`}
          variant="red"
        />
        <StatCard
          label="Avg misinfo risk"
          value={`${Math.round(avgMisinfo * 100)}%`}
          sub={avgMisinfo < 0.2 ? "All articles clear" : "Moderate signals"}
          variant="green"
        />
      </div>

      {/* Row 1: Sector donut + Stage bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sector donut */}
        <Card>
          <CardTitle>Sector share of environmental coverage</CardTitle>
          <CardSub>Which sectors dominate the news?</CardSub>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={sectorData}
                dataKey="count"
                nameKey="sector"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                onMouseEnter={(_, i) => setHoveredSectorIdx(i)}
                onMouseLeave={() => setHoveredSectorIdx(null)}
                shape={(props: any, i: number) => {
                  const colors = [
                    "var(--red)", "var(--green)", "var(--green-m)", "var(--red-m)",
                    "#D3D1C7", "#93c5fd", "#fbbf24", "#a78bfa", "#34d399",
                  ];
                  return (
                    <PieSector
                      {...props}
                      fill={colors[i % colors.length]}
                      opacity={hoveredSectorIdx === null || hoveredSectorIdx === i ? 1 : 0.4}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
            {sectorData.slice(0, 5).map((s, i) => {
              const colors = ["var(--red)", "var(--green)", "var(--green-m)", "var(--red-m)", "#D3D1C7"];
              const pct = Math.round((s.count / ARTICLES.length) * 100);
              const isHovered = hoveredSectorIdx === i;
              return (
                <span
                  key={s.sector}
                  className="flex items-center gap-1.5 text-[11px] transition-all"
                  style={{ color: isHovered ? "var(--t1)" : "var(--t2)", fontWeight: isHovered ? 600 : 400 }}
                >
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: colors[i] }} />
                  {s.sector} — {isHovered ? `${s.count} articles` : `${pct}%`}
                </span>
              );
            })}
          </div>
        </Card>

        {/* Stage distribution */}
        <Card>
          <CardTitle>Causal stage distribution</CardTitle>
          <CardSub>What aspects do articles focus on?</CardSub>
          {stageRows.map((row) => (
            <BarRow key={row.label} label={row.label} pct={row.pct} color={row.color} />
          ))}
          <Insight variant="red">
            Solutions are critically underrepresented at {solutionPct}%. Research shows solution framing increases reader action intent significantly.
          </Insight>
        </Card>
      </div>

      {/* Row 2: Media vs GHG + Frame cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Media vs emissions */}
        <Card>
          <CardTitle>Media attention vs. real emissions</CardTitle>
          <CardSub>Coverage share vs. sector GHG share</CardSub>
          <div className="flex gap-4 mb-4 text-[11px]" style={{ color: "var(--t2)" }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "var(--red)" }} />
              Media coverage
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "var(--green)" }} />
              GHG emissions
            </span>
          </div>
          {sectorData.slice(0, 5).map((s) => {
            const mediaPct = Math.round((s.count / ARTICLES.length) * 100);
            return (
              <DualRow key={s.sector} label={s.sector} media={mediaPct} ghg={s.ghgShare} />
            );
          })}
          <Insight variant="green">
            Energy receives less coverage than its emissions warrant. Transport is over-indexed relative to its GHG share.
          </Insight>
        </Card>

        {/* Frame 2x2 cards */}
        <Card>
          <CardTitle>Frame distribution</CardTitle>
          <CardSub>Dominant news frames detected across articles (Semetko &amp; Valkenburg 2000)</CardSub>
          <div className="grid grid-cols-2 gap-2.5">
            {FRAME_DEFS.slice(0, 4).map((fd) => {
              const count = frameData.find((f) => f.frame === fd.key)?.count ?? 0;
              const pct = Math.round((count / (totalFrames || 1)) * 100);
              return (
                <div key={fd.key} className="rounded-lg p-3 flex flex-col gap-2" style={{ background: "var(--bg2)" }}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: fd.bg }}
                    >
                      {fd.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-medium" style={{ color: "var(--t1)" }}>{fd.short}</p>
                      <p className="text-lg font-medium leading-none" style={{ color: "var(--t1)" }}>{pct}%</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--bg)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: fd.color }} />
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: "var(--t2)" }}>{fd.desc}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Row 3: Crisis domains + Time series */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Domain donut */}
        <Card>
          <CardTitle>Crisis domain distribution</CardTitle>
          <CardSub>Articles by environmental domain</CardSub>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={domainData}
                dataKey="count"
                nameKey="domain"
                cx="50%"
                cy="50%"
                outerRadius={70}
                paddingAngle={2}
                onMouseEnter={(_, i) => setHoveredDomainIdx(i)}
                onMouseLeave={() => setHoveredDomainIdx(null)}
                shape={(props: any, i: number) => (
                  <PieSector
                    {...props}
                    fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]}
                    opacity={hoveredDomainIdx === null || hoveredDomainIdx === i ? 1 : 0.4}
                  />
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-1">
            {domainData.map((d, i) => {
              const isHovered = hoveredDomainIdx === i;
              return (
                <span
                  key={d.domain}
                  className="flex items-center gap-2 text-[11px] transition-all"
                  style={{ color: isHovered ? "var(--t1)" : "var(--t2)", fontWeight: isHovered ? 600 : 400 }}
                >
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: DOMAIN_COLORS[i] }} />
                  {d.domain} — {d.count} articles
                </span>
              );
            })}
          </div>
        </Card>

        {/* Time series */}
        <div className="lg:col-span-2">
          <Card>
            <CardTitle>Coverage volume over time</CardTitle>
            <CardSub>Monthly articles by crisis domain · 2024</CardSub>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={timeData} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(v) => (
                    <span style={{ color: "var(--t2)" }}>{v}</span>
                  )}
                />
                <Line type="monotone" dataKey="Climate" stroke="var(--red)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Biodiversity" stroke="var(--green)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Natural Resources" stroke="var(--green-m)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>

      {/* Row 4: Misinformation by sector */}
      <Card>
        <CardTitle>Average misinformation risk by sector</CardTitle>
        <CardSub>Higher scores indicate more articles flagged with potential misinformation signals</CardSub>
        <div className="space-y-2.5 mt-2">
          {SECTORS.map((sector) => {
            const arts = ARTICLES.filter((a) => a.sector === sector);
            const risk = arts.length
              ? Math.round((arts.reduce((s, a) => s + a.misinformationScore, 0) / arts.length) * 100)
              : 0;
            const color = risk < 20 ? "var(--green-m)" : risk < 40 ? "#EF9F27" : "var(--red)";
            return (
              <div key={sector} className="flex items-center gap-3">
                <span className="text-xs text-right w-28 shrink-0" style={{ color: "var(--t2)" }}>{sector}</span>
                <div className="flex-1 h-2 rounded-full" style={{ background: "var(--bg2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${risk}%`, background: color }} />
                </div>
                <span className="text-xs w-8 text-right font-medium" style={{ color }}>{risk}%</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
