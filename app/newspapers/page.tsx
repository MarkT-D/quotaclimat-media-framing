"use client";
import { useState, useMemo, useEffect } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { getOutletStats } from "@/lib/mockData";
import type { OutletStat, Frame, Stage } from "@/lib/mockData";
import { useArticles } from "@/lib/useArticles";

// ── tokens ─────────────────────────────────────────────────────────────────
const SALMON = "#F47676";
const LIME   = "#D8E84B";
const A_TEXT = "#B8402E";  // dark red — readable A label inside SVG
const B_TEXT = "#2D4228";  // dark green — readable B label inside SVG

const PF   = "var(--font-playfair)";
const PFSC = "var(--font-playfair-sc)";
const SS   = "var(--font-source-serif)";
const SANS = "var(--font-plex-sans)";
const PDK  = "var(--font-podkova)";
const QTC  = "var(--font-quantico)";

// ── extended outlet stat ───────────────────────────────────────────────────
interface ExtStat extends OutletStat {
  angleCoverage: number; // % articles with non-null primaryAngle
  lagDays:       number; // days from dataset-start to outlet's first article
  avgWordCount:  number; // mean word count per article
  sectorCount:   number; // distinct sectors covered
}

// ── metric system ──────────────────────────────────────────────────────────
interface Metric {
  id:       string;
  label:    string;
  short:    string;
  unit:     string;
  desc:     string;
  getValue: (o: ExtStat) => number;
}

const METRICS: Metric[] = [
  {
    id: "volume", label: "Article Volume", short: "Volume", unit: "Articles",
    desc: "total articles published",
    getValue: o => o.articleCount,
  },
  {
    id: "frame", label: "Frame Coverage", short: "Frame", unit: "Rate %",
    desc: "% articles with a dominant frame classified",
    getValue: o => {
      const peak = Math.max(0, ...Object.values(o.frameDist));
      return o.articleCount > 0 ? Math.round(peak / o.articleCount * 100) : 0;
    },
  },
  {
    id: "angle", label: "Angle Coverage", short: "Angle", unit: "Rate %",
    desc: "% articles with a topic angle classified",
    getValue: o => o.angleCoverage,
  },
  {
    id: "lag", label: "Coverage Lag", short: "Lag", unit: "Days",
    desc: "days from dataset start to outlet's first article",
    getValue: o => o.lagDays,
  },
  {
    id: "wordcount", label: "Avg. Word Count", short: "Words", unit: "Words",
    desc: "mean article length in words",
    getValue: o => o.avgWordCount,
  },
  {
    id: "sector", label: "Sector Breadth", short: "Sectors", unit: "Sectors",
    desc: "number of distinct sectors covered",
    getValue: o => o.sectorCount,
  },
];

// ── hex node layout ─────────────────────────────────────────────────────────
// pointy-top hexagon, centre (200,200), r=140
const HEX_NODES = [
  { metricId: "volume",    cx: 200, cy: 60  },
  { metricId: "frame",     cx: 321, cy: 130 },
  { metricId: "angle",     cx: 321, cy: 270 },
  { metricId: "lag",       cx: 200, cy: 340 },
  { metricId: "wordcount", cx: 79,  cy: 270 },
  { metricId: "sector",    cx: 79,  cy: 130 },
];

const FRAME_COLORS: { frame: Frame; color: string }[] = [
  { frame: "Conflict",                      color: "#B8402E" },
  { frame: "Human Interest",                color: "#4A6741" },
  { frame: "Morality",                      color: "#7C3AED" },
  { frame: "Economic Consequences",         color: "#EF9F27" },
  { frame: "Attribution of Responsibility", color: "#0ea5e9" },
];

const STAGE_COLORS: { stage: Stage; color: string }[] = [
  { stage: "General Concepts", color: "#B8B0A4" },
  { stage: "Causes",           color: "#EF9F27" },
  { stage: "Consequences",     color: "#B8402E" },
  { stage: "Solutions",        color: "#4A6741" },
];

const PRESETS = [
  { a: "volume",    b: "frame",     label: "Volume vs Frame Coverage" },
  { a: "angle",     b: "wordcount", label: "Angle vs Word Count" },
  { a: "lag",       b: "sector",    label: "Lag vs Sector Breadth" },
];

// ── HexPicker ──────────────────────────────────────────────────────────────
// Node shapes:
//   Unselected → circle (r=34), bg fill
//   B selected → circle (r=34), lime fill, thicker stroke
//   A selected → diamond (square rotated 45°), salmon fill — springs in via
//                CSS cubic-bezier; circle shrinks away simultaneously
function HexPicker({ metricA, metricB, onNodeClick }: {
  metricA:     string;
  metricB:     string;
  onNodeClick: (id: string) => void;
}) {
  const nodeA = HEX_NODES.find(n => n.metricId === metricA)!;
  const nodeB = HEX_NODES.find(n => n.metricId === metricB)!;
  const mA    = METRICS.find(m => m.id === metricA)!;
  const mB    = METRICS.find(m => m.id === metricB)!;

  const CIRC_R  = 34;  // circle radius
  const DIAM_H  = 24;  // half-side of diamond rect → vertex reach ≈ 33.9 px ≈ CIRC_R
  const SPRING  = "cubic-bezier(0.34,1.56,0.64,1)";

  return (
    // viewBox sized for the node positions + r=34 margins, no external label space needed
    <svg viewBox="20 5 360 390" width="100%" height="auto"
      style={{ overflow: "visible", display: "block" }}>

      <defs>
        <radialGradient id="hexCloud" cx="200" cy="200" r="150"
          gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#EAE4D8" stopOpacity="1" />
          <stop offset="45%"  stopColor="#EAE4D8" stopOpacity="0.82" />
          <stop offset="75%"  stopColor="#DDD6C6" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#DDD6C6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── hex wireframe ── */}
      {HEX_NODES.map((n, i) => {
        const next = HEX_NODES[(i + 1) % HEX_NODES.length];
        return (
          <line key={i}
            x1={n.cx} y1={n.cy} x2={next.cx} y2={next.cy}
            stroke="var(--border)" strokeWidth={1}
          />
        );
      })}

      {/* ── A-to-B diagonal ── */}
      <line
        x1={nodeA.cx} y1={nodeA.cy} x2={nodeB.cx} y2={nodeB.cy}
        stroke="#B9B9B9" strokeWidth={1.5} strokeDasharray="4 3"
      />

      {/* ── dashed spokes to centre ── */}
      <line x1={nodeA.cx} y1={nodeA.cy} x2={200} y2={200}
        stroke="var(--t1)" strokeWidth={1.5} strokeDasharray="5 3" />
      <line x1={nodeB.cx} y1={nodeB.cy} x2={200} y2={200}
        stroke="var(--t1)" strokeWidth={1.5} strokeDasharray="5 3" />

      {/* ── cloud fill (drawn after lines so it bleaches their interiors) ── */}
      <polygon
        points="200,60 321,130 321,270 200,340 79,270 79,130"
        fill="url(#hexCloud)"
        style={{ pointerEvents: "none" }}
      />

      {/* ── nodes ── */}
      {HEX_NODES.map((node) => {
        const isA    = node.metricId === metricA;
        const isB    = node.metricId === metricB;
        const metric = METRICS.find(m => m.id === node.metricId)!;

        return (
          <g key={node.metricId}
            onClick={() => onNodeClick(node.metricId)}
            style={{ cursor: "pointer" }}>

            {/* Circle — present for unselected and B; shrinks away when A selected */}
            <circle
              cx={node.cx} cy={node.cy} r={CIRC_R}
              fill={isB ? LIME : "var(--bg)"}
              stroke="var(--t1)" strokeWidth={isB ? 2.5 : 1.5}
              style={{
                opacity: isA ? 0 : 1,
                transformOrigin: `${node.cx}px ${node.cy}px`,
                transform: isA ? "scale(0.1)" : "scale(1)",
                transition: `opacity 0.3s ease, transform 0.45s ${SPRING}, fill 0.3s ease`,
              }}
            />

            {/* Diamond — rotated via SVG attribute so CSS scale stays axis-aligned */}
            <g transform={`rotate(45,${node.cx},${node.cy})`}>
              <rect
                x={node.cx - DIAM_H} y={node.cy - DIAM_H}
                width={DIAM_H * 2} height={DIAM_H * 2}
                rx={3}
                fill={SALMON} stroke="var(--t1)" strokeWidth={2}
                style={{
                  opacity: isA ? 1 : 0,
                  transformOrigin: `${node.cx}px ${node.cy}px`,
                  transform: isA ? "scale(1)" : "scale(0.1)",
                  transition: `opacity 0.3s ease, transform 0.45s ${SPRING}`,
                }}
              />
            </g>

            {/* Metric label — always inside the node, un-rotated */}
            <text x={node.cx} y={node.cy + 4} textAnchor="middle"
              fontFamily={PDK} fontSize={10} fontWeight="600"
              fill={isA ? "#fff" : isB ? "var(--t1)" : "var(--t2)"}
              style={{ pointerEvents: "none", transition: "fill 0.3s ease",
                       userSelect: "none" }}>
              {metric.short}
            </text>
            <text x={node.cx} y={node.cy + 15} textAnchor="middle"
              fontFamily={QTC} fontSize={7} letterSpacing="0.5"
              fill={isA ? "rgba(255,255,255,0.65)" : "var(--t2)"}
              style={{ pointerEvents: "none", userSelect: "none",
                       transition: "fill 0.3s ease" }}>
              {metric.unit.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* ── centre "A by B" — rendered last, floats above everything ── */}
      <circle cx={200} cy={205} r={48} fill="#EAE4D8" />
      <line x1={158} y1={193} x2={242} y2={193}
        stroke="var(--border)" strokeWidth={0.5} />
      <line x1={158} y1={215} x2={242} y2={215}
        stroke="var(--border)" strokeWidth={0.5} />
      <text x={200} y={183} textAnchor="middle"
        fontFamily={QTC} fontSize={13} fill={A_TEXT} letterSpacing="1.5">
        {mA.short.toUpperCase()}
      </text>
      <text x={200} y={208} textAnchor="middle"
        fontFamily={PF} fontStyle="italic" fontSize={13} fill="var(--t2)">
        by
      </text>
      <text x={200} y={228} textAnchor="middle"
        fontFamily={QTC} fontSize={13} fill={B_TEXT} letterSpacing="1.5">
        {mB.short.toUpperCase()}
      </text>
    </svg>
  );
}

// ── ScatterTooltip ─────────────────────────────────────────────────────────
function ScatterTooltip({ active, payload, mA, mB }: {
  active?:  boolean;
  payload?: Array<{ payload: { name: string; x: number; y: number } }>;
  mA:       Metric;
  mB:       Metric;
}) {
  if (!active || !payload?.length) return null;
  const { name, x, y } = payload[0].payload;
  return (
    <div style={{
      background: "var(--bg)", border: "0.5px solid var(--border)",
      padding: "10px 14px", fontFamily: SS, fontSize: 13,
      lineHeight: 1.6, boxShadow: "2px 2px 0 var(--bg2)",
    }}>
      <p style={{
        fontWeight: 600, color: "var(--t1)", marginBottom: 6,
        fontFamily: PFSC, fontSize: 12, letterSpacing: "0.03em",
      }}>
        {name}
      </p>
      <p style={{ color: "var(--t2)" }}>
        <span style={{
          background: SALMON, color: "#fff", padding: "0 4px",
          fontFamily: QTC, fontSize: 10,
        }}>A</span>{" "}
        {mA.label}: <strong style={{ color: "var(--t1)" }}>{x} {mA.unit}</strong>
      </p>
      <p style={{ color: "var(--t2)" }}>
        <span style={{
          background: LIME, color: "var(--t1)", padding: "0 4px",
          fontFamily: QTC, fontSize: 10,
        }}>B</span>{" "}
        {mB.label}: <strong style={{ color: "var(--t1)" }}>{y} {mB.unit}</strong>
      </p>
    </div>
  );
}

// ── OutletCard ─────────────────────────────────────────────────────────────
function OutletCard({ outlet, mA, mB }: {
  outlet: ExtStat;
  mA:     Metric;
  mB:     Metric;
}) {
  const total = outlet.articleCount || 1;

  return (
    <div style={{ background: "var(--bg)", padding: "20px 16px" }}>
      <p style={{
        fontFamily: PFSC, fontSize: 11, lineHeight: "15px",
        color: "var(--t1)", marginBottom: 8, wordBreak: "break-word",
        letterSpacing: "0.02em",
      }}>
        {outlet.name}
      </p>

      <p style={{
        fontFamily: PF, fontSize: 32, lineHeight: "36px",
        color: "var(--t1)", marginBottom: 2,
      }}>
        {outlet.articleCount}
      </p>
      <p style={{
        fontFamily: QTC, fontSize: 8, letterSpacing: "1.2",
        textTransform: "uppercase", color: "var(--t2)", marginBottom: 18,
      }}>
        articles
      </p>

      <p style={{
        fontFamily: QTC, fontSize: 8, letterSpacing: "1",
        textTransform: "uppercase", color: "var(--t2)", marginBottom: 5,
      }}>
        Frames
      </p>
      <div style={{ display: "flex", height: 6, marginBottom: 14 }}>
        {FRAME_COLORS.map(({ frame, color }) => {
          const count = outlet.frameDist[frame] ?? 0;
          const pct   = (count / total) * 100;
          return pct > 0 ? (
            <div key={frame} title={`${frame}: ${count}`}
              style={{ width: `${pct}%`, background: color, minWidth: 2 }} />
          ) : null;
        })}
      </div>

      <p style={{
        fontFamily: QTC, fontSize: 8, letterSpacing: "1",
        textTransform: "uppercase", color: "var(--t2)", marginBottom: 5,
      }}>
        Stages
      </p>
      <div style={{ display: "flex", height: 4, marginBottom: 20 }}>
        {STAGE_COLORS.map(({ stage, color }) => {
          const count = outlet.stageDist[stage] ?? 0;
          const pct   = (count / total) * 100;
          return pct > 0 ? (
            <div key={stage} title={`${stage}: ${count}`}
              style={{ width: `${pct}%`, background: color }} />
          ) : null;
        })}
      </div>

      {[
        { m: mA, bg: SALMON, fg: "#fff" },
        { m: mB, bg: LIME,   fg: "var(--t1)" },
      ].map(({ m, bg, fg }) => (
        <div key={m.id} style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 4,
        }}>
          <span style={{
            fontFamily: QTC, fontSize: 8, letterSpacing: "0.8",
            textTransform: "uppercase", color: "var(--t2)",
          }}>
            {m.short}
          </span>
          <span style={{
            fontFamily: PDK, fontSize: 12, background: bg,
            color: fg, padding: "1px 6px",
          }}>
            {m.getValue(outlet)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function DiscrepancyDesk() {
  const { articles, loading } = useArticles();
  const allStats = useMemo(() => getOutletStats(articles), [articles]);

  // Compute angle coverage + coverage lag from the raw articles array
  const extStats = useMemo((): ExtStat[] => {
    if (articles.length === 0) {
      return allStats.map(o => ({ ...o, angleCoverage: 0, lagDays: 0, avgWordCount: 0, sectorCount: 0 }));
    }
    const MS_PER_DAY  = 86_400_000;
    const times       = articles
      .map(a => new Date(a.publishedAt).getTime())
      .filter(t => isFinite(t) && t > 0);
    const globalStart = times.length ? Math.min(...times) : 0;

    return allStats.map(o => {
      const oa    = articles.filter(a => a.outlet === o.id);
      const withAngle = oa.filter(a => a.primaryAngle !== null).length;
      const angleCoverage = oa.length > 0
        ? Math.round(withAngle / oa.length * 100)
        : 0;

      const oaTimes = oa
        .map(a => new Date(a.publishedAt).getTime())
        .filter(t => isFinite(t) && t > 0);
      const first  = oaTimes.length ? Math.min(...oaTimes) : globalStart;
      const lagDays = Math.max(0, Math.round((first - globalStart) / MS_PER_DAY));

      const totalWords = oa.reduce((s, a) => s + a.wordCount, 0);
      const avgWordCount = oa.length > 0 ? Math.round(totalWords / oa.length) : 0;

      const sectorCount = new Set(oa.map(a => a.sector).filter(Boolean)).size;

      return { ...o, angleCoverage, lagDays, avgWordCount, sectorCount };
    });
  }, [articles, allStats]);

  const [metricA, setMetricA] = useState("volume");
  const [metricB, setMetricB] = useState("frame");
  const [filterMode, setFilterMode]     = useState<"outlet" | "language" | "month">("outlet");
  const [selectedOutlets, setSelectedOutlets] = useState<Set<string>>(new Set());

  // Default: top-5 outlets by volume
  useEffect(() => {
    if (extStats.length > 0 && selectedOutlets.size === 0) {
      const top5 = [...extStats]
        .sort((a, b) => b.articleCount - a.articleCount)
        .slice(0, 5)
        .map(o => o.id);
      setSelectedOutlets(new Set(top5));
    }
  }, [extStats]); // eslint-disable-line react-hooks/exhaustive-deps

  const mA = METRICS.find(m => m.id === metricA)!;
  const mB = METRICS.find(m => m.id === metricB)!;

  const displayStats = useMemo(() =>
    selectedOutlets.size === 0
      ? extStats
      : extStats.filter(o => selectedOutlets.has(o.id)),
    [extStats, selectedOutlets]
  );

  const scatterData = useMemo(() =>
    displayStats.map(o => ({ name: o.name, x: mA.getValue(o), y: mB.getValue(o) })),
    [displayStats, metricA, metricB] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const reg = useMemo(() => {
    const pts = scatterData;
    if (pts.length < 3) return null;
    const n   = pts.length;
    const sx  = pts.reduce((s, p) => s + p.x,       0);
    const sy  = pts.reduce((s, p) => s + p.y,       0);
    const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
    const sx2 = pts.reduce((s, p) => s + p.x ** 2,  0);
    const d   = n * sx2 - sx * sx;
    if (!d) return null;
    const slope = (n * sxy - sx * sy) / d;
    const int   = (sy - slope * sx)   / n;
    const xs    = pts.map(p => p.x);
    return { slope, int, minX: Math.min(...xs), maxX: Math.max(...xs) };
  }, [scatterData]);

  const handleHexClick = (id: string) => {
    if (id === metricA) return;
    if (id === metricB) { setMetricA(id); setMetricB(metricA); }
    else                { setMetricB(metricA); setMetricA(id); }
  };

  const toggleOutlet = (id: string) => {
    setSelectedOutlets(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else if (next.size < 5) { next.add(id); }
      return next;
    });
  };

  const today     = new Date().toLocaleDateString("en-GB",  { day: "numeric", month: "long",  year: "numeric" });
  const monthYear = new Date().toLocaleDateString("en-US",  { month: "long",  year: "numeric" });

  const DblRule = () => (
    <div>
      <div style={{ borderTop: "2px solid var(--t1)" }} />
      <div style={{ borderTop: "1px solid var(--border)", marginTop: 2 }} />
    </div>
  );

  return (
    <div style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 44px 80px" }}>

        {/* ── sub-strip ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 0 10px",
          fontFamily: QTC, fontSize: 13, letterSpacing: "1.2",
          textTransform: "uppercase", color: "var(--t2)",
        }}>
          <span>Edition II · Discrepancy Desk</span>
          <span>Updated {today}</span>
        </div>
        <DblRule />
        <div style={{ height: 40 }} />

        {/* ── headline, centred ── */}
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", marginBottom: 20 }}>
          <div style={{
            fontFamily: PF,
            fontSize: "clamp(20px, 2.2vw, 34px)",
            lineHeight: 1.1,
            color: "var(--t1)",
            marginBottom: 18,
            display: "flex", flexWrap: "nowrap",
            alignItems: "center", justifyContent: "center",
            gap: "0.3em",
          }}>
            <span>Compare</span>
            <span style={{
              background: SALMON, border: "1px solid var(--t1)",
              padding: "0 10px", color: "#fff",
              whiteSpace: "nowrap",
            }}>
              {mA.label}
            </span>
            <span>by</span>
            <span style={{
              background: LIME, border: "1px solid var(--t1)",
              padding: "0 10px", color: "var(--t1)",
              whiteSpace: "nowrap",
            }}>
              {mB.label}
            </span>
          </div>

        </div>

        {/* ── hex wheel, centred ── */}
        <div style={{ maxWidth: 480, margin: "4px auto 0", padding: "0 24px" }}>
          <HexPicker
            metricA={metricA}
            metricB={metricB}
            onNodeClick={handleHexClick}
          />
        </div>

        <p style={{
          fontFamily: PF, fontStyle: "italic",
          fontSize: 14, lineHeight: "20px",
          color: "var(--t2)", textAlign: "center",
          margin: "10px auto 0", maxWidth: 520,
        }}>
          Click two nodes on the wheel to set the comparison. The dashed line connects your picks; the scatter below redraws instantly.
        </p>

        {/* ── controls, centred below wheel ── */}
        <div style={{ maxWidth: 760, margin: "28px auto 0" }}>

          {/* filter mode tabs */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <div style={{ display: "flex" }}>
              {(["outlet", "language", "month"] as const).map((mode, i) => (
                <button key={mode}
                  onClick={() => setFilterMode(mode)}
                  style={{
                    padding: "5px 20px",
                    background: filterMode === mode ? "var(--t1)" : "transparent",
                    color: filterMode === mode ? "var(--bg)" : "var(--t1)",
                    border: "1px solid var(--t1)",
                    marginLeft: i > 0 ? -1 : 0,
                    fontFamily: QTC, fontSize: 12, letterSpacing: "0.8",
                    textTransform: "uppercase", cursor: "pointer",
                    position: "relative", zIndex: filterMode === mode ? 1 : 0,
                  }}>
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* outlet chips */}
          {filterMode === "outlet" ? (
            <div style={{
              border: "1px solid var(--t1)",
              padding: "12px 16px",
              display: "flex", flexWrap: "wrap",
              gap: 8, alignItems: "center", justifyContent: "center",
            }}>
              {extStats.slice(0, 14).map(o => {
                const active   = selectedOutlets.has(o.id);
                const disabled = !active && selectedOutlets.size >= 5;
                return (
                  <button key={o.id}
                    onClick={() => { if (active || !disabled) toggleOutlet(o.id); }}
                    title={o.name}
                    style={{
                      padding: "3px 10px",
                      background: active ? "var(--t1)" : "transparent",
                      color: active ? "var(--bg)" : "var(--t2)",
                      border: "none",
                      fontFamily: QTC, fontSize: 10, letterSpacing: "0.5",
                      textTransform: "uppercase",
                      cursor: disabled ? "default" : "pointer",
                      opacity: disabled ? 0.3 : 1,
                      transition: "opacity 0.15s",
                      maxWidth: 140, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                    {o.name}
                  </button>
                );
              })}
              <span style={{
                fontFamily: QTC, fontSize: 9, letterSpacing: "0.8",
                textTransform: "uppercase", color: "var(--t2)", whiteSpace: "nowrap",
              }}>
                choose up to 5
              </span>
            </div>
          ) : (
            <div style={{
              border: "1px solid var(--border)",
              padding: "14px 16px", textAlign: "center",
              fontFamily: QTC, fontSize: 10, letterSpacing: "0.8",
              textTransform: "uppercase", color: "var(--t2)",
            }}>
              {filterMode === "language" ? "Language filter — coming soon" : "Month filter — coming soon"}
            </div>
          )}

          {/* preset pairs */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "center", flexWrap: "wrap",
            gap: 10, marginTop: 14,
          }}>
            <span style={{
              fontFamily: QTC, fontStyle: "italic", fontSize: 11,
              letterSpacing: "0.8", textTransform: "uppercase", color: "var(--t2)",
            }}>
              Try a pair:
            </span>
            {PRESETS.map(p => (
              <button key={p.a + p.b}
                onClick={() => { setMetricA(p.a); setMetricB(p.b); }}
                style={{
                  border: "1px solid var(--t1)", padding: "4px 14px",
                  background: "transparent",
                  fontFamily: PF, fontStyle: "italic", fontSize: 13,
                  color: "var(--t1)", cursor: "pointer",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg2)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── scatter section header ── */}
        <div style={{ marginTop: 56 }}>
          <DblRule />
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", padding: "10px 0",
            fontFamily: PDK, fontSize: 14, color: "var(--t2)",
          }}>
            <span>
              <em style={{ fontFamily: PF, fontStyle: "italic" }}>{mB.label}</em>
              {" "}coverage · across{" "}
              <em style={{ fontFamily: PF, fontStyle: "italic" }}>{mA.label}</em>
              {" "}· {monthYear}
            </span>
            <span>Source · n = {displayStats.length} outlets</span>
          </div>
          <div style={{ borderTop: "1px solid var(--border)", marginBottom: 12 }} />
        </div>

        <p style={{
          fontFamily: SS, fontSize: 15, lineHeight: "20px",
          color: "var(--t1)", marginBottom: 24, maxWidth: 820,
        }}>
          Each dot is one outlet. x-axis = <em>{mA.label}</em> ({mA.desc}); y-axis = <em>{mB.label}</em>. The dashed line is the regression — dots above over-index on {mB.short} for their level of {mA.short}.
        </p>

        {/* ── scatter plot ── */}
        {loading ? (
          <div style={{
            height: 580, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontFamily: QTC, fontSize: 12, letterSpacing: "1.2",
            textTransform: "uppercase", color: "var(--t2)",
          }}>
            Loading data…
          </div>
        ) : displayStats.length === 0 ? (
          <div style={{
            height: 580, display: "flex",
            alignItems: "center", justifyContent: "center",
            fontFamily: PDK, fontSize: 16, color: "var(--t2)",
          }}>
            Select at least one outlet above.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={580}>
            <ScatterChart margin={{ top: 20, right: 80, bottom: 56, left: 24 }}>
              <CartesianGrid
                strokeDasharray="2 6"
                stroke="var(--border)"
                strokeOpacity={0.5}
              />
              <XAxis
                type="number" dataKey="x" name={mA.label}
                tick={{ fontFamily: SANS, fontSize: 11, fill: "var(--t2)" }}
                label={{
                  value: `${mA.label} (${mA.unit}) →`,
                  position: "insideBottomRight",
                  offset: -8,
                  style: { fontFamily: PF, fontStyle: "italic", fontSize: 13, fill: "var(--t1)" },
                }}
              />
              <YAxis
                type="number" dataKey="y" name={mB.label}
                tick={{ fontFamily: SANS, fontSize: 11, fill: "var(--t2)" }}
                label={{
                  value: `↑ ${mB.label} (${mB.unit})`,
                  angle: -90,
                  position: "insideTopLeft",
                  offset: 16,
                  style: { fontFamily: PF, fontStyle: "italic", fontSize: 13, fill: "var(--t1)" },
                }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3", stroke: "var(--t2)" }}
                content={(props: unknown) => {
                  const p = props as {
                    active?: boolean;
                    payload?: Array<{ payload: { name: string; x: number; y: number } }>;
                  };
                  return <ScatterTooltip active={p.active} payload={p.payload} mA={mA} mB={mB} />;
                }}
              />
              <Scatter
                data={scatterData}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shape={(props: any) => {
                  const { cx, cy, payload } = props as {
                    cx: number; cy: number;
                    payload: { name: string };
                  };
                  const nm    = payload.name;
                  const label = nm.length > 18 ? nm.substring(0, 16) + "…" : nm;
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={5}
                        fill="var(--t1)" fillOpacity={0.72} />
                      <text x={cx + 8} y={cy - 1}
                        fontSize={10} fontFamily={SANS}
                        fill="var(--t1)" fillOpacity={0.72}>
                        {label}
                      </text>
                    </g>
                  );
                }}
              />
              {reg && (
                <ReferenceLine
                  segment={[
                    { x: reg.minX, y: reg.slope * reg.minX + reg.int },
                    { x: reg.maxX, y: reg.slope * reg.maxX + reg.int },
                  ]}
                  stroke="var(--t2)"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        )}

        {/* ── outlet comparison grid ── */}
        {displayStats.length > 0 && (
          <div style={{ marginTop: 64 }}>
            <div style={{ borderTop: "1px solid var(--border)", marginBottom: 32 }} />

            <h2 style={{
              fontFamily: PF,
              fontSize: "clamp(26px, 2.6vw, 43px)",
              lineHeight: 1.05, color: "var(--t1)", marginBottom: 8,
            }}>
              The same coverage,{" "}
              {displayStats.length > 1 ? `${displayStats.length} ways` : "one outlet"}
              : where framing diverges
            </h2>
            <p style={{
              fontFamily: PF, fontStyle: "italic",
              fontSize: 18, lineHeight: "24px",
              color: "var(--t2)", marginBottom: 32,
            }}>
              Each card shows{" "}
              <span style={{ background: SALMON, color: "#fff", padding: "0 4px" }}>A</span>
              {" "}{mA.label} and{" "}
              <span style={{ background: LIME, color: "var(--t1)", padding: "0 4px" }}>B</span>
              {" "}{mB.label}, alongside each outlet&rsquo;s frame and stage profile.
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(displayStats.length, 5)}, 1fr)`,
              gap: "1px", border: "1px solid var(--border)",
              background: "var(--border)", overflow: "hidden",
            }}>
              {displayStats.map(o => (
                <OutletCard key={o.id} outlet={o} mA={mA} mB={mB} />
              ))}
            </div>

            {/* legends */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: 32, marginTop: 20,
            }}>
              {[
                { label: "Frames", items: FRAME_COLORS.map(f => ({ label: f.frame, color: f.color })) },
                { label: "Stages", items: STAGE_COLORS.map(s => ({ label: s.stage, color: s.color })) },
              ].map(({ label, items }) => (
                <div key={label}>
                  <p style={{
                    fontFamily: QTC, fontSize: 9, letterSpacing: "1.2",
                    textTransform: "uppercase", color: "var(--t2)", marginBottom: 8,
                  }}>
                    {label}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 20px" }}>
                    {items.map(({ label: l, color }) => (
                      <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 10, height: 10, background: color, flexShrink: 0 }} />
                        <span style={{
                          fontFamily: SS, fontSize: 12, color: "var(--t2)", lineHeight: 1,
                        }}>
                          {l}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── footer ── */}
        <div style={{ marginTop: 80 }}>
          <div style={{ borderTop: "1px solid var(--border)", marginBottom: 16 }} />
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontFamily: PDK, fontSize: 15, lineHeight: "25px", color: "var(--t2)",
          }}>
            <span>The Climate Narrative Review · Discrepancy Desk</span>
            <span>Edition II</span>
          </div>
        </div>

      </div>
    </div>
  );
}
