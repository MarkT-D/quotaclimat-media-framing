"use client";
import { useState, useMemo, useEffect, type ReactElement } from "react";
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { getOutletStats, FRAMES, ANGLES } from "@/lib/articleTypes";
import type { OutletStat, Frame, Stage, Angle, Article } from "@/lib/articleTypes";
import { useArticles } from "@/lib/useArticles";

// ── tokens ─────────────────────────────────────────────────────────────────
const SALMON = "var(--red)";
const LIME   = "var(--green)";
const A_TEXT = "var(--red)";
const B_TEXT = "var(--green-d)";

const PF   = "var(--font-playfair)";
const PFSC = "var(--font-playfair-sc)";
const SS   = "var(--font-source-serif)";
const SANS = "var(--font-plex-sans)";
const PDK  = "var(--font-podkova)";
const QTC  = "var(--font-quantico)";

// ── types ───────────────────────────────────────────────────────────────────
type MetricParam = {
  frameFilter?: Frame;
  angleFilter?: Angle;
};

interface ExtStat extends OutletStat {
  angleCoverage: number;
  lagDays:       number;
  avgWordCount:  number;
  sectorCount:   number;
  countryCode:   number;
  outletCountry: string;
  angleDist:     Partial<Record<Angle, number>>;
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

function resolveValue(m: Metric, o: ExtStat, p: MetricParam): number {
  if (m.id === "frame" && p.frameFilter) {
    const c = o.frameDist[p.frameFilter] ?? 0;
    return o.articleCount > 0 ? Math.round(c / o.articleCount * 100) : 0;
  }
  if (m.id === "angle" && p.angleFilter) {
    const c = o.angleDist[p.angleFilter] ?? 0;
    return o.articleCount > 0 ? Math.round(c / o.articleCount * 100) : 0;
  }
  return m.getValue(o);
}

const METRICS: Metric[] = [
  {
    id: "country", label: "Country of Origin", short: "Country", unit: "Code",
    desc: "outlet's primary country of origin (numeric index, alphabetically ordered)",
    getValue: o => o.countryCode,
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
    id: "lag", label: "Time", short: "Time", unit: "Months",
    desc: "months from first outlet's coverage to this outlet's first article",
    getValue: o => Math.round(o.lagDays / MONTHS),
  },
  {
    id: "wordcount", label: "Word Count", short: "Word Count", unit: "Words",
    desc: "mean article length in words",
    getValue: o => o.avgWordCount,
  },
  {
    id: "sector", label: "Sector Breadth", short: "Sector", unit: "Count",
    desc: "number of distinct sectors covered by this outlet",
    getValue: o => o.sectorCount,
  },
];

// ── hex node layout ─────────────────────────────────────────────────────────
const HEX_NODES = [
  { metricId: "country",   cx: 200, cy: 60  },
  { metricId: "frame",     cx: 321, cy: 130 },
  { metricId: "angle",     cx: 321, cy: 270 },
  { metricId: "lag",       cx: 200, cy: 340 },
  { metricId: "wordcount", cx: 79,  cy: 270 },
  { metricId: "sector",    cx: 79,  cy: 130 },
];

const FRAME_COLORS: { frame: Frame; color: string }[] = [
  { frame: "Attribution of Responsibility", color: "var(--red)" },
  { frame: "Human Interest",                color: "var(--green)" },
  { frame: "Conflict",                      color: "var(--red-m)" },
  { frame: "Morality",                      color: "#7C3AED" },
  { frame: "Economic Consequences",         color: "#EF9F27" },
];

const STAGE_COLORS: { stage: Stage; color: string }[] = [
  { stage: "General Concepts", color: "var(--t2)" },
  { stage: "Causes",           color: "var(--red-m)" },
  { stage: "Consequences",     color: "var(--red)" },
  { stage: "Solutions",        color: "var(--green)" },
];

const ANGLE_COLORS: Record<Angle, string> = {
  "Health":            "var(--red)",
  "Economics":         "#EF9F27",
  "Jobs":              "var(--green)",
  "Politics":          "var(--red-m)",
  "Geopolitics":       "#7C3AED",
  "Purchasing Power":  "var(--green-m)",
};

const MONTHS = 30.44; // days per month for lag conversion

const PRESETS = [
  { a: "country",   b: "frame",     label: "Country vs Frame Coverage" },
  { a: "angle",     b: "wordcount", label: "Angle vs Word Count" },
  { a: "country",   b: "sector",    label: "Country vs Sector Range" },
];

// ── insight chart catalog ──────────────────────────────────────────────────
type InsightChartId =
  | "cross-tab-heatmap"
  | "country-group"
  | "country-stacked-dist"
  | "correlation-panel"
  | "frame-dist"
  | "angle-dist"
  | "entry-timeline"
  | "timeline-by-frame"
  | "timeline-by-angle"
  | "word-dist-by-group"
  | "sector-grouped-dist"
  | "word-count-over-time";

type PairRule = {
  valid:      boolean;
  byLanguage: boolean;
  byTime:     boolean;
  charts:     InsightChartId[];
};

function insightKey(a: string, b: string) { return [a, b].sort().join("|"); }

const PAIR_RULES: Record<string, PairRule> = {
  "angle|frame":      { valid: true,  byLanguage: true,  byTime: true,  charts: ["cross-tab-heatmap", "frame-dist", "angle-dist"] },
  "frame|lag":        { valid: true,  byLanguage: true,  byTime: false, charts: ["timeline-by-frame", "entry-timeline", "correlation-panel"] },
  "frame|wordcount":  { valid: true,  byLanguage: true,  byTime: false, charts: ["word-count-over-time", "frame-dist", "correlation-panel"] },
  "frame|sector":     { valid: true,  byLanguage: true,  byTime: true,  charts: ["sector-grouped-dist", "frame-dist", "correlation-panel"] },
  "country|frame":    { valid: true,  byLanguage: false, byTime: true,  charts: ["country-group", "country-stacked-dist", "frame-dist"] },
  "angle|lag":        { valid: true,  byLanguage: true,  byTime: false, charts: ["timeline-by-angle", "entry-timeline", "correlation-panel"] },
  "angle|wordcount":  { valid: true,  byLanguage: true,  byTime: false, charts: ["word-count-over-time", "angle-dist", "correlation-panel"] },
  "angle|sector":     { valid: true,  byLanguage: true,  byTime: true,  charts: ["sector-grouped-dist", "angle-dist", "correlation-panel"] },
  "angle|country":    { valid: true,  byLanguage: false, byTime: true,  charts: ["country-group", "country-stacked-dist", "angle-dist"] },
  "lag|wordcount":    { valid: true,  byLanguage: true,  byTime: false, charts: ["word-count-over-time", "correlation-panel"] },
  "lag|sector":       { valid: true,  byLanguage: true,  byTime: false, charts: ["entry-timeline", "correlation-panel"] },
  "country|lag":      { valid: false, byLanguage: false, byTime: false, charts: [] },
  "sector|wordcount": { valid: true,  byLanguage: true,  byTime: false, charts: ["word-count-over-time", "correlation-panel"] },
  "country|wordcount":{ valid: true,  byLanguage: false, byTime: false, charts: ["word-count-over-time", "country-group"] },
  "country|sector":   { valid: true,  byLanguage: false, byTime: true,  charts: ["country-group", "sector-grouped-dist"] },
};

function getPairRule(a: string, b: string): PairRule {
  return PAIR_RULES[insightKey(a, b)] ?? { valid: false, byLanguage: false, byTime: false, charts: [] };
}

const PANEL_W = 296;

function getPanelPaddingTop(nodeId: string): number {
  const node = HEX_NODES.find(n => n.metricId === nodeId);
  if (!node) return 0;
  const renderedH = 432 * 390 / 360; // ≈ 468px
  const rawTop = (node.cy - 5) / 390 * renderedH - 60;
  return Math.max(0, Math.min(rawTop, renderedH - 220));
}

function DblRule() {
  return (
    <div>
      <div style={{ borderTop: "2px solid var(--t1)" }} />
      <div style={{ borderTop: "1px solid var(--border)", marginTop: 2 }} />
    </div>
  );
}

// ── HexPicker ──────────────────────────────────────────────────────────────
function HexPicker({ metricA, metricB, pendingA, compatibleIds, onNodeClick }: {
  metricA:       string;
  metricB:       string;
  pendingA:      string | null;
  compatibleIds: Set<string>;
  onNodeClick:   (id: string) => void;
}) {
  const nodeA = HEX_NODES.find(n => n.metricId === metricA)!;
  const nodeB = HEX_NODES.find(n => n.metricId === metricB)!;
  const mA    = METRICS.find(m => m.id === metricA)!;
  const mB    = METRICS.find(m => m.id === metricB)!;

  const CIRC_R = 34;
  const DIAM_H = 24;
  const SPRING = "cubic-bezier(0.34,1.56,0.64,1)";

  const pendingNode = pendingA ? HEX_NODES.find(n => n.metricId === pendingA) : null;

  return (
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

      {/* Hex outline */}
      {HEX_NODES.map((n, i) => {
        const next = HEX_NODES[(i + 1) % HEX_NODES.length];
        return <line key={i} x1={n.cx} y1={n.cy} x2={next.cx} y2={next.cy} stroke="var(--border)" strokeWidth={1} />;
      })}

      {/* Committed pair connector */}
      {!pendingA && (
        <>
          <line x1={nodeA.cx} y1={nodeA.cy} x2={nodeB.cx} y2={nodeB.cy}
            stroke="#B9B9B9" strokeWidth={1.5} strokeDasharray="4 3" />
          <line x1={nodeA.cx} y1={nodeA.cy} x2={200} y2={200}
            stroke="var(--t1)" strokeWidth={1.5} strokeDasharray="5 3" />
          <line x1={nodeB.cx} y1={nodeB.cy} x2={200} y2={200}
            stroke="var(--t1)" strokeWidth={1.5} strokeDasharray="5 3" />
        </>
      )}

      {/* Animated dashes from pendingA to each compatible node */}
      {pendingA && pendingNode && HEX_NODES.map(n => {
        if (!compatibleIds.has(n.metricId)) return null;
        return (
          <line key={n.metricId}
            x1={pendingNode.cx} y1={pendingNode.cy} x2={n.cx} y2={n.cy}
            stroke={LIME} strokeWidth={1.5} strokeDasharray="5 4"
            style={{ animation: "march 0.9s linear infinite" }} />
        );
      })}

      <polygon points="200,60 321,130 321,270 200,340 79,270 79,130"
        fill="url(#hexCloud)" style={{ pointerEvents: "none" }} />

      {HEX_NODES.map((node) => {
        const isA          = node.metricId === metricA;
        const isB          = node.metricId === metricB;
        const isPendingA   = node.metricId === pendingA;
        const isCompatible = compatibleIds.has(node.metricId);
        const isIncompat   = pendingA !== null && !isPendingA && !isCompatible;
        const metric       = METRICS.find(m => m.id === node.metricId)!;

        // When pendingA set: show diamond on pending node (acts as "about to be A")
        const showDiamond = isA && !pendingA || isPendingA;
        const showCircle  = isB && !pendingA;

        return (
          <g key={node.metricId} onClick={() => onNodeClick(node.metricId)}
            style={{ cursor: isIncompat ? "not-allowed" : "pointer", opacity: isIncompat ? 0.25 : 1, transition: "opacity 0.2s" }}>

            {/* Animated ring for compatible nodes */}
            {isCompatible && (
              <circle cx={node.cx} cy={node.cy} r={CIRC_R + 7}
                fill="none" stroke={LIME} strokeWidth={1.5}
                strokeDasharray="4 3"
                style={{ animation: "march 0.9s linear infinite", pointerEvents: "none" }} />
            )}

            <circle cx={node.cx} cy={node.cy} r={CIRC_R}
              fill={showCircle ? LIME : "var(--bg)"}
              stroke="var(--t1)" strokeWidth={showCircle ? 2.5 : 1.5}
              style={{
                opacity: showDiamond ? 0 : 1,
                transformOrigin: `${node.cx}px ${node.cy}px`,
                transform: showDiamond ? "scale(0.1)" : "scale(1)",
                transition: `opacity 0.3s ease, transform 0.45s ${SPRING}, fill 0.3s ease`,
              }}
            />

            <g transform={`rotate(45,${node.cx},${node.cy})`}>
              <rect x={node.cx - DIAM_H} y={node.cy - DIAM_H}
                width={DIAM_H * 2} height={DIAM_H * 2} rx={3}
                fill={SALMON} stroke="var(--t1)" strokeWidth={2}
                style={{
                  opacity: showDiamond ? 1 : 0,
                  transformOrigin: `${node.cx}px ${node.cy}px`,
                  transform: showDiamond ? "scale(1)" : "scale(0.1)",
                  transition: `opacity 0.3s ease, transform 0.45s ${SPRING}`,
                }} />
            </g>

            <text x={node.cx} y={node.cy + 4} textAnchor="middle"
              fontFamily={PDK} fontSize={10} fontWeight="600"
              fill={showDiamond ? "#fff" : showCircle ? "var(--t1)" : "var(--t2)"}
              style={{ pointerEvents: "none", transition: "fill 0.3s ease", userSelect: "none" }}>
              {metric.short}
            </text>
            <text x={node.cx} y={node.cy + 15} textAnchor="middle"
              fontFamily={QTC} fontSize={7} letterSpacing="0.5"
              fill={showDiamond ? "rgba(255,255,255,0.65)" : "var(--t2)"}
              style={{ pointerEvents: "none", userSelect: "none", transition: "fill 0.3s ease" }}>
              {metric.unit.toUpperCase()}
            </text>
          </g>
        );
      })}

      <circle cx={200} cy={205} r={48} fill="#EAE4D8" />
      <line x1={158} y1={193} x2={242} y2={193} stroke="var(--border)" strokeWidth={0.5} />
      <line x1={158} y1={215} x2={242} y2={215} stroke="var(--border)" strokeWidth={0.5} />
      <text x={200} y={183} textAnchor="middle" fontFamily={QTC} fontSize={13} fill={A_TEXT} letterSpacing="1.5">
        {pendingA ? METRICS.find(m => m.id === pendingA)!.short.toUpperCase() : mA.short.toUpperCase()}
      </text>
      <text x={200} y={208} textAnchor="middle" fontFamily={PF} fontStyle="italic" fontSize={13} fill="var(--t2)">
        {pendingA ? "→" : "by"}
      </text>
      <text x={200} y={228} textAnchor="middle" fontFamily={QTC} fontSize={13} fill={B_TEXT} letterSpacing="1.5">
        {pendingA ? "?" : mB.short.toUpperCase()}
      </text>
    </svg>
  );
}

// ── ScatterTooltip ─────────────────────────────────────────────────────────
function ScatterTooltip({ active, payload, mA, mB, mALabel, mBLabel }: {
  active?:   boolean;
  payload?:  Array<{ payload: { name: string; x: number; y: number } }>;
  mA:        Metric;
  mB:        Metric;
  mALabel:   string;
  mBLabel:   string;
}) {
  if (!active || !payload?.length) return null;
  const { name, x, y } = payload[0].payload;
  return (
    <div style={{
      background: "var(--bg)", border: "0.5px solid var(--border)",
      padding: "10px 14px", fontFamily: SS, fontSize: 13,
      lineHeight: 1.6, boxShadow: "2px 2px 0 var(--bg2)",
    }}>
      <p style={{ fontWeight: 600, color: "var(--t1)", marginBottom: 6, fontFamily: PFSC, fontSize: 12, letterSpacing: "0.03em" }}>
        {name}
      </p>
      <p style={{ color: "var(--t2)" }}>
        <span style={{ background: SALMON, color: "#fff", padding: "0 4px", fontFamily: QTC, fontSize: 10 }}>A</span>{" "}
        {mALabel}: <strong style={{ color: "var(--t1)" }}>{x} {mA.unit}</strong>
      </p>
      <p style={{ color: "var(--t2)" }}>
        <span style={{ background: LIME, color: "var(--t1)", padding: "0 4px", fontFamily: QTC, fontSize: 10 }}>B</span>{" "}
        {mBLabel}: <strong style={{ color: "var(--t1)" }}>{y} {mB.unit}</strong>
      </p>
    </div>
  );
}

// ── OutletCard ─────────────────────────────────────────────────────────────
function OutletCard({ outlet, mA, mB, vA, vB }: {
  outlet: ExtStat;
  mA:     Metric;
  mB:     Metric;
  vA:     number;
  vB:     number;
}) {
  const total = outlet.articleCount || 1;
  return (
    <div style={{ background: "var(--bg)", padding: "20px 16px" }}>
      <p style={{ fontFamily: PFSC, fontSize: 11, lineHeight: "15px", color: "var(--t1)", marginBottom: 8, wordBreak: "break-word", letterSpacing: "0.02em" }}>
        {outlet.name}
      </p>
      <p style={{ fontFamily: PF, fontSize: 32, lineHeight: "36px", color: "var(--t1)", marginBottom: 2 }}>
        {outlet.articleCount}
      </p>
      <p style={{ fontFamily: QTC, fontSize: 8, letterSpacing: "1.2", textTransform: "uppercase", color: "var(--t2)", marginBottom: 18 }}>
        articles
      </p>

      <p style={{ fontFamily: QTC, fontSize: 8, letterSpacing: "1", textTransform: "uppercase", color: "var(--t2)", marginBottom: 5 }}>Frames</p>
      <div style={{ display: "flex", height: 6, marginBottom: 14 }}>
        {FRAME_COLORS.map(({ frame, color }) => {
          const pct = (outlet.frameDist[frame] ?? 0) / total * 100;
          return pct > 0 ? (
            <div key={frame} title={`${frame}: ${outlet.frameDist[frame]}`}
              style={{ width: `${pct}%`, background: color, minWidth: 2 }} />
          ) : null;
        })}
      </div>

      <p style={{ fontFamily: QTC, fontSize: 8, letterSpacing: "1", textTransform: "uppercase", color: "var(--t2)", marginBottom: 5 }}>Stages</p>
      <div style={{ display: "flex", height: 4, marginBottom: 20 }}>
        {STAGE_COLORS.map(({ stage, color }) => {
          const pct = (outlet.stageDist[stage] ?? 0) / total * 100;
          return pct > 0 ? (
            <div key={stage} title={`${stage}: ${outlet.stageDist[stage]}`}
              style={{ width: `${pct}%`, background: color }} />
          ) : null;
        })}
      </div>

      {[
        { m: mA, v: vA, bg: SALMON, fg: "#fff" },
        { m: mB, v: vB, bg: LIME,   fg: "var(--t1)" },
      ].map(({ m, v, bg, fg }) => (
        <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontFamily: QTC, fontSize: 8, letterSpacing: "0.8", textTransform: "uppercase", color: "var(--t2)" }}>
            {m.short}
          </span>
          <span style={{ fontFamily: PDK, fontSize: 12, background: bg, color: fg, padding: "1px 6px" }}>
            {v}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── CountryGroupChart ──────────────────────────────────────────────────────
function CountryGroupChart({ stats, mA, mB, metricAParam, metricBParam }: {
  stats:        ExtStat[];
  mA:           Metric;
  mB:           Metric;
  metricAParam: MetricParam;
  metricBParam: MetricParam;
}) {
  const [hovOutlet, setHovOutlet] = useState<string | null>(null);

  const isCountryA = mA.id === "country";
  const contMetric = isCountryA ? mB : mA;
  const contParam  = isCountryA ? metricBParam : metricAParam;

  const byCountry: Record<string, ExtStat[]> = {};
  for (const o of stats) {
    const key = o.outletCountry || "—";
    byCountry[key] = [...(byCountry[key] ?? []), o];
  }

  const barData = Object.entries(byCountry).map(([country, outlets]) => {
    const vals = outlets.map(o => resolveValue(contMetric, o, contParam));
    const mean = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    return { country, mean, items: outlets.map((o, i) => ({ name: o.name, value: vals[i] })) };
  }).sort((a, b) => b.mean - a.mean);

  const maxVal = Math.max(...barData.flatMap(g => g.items.map(o => o.value)), 1);
  const hovItem = barData.flatMap(g => g.items).find(i => i.name === hovOutlet);

  return (
    <div style={{ border: "1px solid var(--border)", padding: "20px 24px" }}>
      <p style={{ fontFamily: QTC, fontSize: 9, letterSpacing: "1.2", textTransform: "uppercase", color: "var(--t2)", marginBottom: 6 }}>
        Country of origin vs {contMetric.label}
      </p>
      <div style={{ height: 18, marginBottom: 12 }}>
        {hovItem
          ? <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--t1)", fontWeight: 600 }}>
              {hovItem.name} — {hovItem.value} {contMetric.unit}
            </span>
          : <span style={{ fontFamily: PF, fontStyle: "italic", fontSize: 13, color: "var(--t2)" }}>
              Bar = country mean · hover dots for outlet detail
            </span>
        }
      </div>
      {barData.map(g => (
        <div key={g.country} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: QTC, fontSize: 10, letterSpacing: "1", color: "var(--t2)", width: 36, textAlign: "right", flexShrink: 0 }}>
              {g.country}
            </span>
            <div style={{ flex: 1, position: "relative", height: 20 }}>
              <div style={{
                position: "absolute", left: 0, top: 6, height: 8,
                background: "var(--t2)", opacity: 0.18,
                width: `${g.mean / maxVal * 100}%`,
              }} />
              {g.items.map(item => (
                <div key={item.name}
                  onMouseEnter={() => setHovOutlet(item.name)}
                  onMouseLeave={() => setHovOutlet(null)}
                  style={{
                    position: "absolute", top: 4,
                    left: `${item.value / maxVal * 100}%`,
                    width: hovOutlet === item.name ? 12 : 8,
                    height: hovOutlet === item.name ? 12 : 8,
                    marginTop: hovOutlet === item.name ? -2 : 0,
                    borderRadius: "50%",
                    background: hovOutlet && hovOutlet !== item.name ? "var(--t2)" : "var(--t1)",
                    transform: "translateX(-50%)",
                    cursor: "pointer",
                    transition: "width 0.1s, height 0.1s, background 0.1s",
                  }} />
              ))}
            </div>
            <span style={{ fontFamily: PDK, fontSize: 12, color: "var(--t1)", width: 80, textAlign: "left", flexShrink: 0 }}>
              {g.mean}{" "}
              <span style={{ fontFamily: QTC, fontSize: 8, color: "var(--t2)" }}>{contMetric.unit}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── CorrelationPanel ───────────────────────────────────────────────────────
function CorrelationPanel({ scatterData, reg, mA, mB, mALabel, mBLabel }: {
  scatterData: { name: string; x: number; y: number }[];
  reg:         { slope: number; int: number; r: number } | null;
  mA:          Metric;
  mB:          Metric;
  mALabel:     string;
  mBLabel:     string;
}) {
  const [hovRow, setHovRow] = useState<string | null>(null);

  if (!reg || scatterData.length < 3) return null;

  const absR      = Math.abs(reg.r);
  const strength  = absR < 0.3 ? "weak" : absR < 0.6 ? "moderate" : "strong";
  const direction = reg.r >= 0 ? "positive" : "negative";

  const residuals = [...scatterData]
    .map(p => ({ name: p.name, residual: p.y - (reg.slope * p.x + reg.int) }))
    .sort((a, b) => b.residual - a.residual);

  const halfN = Math.min(3, Math.ceil(residuals.length / 2));
  const above = residuals.slice(0, halfN);
  const below = residuals.slice(-halfN).reverse();

  const hovPt    = hovRow ? scatterData.find(p => p.name === hovRow) : null;

  return (
    <div style={{ border: "1px solid var(--border)", padding: "20px 24px" }}>
      <p style={{ fontFamily: QTC, fontSize: 9, letterSpacing: "1.2", textTransform: "uppercase", color: "var(--t2)", marginBottom: 12 }}>
        Correlation · {mALabel} vs {mBLabel}
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
        <span style={{ fontFamily: PF, fontSize: 36, color: "var(--t1)", lineHeight: 1 }}>
          r = {reg.r.toFixed(2)}
        </span>
        <span style={{ fontFamily: SS, fontStyle: "italic", fontSize: 14, color: "var(--t2)" }}>
          {strength} {direction} correlation
        </span>
      </div>
      <div style={{ height: 20, marginBottom: 12 }}>
        {hovPt
          ? <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--t1)", fontWeight: 600 }}>
              {hovPt.name} — {mA.short}: {hovPt.x} · {mB.short}: {hovPt.y}
            </span>
          : <p style={{ fontFamily: SS, fontSize: 13, color: "var(--t2)", lineHeight: 1.5 }}>
              {absR < 0.3
                ? `No clear linear relationship between ${mA.short} and ${mB.short} across these outlets.`
                : `Outlets with higher ${mA.short} tend to have ${reg.r > 0 ? "higher" : "lower"} ${mB.short}.`
              }
            </p>
        }
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <p style={{ fontFamily: QTC, fontSize: 8, letterSpacing: "1", textTransform: "uppercase", color: "var(--green-d)", marginBottom: 8 }}>
            Over-index on {mB.short}
          </p>
          {above.map(r => (
            <div key={r.name}
              onMouseEnter={() => setHovRow(r.name)}
              onMouseLeave={() => setHovRow(null)}
              style={{ display: "flex", justifyContent: "space-between", marginBottom: 4,
                cursor: "pointer",
                opacity: hovRow && hovRow !== r.name ? 0.35 : 1,
                transition: "opacity 0.12s" }}>
              <span style={{ fontFamily: SS, fontSize: 12, color: "var(--t1)" }}>{r.name}</span>
              <span style={{ fontFamily: QTC, fontSize: 10, color: "var(--green-d)" }}>+{Math.abs(r.residual).toFixed(1)}</span>
            </div>
          ))}
        </div>
        <div>
          <p style={{ fontFamily: QTC, fontSize: 8, letterSpacing: "1", textTransform: "uppercase", color: "var(--red)", marginBottom: 8 }}>
            Under-index on {mB.short}
          </p>
          {below.map(r => (
            <div key={r.name}
              onMouseEnter={() => setHovRow(r.name)}
              onMouseLeave={() => setHovRow(null)}
              style={{ display: "flex", justifyContent: "space-between", marginBottom: 4,
                cursor: "pointer",
                opacity: hovRow && hovRow !== r.name ? 0.35 : 1,
                transition: "opacity 0.12s" }}>
              <span style={{ fontFamily: SS, fontSize: 12, color: "var(--t1)" }}>{r.name}</span>
              <span style={{ fontFamily: QTC, fontSize: 10, color: "var(--red)" }}>−{Math.abs(r.residual).toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── FrameDistributionChart ─────────────────────────────────────────────────
function FrameDistributionChart({ stats }: { stats: ExtStat[] }) {
  const [hovFrame,  setHovFrame]  = useState<Frame | null>(null);
  const [hovOutlet, setHovOutlet] = useState<string | null>(null);

  const hovStat = hovOutlet ? stats.find(o => o.name === hovOutlet) : null;
  const hovPct  = hovStat && hovFrame
    ? Math.round((hovStat.frameDist[hovFrame] ?? 0) / (hovStat.articleCount || 1) * 100)
    : 0;

  return (
    <div style={{ border: "1px solid var(--border)", padding: "20px 24px" }}>
      <p style={{ fontFamily: QTC, fontSize: 9, letterSpacing: "1.2", textTransform: "uppercase", color: "var(--t2)", marginBottom: 6 }}>
        Frame breakdown by outlet
      </p>
      <div style={{ height: 20, marginBottom: 12 }}>
        {hovFrame && hovOutlet
          ? <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--t1)", fontWeight: 600 }}>
              {hovOutlet} · {hovFrame}: {hovPct}%
            </span>
          : <span style={{ fontFamily: PF, fontStyle: "italic", fontSize: 13, color: "var(--t2)" }}>
              Hover segments for outlet × frame detail
            </span>
        }
      </div>
      {stats.slice(0, 5).map(o => {
        const total = o.articleCount || 1;
        return (
          <div key={o.id} style={{ marginBottom: 12 }}>
            <p style={{ fontFamily: SANS, fontSize: 10, color: "var(--t2)", marginBottom: 4 }}>{o.name}</p>
            <div style={{ display: "flex", height: 8 }}>
              {FRAME_COLORS.map(({ frame, color }) => {
                const pct = (o.frameDist[frame] ?? 0) / total * 100;
                return pct > 0 ? (
                  <div key={frame}
                    onMouseEnter={() => { setHovFrame(frame); setHovOutlet(o.name); }}
                    onMouseLeave={() => { setHovFrame(null);  setHovOutlet(null); }}
                    style={{
                      width: `${pct}%`, background: color, minWidth: 2, cursor: "pointer",
                      opacity: hovFrame && hovFrame !== frame ? 0.2 : 1,
                      transition: "opacity 0.12s",
                    }} />
                ) : null;
              })}
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 12 }}>
        {FRAME_COLORS.map(({ frame, color }) => (
          <div key={frame}
            onMouseEnter={() => setHovFrame(frame)}
            onMouseLeave={() => setHovFrame(null)}
            style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
              opacity: hovFrame && hovFrame !== frame ? 0.35 : 1, transition: "opacity 0.12s" }}>
            <div style={{ width: 8, height: 8, background: color, flexShrink: 0 }} />
            <span style={{ fontFamily: SS, fontSize: 10, color: "var(--t2)" }}>{frame}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AngleDistributionChart ─────────────────────────────────────────────────
function AngleDistributionChart({ stats }: { stats: ExtStat[] }) {
  const [hovAngle,  setHovAngle]  = useState<Angle | null>(null);
  const [hovOutlet, setHovOutlet] = useState<string | null>(null);
  const angleEntries = Object.entries(ANGLE_COLORS) as [Angle, string][];

  const hovStat = hovOutlet ? stats.find(o => o.name === hovOutlet) : null;
  const hovPct  = hovStat && hovAngle
    ? Math.round((hovStat.angleDist[hovAngle] ?? 0) / (hovStat.articleCount || 1) * 100)
    : 0;

  return (
    <div style={{ border: "1px solid var(--border)", padding: "20px 24px" }}>
      <p style={{ fontFamily: QTC, fontSize: 9, letterSpacing: "1.2", textTransform: "uppercase", color: "var(--t2)", marginBottom: 6 }}>
        Angle breakdown by outlet
      </p>
      <div style={{ height: 20, marginBottom: 12 }}>
        {hovAngle && hovOutlet
          ? <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--t1)", fontWeight: 600 }}>
              {hovOutlet} · {hovAngle}: {hovPct}%
            </span>
          : <span style={{ fontFamily: PF, fontStyle: "italic", fontSize: 13, color: "var(--t2)" }}>
              Hover segments for outlet × angle detail
            </span>
        }
      </div>
      {stats.slice(0, 5).map(o => {
        const total = o.articleCount || 1;
        return (
          <div key={o.id} style={{ marginBottom: 12 }}>
            <p style={{ fontFamily: SANS, fontSize: 10, color: "var(--t2)", marginBottom: 4 }}>{o.name}</p>
            <div style={{ display: "flex", height: 8 }}>
              {angleEntries.map(([angle, color]) => {
                const pct = (o.angleDist[angle] ?? 0) / total * 100;
                return pct > 0 ? (
                  <div key={angle}
                    onMouseEnter={() => { setHovAngle(angle); setHovOutlet(o.name); }}
                    onMouseLeave={() => { setHovAngle(null);  setHovOutlet(null); }}
                    style={{
                      width: `${pct}%`, background: color, cursor: "pointer",
                      opacity: hovAngle && hovAngle !== angle ? 0.2 : 1,
                      transition: "opacity 0.12s",
                    }} />
                ) : null;
              })}
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 12 }}>
        {angleEntries.map(([angle, color]) => (
          <div key={angle}
            onMouseEnter={() => setHovAngle(angle)}
            onMouseLeave={() => setHovAngle(null)}
            style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
              opacity: hovAngle && hovAngle !== angle ? 0.35 : 1, transition: "opacity 0.12s" }}>
            <div style={{ width: 8, height: 8, background: color, flexShrink: 0 }} />
            <span style={{ fontFamily: SS, fontSize: 10, color: "var(--t2)" }}>{angle}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── timeline helpers ───────────────────────────────────────────────────────

const TIMELINE_MAX = 12;

function trimForTimeline(stats: ExtStat[]): { trimmed: ExtStat[]; wasTrimmed: boolean } {
  if (stats.length <= TIMELINE_MAX) return { trimmed: stats, wasTrimmed: false };
  const sorted = [...stats].sort((a, b) => a.lagDays - b.lagDays);
  const half   = Math.floor(TIMELINE_MAX / 2);
  const picked = [...sorted.slice(0, half), ...sorted.slice(-half)];
  const seen   = new Set<string>();
  const unique = picked.filter(o => seen.has(o.id) ? false : (seen.add(o.id), true));
  return { trimmed: unique.sort((a, b) => a.lagDays - b.lagDays), wasTrimmed: true };
}

// ── EntryTimelineChart ─────────────────────────────────────────────────────

function EntryTimelineChart({ stats }: { stats: ExtStat[] }) {
  const [hovOutlet, setHovOutlet] = useState<string | null>(null);

  const { trimmed, wasTrimmed } = trimForTimeline(stats);
  const minLag     = Math.min(...trimmed.map(o => o.lagDays));
  const rebased    = trimmed.map(o => ({ ...o, lag: o.lagDays - minLag }));
  const maxLagDays = Math.max(...rebased.map(o => o.lag), 1);
  const spreadMo   = maxLagDays / MONTHS;
  const LABEL_W    = 130;
  const PLOT_W     = 320;
  const ROW_H      = 28;
  const H          = trimmed.length * ROW_H + 28;

  if (spreadMo < 1) {
    return (
      <div style={{ border: "1px solid var(--border)", padding: "20px 24px" }}>
        <p style={{ fontFamily: QTC, fontSize: 9, letterSpacing: "1.2", textTransform: "uppercase", color: "var(--t2)", marginBottom: 12 }}>
          Entry timing
        </p>
        <p style={{ fontFamily: PF, fontStyle: "italic", fontSize: 14, color: "var(--t2)" }}>
          All selected outlets entered coverage within the same month — no temporal spread to plot.
        </p>
        <div style={{ marginTop: 14 }}>
          {rebased.map(o => (
            <div key={o.id}
              onMouseEnter={() => setHovOutlet(o.name)}
              onMouseLeave={() => setHovOutlet(null)}
              style={{ display: "flex", justifyContent: "space-between", marginBottom: 6,
                cursor: "pointer",
                opacity: hovOutlet && hovOutlet !== o.name ? 0.35 : 1,
                transition: "opacity 0.12s",
              }}>
              <span style={{ fontFamily: SANS, fontSize: 11, color: "var(--t2)" }}>{o.name}</span>
              <span style={{ fontFamily: PDK, fontSize: 11, color: "var(--t1)" }}>+{o.lag}d</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hovItem = hovOutlet ? rebased.find(o => o.name === hovOutlet) : null;

  return (
    <div style={{ border: "1px solid var(--border)", padding: "20px 24px" }}>
      <p style={{ fontFamily: QTC, fontSize: 9, letterSpacing: "1.2", textTransform: "uppercase", color: "var(--t2)", marginBottom: 6 }}>
        Entry timing — months from first outlet
        {wasTrimmed && (
          <span style={{ marginLeft: 8, fontFamily: SANS, fontSize: 9, color: "var(--t2)", fontWeight: 400, letterSpacing: 0 }}>
            · earliest & latest {TIMELINE_MAX / 2} of {stats.length} — use outlet filter to focus
          </span>
        )}
      </p>
      <div style={{ height: 20, marginBottom: 10 }}>
        {hovItem
          ? <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--t1)", fontWeight: 600 }}>
              {hovItem.name} — +{Math.round(hovItem.lag / MONTHS)}m
            </span>
          : <span style={{ fontFamily: PF, fontStyle: "italic", fontSize: 13, color: "var(--t2)" }}>
              Hover dots for outlet detail
            </span>
        }
      </div>
      <svg viewBox={`0 0 ${LABEL_W + PLOT_W + 40} ${H}`} width="100%"
        style={{ display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const x = LABEL_W + t * PLOT_W;
          return (
            <g key={t}>
              <line x1={x} x2={x} y1={0} y2={H - 20} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2 4" />
              <text x={x} y={H - 6} textAnchor="middle" fontFamily={QTC} fontSize={7} fill="var(--t2)">
                {Math.round(t * maxLagDays / MONTHS)}m
              </text>
            </g>
          );
        })}
        {rebased.map((o, i) => {
          const x      = LABEL_W + (o.lag / maxLagDays) * PLOT_W;
          const y      = i * ROW_H + 14;
          const isHov  = hovOutlet === o.name;
          const faded  = hovOutlet && !isHov;
          return (
            <g key={o.id} style={{ cursor: "pointer", opacity: faded ? 0.3 : 1, transition: "opacity 0.12s" }}
              onMouseEnter={() => setHovOutlet(o.name)}
              onMouseLeave={() => setHovOutlet(null)}>
              <text x={LABEL_W - 8} y={y + 4} textAnchor="end" fontFamily={SANS} fontSize={9}
                fill={isHov ? "var(--t1)" : "var(--t2)"}>
                {o.name.length > 17 ? o.name.slice(0, 15) + "…" : o.name}
              </text>
              <line x1={LABEL_W} x2={LABEL_W + PLOT_W} y1={y} y2={y}
                stroke="var(--border)" strokeWidth={0.5} />
              <circle cx={x} cy={y} r={isHov ? 6 : 4} fill="var(--t1)"
                style={{ transition: "r 0.1s" }} />
              <text x={x + 9} y={y + 4} fontFamily={QTC} fontSize={7} fill="var(--t2)">
                {Math.round(o.lag / MONTHS)}m
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── CrossTabHeatmap ────────────────────────────────────────────────────────
function CrossTabHeatmap({ articles }: { articles: Article[] }) {
  const [hovAngle, setHovAngle] = useState<Angle | null>(null);
  const [hovFrame, setHovFrame] = useState<Frame | null>(null);

  const matrix: Partial<Record<Angle, Partial<Record<Frame, number>>>> = {};
  for (const a of articles) {
    if (!a.primaryAngle || !a.primaryFrame) continue;
    matrix[a.primaryAngle] ??= {};
    matrix[a.primaryAngle]![a.primaryFrame] = (matrix[a.primaryAngle]![a.primaryFrame] ?? 0) + 1;
  }

  const frameAbbr: Record<Frame, string> = {
    "Attribution of Responsibility": "Attr",
    "Human Interest":                "Human",
    "Conflict":                      "Conflict",
    "Morality":                      "Moral",
    "Economic Consequences":         "Econ",
  };

  const hovRow    = hovAngle ? matrix[hovAngle] ?? {} : null;
  const hovCount  = hovAngle && hovFrame ? (hovRow?.[hovFrame] ?? 0) : null;
  const hovTotal  = hovRow ? Object.values(hovRow).reduce((s, v) => s + v, 0) : 0;
  const hovPct    = hovCount != null && hovTotal > 0 ? Math.round(hovCount / hovTotal * 100) : null;

  return (
    <div style={{ border: "1px solid var(--border)", padding: "20px 24px" }}>
      <p style={{ fontFamily: QTC, fontSize: 9, letterSpacing: "1.2", textTransform: "uppercase", color: "var(--t2)", marginBottom: 4 }}>
        Angle × Frame co-occurrence
      </p>
      <div style={{ height: 22, marginBottom: 10 }}>
        {hovAngle && hovFrame && hovPct != null
          ? <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--t1)", fontWeight: 600 }}>
              {hovAngle} × {hovFrame}: {hovPct}%
            </span>
          : hovAngle
            ? <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--t1)" }}>
                {hovAngle} — hover a cell to see %
              </span>
            : <span style={{ fontFamily: PF, fontStyle: "italic", fontSize: 13, color: "var(--t2)" }}>
                Row % — when journalists use this angle, which frame do they reach for?
              </span>
        }
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 480 }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px repeat(5, 1fr)", gap: 2, marginBottom: 2 }}>
            <div />
            {FRAMES.map(f => (
              <div key={f} style={{
                fontFamily: QTC, fontSize: 8, letterSpacing: "0.5", textTransform: "uppercase",
                color: hovFrame === f ? "var(--t1)" : "var(--t2)", textAlign: "center", padding: "4px 0",
                transition: "color 0.12s",
              }}>
                {frameAbbr[f]}
              </div>
            ))}
          </div>
          {ANGLES.map(angle => {
            const row      = matrix[angle] ?? {};
            const rowTotal = Object.values(row).reduce((s, v) => s + v, 0);
            return (
              <div key={angle}
                onMouseEnter={() => setHovAngle(angle)}
                onMouseLeave={() => setHovAngle(null)}
                style={{
                  display: "grid", gridTemplateColumns: "120px repeat(5, 1fr)", gap: 2, marginBottom: 2,
                  cursor: "pointer",
                  opacity: hovAngle && hovAngle !== angle ? 0.35 : 1,
                  transition: "opacity 0.12s",
                }}>
                <div style={{ fontFamily: SANS, fontSize: 10, color: "var(--t2)", display: "flex", alignItems: "center", paddingRight: 8 }}>
                  {angle}
                </div>
                {FRAMES.map(frame => {
                  const count = row[frame] ?? 0;
                  const pct   = rowTotal > 0 ? Math.round(count / rowTotal * 100) : 0;
                  return (
                    <div key={frame}
                      onMouseEnter={() => setHovFrame(frame)}
                      onMouseLeave={() => setHovFrame(null)}
                      style={{
                        height: 32,
                        background: `rgba(var(--t1-rgb, 30,26,20), ${pct / 100 * 0.85 + 0.04})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        outline: hovFrame === frame ? "1px solid var(--t2)" : "none",
                      }}>
                      {pct > 5 && (
                        <span style={{ fontFamily: QTC, fontSize: 9, color: pct > 40 ? "var(--bg)" : "var(--t1)" }}>
                          {pct}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── CountryStackedDistChart ────────────────────────────────────────────────
function CountryStackedDistChart({ stats, mA, mB }: {
  stats: ExtStat[];
  mA:    Metric;
  mB:    Metric;
}) {
  const [hovSeg, setHovSeg] = useState<string | null>(null); // "{country}:{label}"

  const nonCountry = mA.id === "country" ? mB : mA;
  const useFrames  = nonCountry.id === "frame";
  const useAngles  = nonCountry.id === "angle";

  const byCountry: Record<string, ExtStat[]> = {};
  for (const o of stats) {
    const key = o.outletCountry || "—";
    byCountry[key] = [...(byCountry[key] ?? []), o];
  }

  const hovInfo = hovSeg ? (() => {
    const [country, label] = hovSeg.split(":");
    return { country, label };
  })() : null;

  return (
    <div style={{ border: "1px solid var(--border)", padding: "20px 24px" }}>
      <p style={{ fontFamily: QTC, fontSize: 9, letterSpacing: "1.2", textTransform: "uppercase", color: "var(--t2)", marginBottom: 4 }}>
        {nonCountry.label} breakdown by country
      </p>
      <div style={{ height: 22, marginBottom: 10 }}>
        {hovInfo
          ? <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--t1)", fontWeight: 600 }}>
              {hovInfo.country} · {hovInfo.label}
            </span>
          : <span style={{ fontFamily: PF, fontStyle: "italic", fontSize: 13, color: "var(--t2)" }}>
              Does country of origin shape which {useFrames ? "frames" : "angles"} dominate?
            </span>
        }
      </div>
      {Object.entries(byCountry).map(([country, outlets]) => {
        const total = outlets.reduce((s, o) => s + o.articleCount, 0) || 1;
        if (useFrames) {
          const combined: Partial<Record<Frame, number>> = {};
          for (const o of outlets) for (const [f, c] of Object.entries(o.frameDist)) {
            combined[f as Frame] = (combined[f as Frame] ?? 0) + (c ?? 0);
          }
          return (
            <div key={country} style={{ marginBottom: 14 }}>
              <span style={{ fontFamily: QTC, fontSize: 10, letterSpacing: "1", color: "var(--t2)", display: "block", marginBottom: 4 }}>{country}</span>
              <div style={{ display: "flex", height: 12 }}>
                {FRAME_COLORS.map(({ frame, color }) => {
                  const pct = (combined[frame] ?? 0) / total * 100;
                  const segKey = `${country}:${frame}`;
                  return pct > 0 ? (
                    <div key={frame}
                      onMouseEnter={() => setHovSeg(segKey)}
                      onMouseLeave={() => setHovSeg(null)}
                      style={{
                        width: `${pct}%`, background: color, cursor: "pointer",
                        opacity: hovSeg && hovSeg !== segKey ? 0.25 : 1,
                        transition: "opacity 0.12s",
                      }} />
                  ) : null;
                })}
              </div>
            </div>
          );
        }
        if (useAngles) {
          const combined: Partial<Record<Angle, number>> = {};
          for (const o of outlets) for (const [a, c] of Object.entries(o.angleDist)) {
            combined[a as Angle] = (combined[a as Angle] ?? 0) + (c ?? 0);
          }
          return (
            <div key={country} style={{ marginBottom: 14 }}>
              <span style={{ fontFamily: QTC, fontSize: 10, letterSpacing: "1", color: "var(--t2)", display: "block", marginBottom: 4 }}>{country}</span>
              <div style={{ display: "flex", height: 12 }}>
                {(Object.entries(ANGLE_COLORS) as [Angle, string][]).map(([angle, color]) => {
                  const pct = (combined[angle] ?? 0) / total * 100;
                  const segKey = `${country}:${angle}`;
                  return pct > 0 ? (
                    <div key={angle}
                      onMouseEnter={() => setHovSeg(segKey)}
                      onMouseLeave={() => setHovSeg(null)}
                      style={{
                        width: `${pct}%`, background: color, cursor: "pointer",
                        opacity: hovSeg && hovSeg !== segKey ? 0.25 : 1,
                        transition: "opacity 0.12s",
                      }} />
                  ) : null;
                })}
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

// ── TimelineByFrameChart / TimelineByAngleChart ────────────────────────────
function ColoredEntryTimeline({ stats, colorBy }: { stats: ExtStat[]; colorBy: "frame" | "angle" }) {
  const [hovOutlet, setHovOutlet] = useState<string | null>(null);

  const { trimmed, wasTrimmed } = trimForTimeline(stats);
  const minLag     = Math.min(...trimmed.map(o => o.lagDays));
  const rebased    = trimmed.map(o => ({ ...o, lag: o.lagDays - minLag }));
  const maxLagDays = Math.max(...rebased.map(o => o.lag), 1);
  const spreadMo   = maxLagDays / MONTHS;
  const LABEL_W    = 130;
  const PLOT_W     = 320;
  const ROW_H      = 28;
  const H          = trimmed.length * ROW_H + 28;

  function getDotColor(o: ExtStat) {
    if (colorBy === "frame") {
      const dom = Object.entries(o.frameDist).sort((a, b) => b[1] - a[1])[0]?.[0] as Frame | undefined;
      return dom ? (FRAME_COLORS.find(f => f.frame === dom)?.color ?? "var(--t2)") : "var(--t2)";
    }
    const dom = Object.entries(o.angleDist).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] as Angle | undefined;
    return dom ? (ANGLE_COLORS[dom] ?? "var(--t2)") : "var(--t2)";
  }

  if (spreadMo < 1) {
    return (
      <div style={{ border: "1px solid var(--border)", padding: "20px 24px" }}>
        <p style={{ fontFamily: QTC, fontSize: 9, letterSpacing: "1.2", textTransform: "uppercase", color: "var(--t2)", marginBottom: 12 }}>
          Entry timing — colored by dominant {colorBy}
        </p>
        <p style={{ fontFamily: PF, fontStyle: "italic", fontSize: 14, color: "var(--t2)" }}>
          All selected outlets entered coverage within the same month — no temporal spread to compare.
        </p>
        <div style={{ marginTop: 14 }}>
          {rebased.map(o => (
            <div key={o.id}
              onMouseEnter={() => setHovOutlet(o.name)}
              onMouseLeave={() => setHovOutlet(null)}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
                cursor: "pointer",
                opacity: hovOutlet && hovOutlet !== o.name ? 0.35 : 1,
                transition: "opacity 0.12s",
              }}>
              <div style={{ width: hovOutlet === o.name ? 12 : 10, height: hovOutlet === o.name ? 12 : 10,
                borderRadius: "50%", background: getDotColor(o), flexShrink: 0, transition: "width 0.1s, height 0.1s" }} />
              <span style={{ fontFamily: SANS, fontSize: 11, color: "var(--t2)" }}>{o.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hovItem = hovOutlet ? rebased.find(o => o.name === hovOutlet) : null;

  return (
    <div style={{ border: "1px solid var(--border)", padding: "20px 24px" }}>
      <p style={{ fontFamily: QTC, fontSize: 9, letterSpacing: "1.2", textTransform: "uppercase", color: "var(--t2)", marginBottom: 6 }}>
        Entry timing — colored by dominant {colorBy}
        {wasTrimmed && (
          <span style={{ marginLeft: 8, fontFamily: SANS, fontSize: 9, color: "var(--t2)", fontWeight: 400, letterSpacing: 0 }}>
            · earliest & latest {TIMELINE_MAX / 2} of {stats.length} — use outlet filter to focus
          </span>
        )}
      </p>
      <div style={{ height: 20, marginBottom: 8 }}>
        {hovItem
          ? <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--t1)", fontWeight: 600 }}>
              {hovItem.name} — +{Math.round(hovItem.lag / MONTHS)}m
            </span>
          : <span style={{ fontFamily: PF, fontStyle: "italic", fontSize: 13, color: "var(--t2)" }}>
              Did late-entering outlets have a different {colorBy} profile?
            </span>
        }
      </div>
      <svg viewBox={`0 0 ${LABEL_W + PLOT_W + 40} ${H}`} width="100%" style={{ display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const x = LABEL_W + t * PLOT_W;
          return (
            <g key={t}>
              <line x1={x} x2={x} y1={0} y2={H - 20} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2 4" />
              <text x={x} y={H - 6} textAnchor="middle" fontFamily={QTC} fontSize={7} fill="var(--t2)">
                {Math.round(t * maxLagDays / MONTHS)}m
              </text>
            </g>
          );
        })}
        {rebased.map((o, i) => {
          const x        = LABEL_W + (o.lag / maxLagDays) * PLOT_W;
          const y        = i * ROW_H + 14;
          const dotColor = getDotColor(o);
          const isHov    = hovOutlet === o.name;
          const faded    = hovOutlet && !isHov;
          return (
            <g key={o.id} style={{ cursor: "pointer", opacity: faded ? 0.3 : 1, transition: "opacity 0.12s" }}
              onMouseEnter={() => setHovOutlet(o.name)}
              onMouseLeave={() => setHovOutlet(null)}>
              <text x={LABEL_W - 8} y={y + 4} textAnchor="end" fontFamily={SANS} fontSize={9}
                fill={isHov ? "var(--t1)" : "var(--t2)"}>
                {o.name.length > 17 ? o.name.slice(0, 15) + "…" : o.name}
              </text>
              <line x1={LABEL_W} x2={LABEL_W + PLOT_W} y1={y} y2={y} stroke="var(--border)" strokeWidth={0.5} />
              <circle cx={x} cy={y} r={isHov ? 7 : 5} fill={dotColor}
                style={{ transition: "r 0.1s" }} />
              <text x={x + 10} y={y + 4} fontFamily={QTC} fontSize={7} fill="var(--t2)">{Math.round(o.lag / MONTHS)}m</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 8 }}>
        {colorBy === "frame"
          ? FRAME_COLORS.map(({ frame, color }) => (
              <div key={frame} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontFamily: SS, fontSize: 10, color: "var(--t2)" }}>{frame}</span>
              </div>
            ))
          : (Object.entries(ANGLE_COLORS) as [Angle, string][]).map(([angle, color]) => (
              <div key={angle} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ fontFamily: SS, fontSize: 10, color: "var(--t2)" }}>{angle}</span>
              </div>
            ))
        }
      </div>
    </div>
  );
}

// ── WordDistByGroupChart ───────────────────────────────────────────────────
function WordDistByGroupChart({ articles, mA, mB }: {
  articles: Article[];
  mA:       Metric;
  mB:       Metric;
}) {
  const [hovLabel, setHovLabel] = useState<string | null>(null);

  const groupMetric = mA.id === "wordcount" ? mB : mA;

  type GroupEntry = { label: string; avg: number; color: string };
  let barData: GroupEntry[] = [];

  if (groupMetric.id === "frame") {
    const byFrame: Partial<Record<Frame, number[]>> = {};
    for (const a of articles) {
      if (a.primaryFrame) {
        byFrame[a.primaryFrame] ??= [];
        byFrame[a.primaryFrame]!.push(a.wordCount);
      }
    }
    barData = (Object.entries(byFrame) as [Frame, number[]][]).map(([frame, words]) => ({
      label: frame,
      avg:   Math.round(words.reduce((s, w) => s + w, 0) / words.length),
      color: FRAME_COLORS.find(f => f.frame === frame)?.color ?? "var(--t2)",
    }));
  } else if (groupMetric.id === "angle") {
    const byAngle: Partial<Record<Angle, number[]>> = {};
    for (const a of articles) {
      if (a.primaryAngle) {
        byAngle[a.primaryAngle] ??= [];
        byAngle[a.primaryAngle]!.push(a.wordCount);
      }
    }
    barData = (Object.entries(byAngle) as [Angle, number[]][]).map(([angle, words]) => ({
      label: angle,
      avg:   Math.round(words.reduce((s, w) => s + w, 0) / words.length),
      color: ANGLE_COLORS[angle],
    }));
  } else if (groupMetric.id === "sector") {
    const bySector: Record<string, number[]> = {};
    for (const a of articles) {
      if (a.sector) {
        bySector[a.sector] ??= [];
        bySector[a.sector].push(a.wordCount);
      }
    }
    barData = Object.entries(bySector).map(([sector, words]) => ({
      label: sector,
      avg:   Math.round(words.reduce((s, w) => s + w, 0) / words.length),
      color: "var(--t2)",
    }));
  }

  barData.sort((a, b) => b.avg - a.avg);
  const maxAvg   = Math.max(...barData.map(d => d.avg), 1);
  const hovEntry = hovLabel ? barData.find(d => d.label === hovLabel) : null;

  return (
    <div style={{ border: "1px solid var(--border)", padding: "20px 24px" }}>
      <p style={{ fontFamily: QTC, fontSize: 9, letterSpacing: "1.2", textTransform: "uppercase", color: "var(--t2)", marginBottom: 4 }}>
        Avg. word count by {groupMetric.short}
      </p>
      <div style={{ height: 22, marginBottom: 10 }}>
        {hovEntry
          ? <span style={{ fontFamily: SANS, fontSize: 12, color: hovEntry.color === "var(--t2)" ? "var(--t1)" : hovEntry.color, fontWeight: 600 }}>
              {hovEntry.label} — {hovEntry.avg.toLocaleString()} words avg
            </span>
          : <span style={{ fontFamily: PF, fontStyle: "italic", fontSize: 13, color: "var(--t2)" }}>
              Do articles about certain {groupMetric.short.toLowerCase()}s tend to be longer?
            </span>
        }
      </div>
      {barData.map(d => (
        <div key={d.label}
          onMouseEnter={() => setHovLabel(d.label)}
          onMouseLeave={() => setHovLabel(null)}
          style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
            cursor: "pointer",
            opacity: hovLabel && hovLabel !== d.label ? 0.35 : 1,
            transition: "opacity 0.12s",
          }}>
          <div style={{ width: 100, flexShrink: 0, fontFamily: SANS, fontSize: 10, color: "var(--t2)", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {d.label.length > 14 ? d.label.slice(0, 12) + "…" : d.label}
          </div>
          <div style={{ flex: 1, height: 10, background: "var(--bg2)", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${d.avg / maxAvg * 100}%`, background: d.color, opacity: 0.75 }} />
          </div>
          <span style={{ width: 60, flexShrink: 0, fontFamily: PDK, fontSize: 11, color: "var(--t1)" }}>
            {d.avg.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── SectorGroupedDistChart ─────────────────────────────────────────────────
function SectorGroupedDistChart({ articles, mA, mB }: {
  articles: Article[];
  mA:       Metric;
  mB:       Metric;
}) {
  const [hovSector, setHovSector] = useState<string | null>(null);
  const [hovSeg,    setHovSeg]    = useState<string | null>(null); // "{sector}:{frame/angle}"

  const distMetric = mA.id === "sector" ? mB : mA;
  const useFrames  = distMetric.id === "frame";

  const bySector: Record<string, Article[]> = {};
  for (const a of articles) {
    if (a.sector) {
      bySector[a.sector] ??= [];
      bySector[a.sector].push(a);
    }
  }

  const rows = Object.entries(bySector)
    .map(([sector, arts]) => ({ sector, arts }))
    .sort((a, b) => b.arts.length - a.arts.length)
    .slice(0, 8);

  const hovSegInfo = hovSeg ? (() => {
    const idx = hovSeg.indexOf(":");
    return { sector: hovSeg.slice(0, idx), label: hovSeg.slice(idx + 1) };
  })() : null;

  return (
    <div style={{ border: "1px solid var(--border)", padding: "20px 24px" }}>
      <p style={{ fontFamily: QTC, fontSize: 9, letterSpacing: "1.2", textTransform: "uppercase", color: "var(--t2)", marginBottom: 4 }}>
        {distMetric.label} breakdown by sector
      </p>
      <div style={{ height: 22, marginBottom: 10 }}>
        {hovSegInfo
          ? <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--t1)", fontWeight: 600 }}>
              {hovSegInfo.sector} · {hovSegInfo.label}
            </span>
          : hovSector
            ? <span style={{ fontFamily: SANS, fontSize: 12, color: "var(--t1)" }}>
                {hovSector} — hover segments for frame breakdown
              </span>
            : <span style={{ fontFamily: PF, fontStyle: "italic", fontSize: 13, color: "var(--t2)" }}>
                Which sectors are covered with which {useFrames ? "frames" : "angles"}?
              </span>
        }
      </div>
      {rows.map(({ sector, arts }) => {
        const total = arts.length || 1;
        return (
          <div key={sector}
            onMouseEnter={() => setHovSector(sector)}
            onMouseLeave={() => setHovSector(null)}
            style={{ marginBottom: 12,
              opacity: hovSector && hovSector !== sector ? 0.35 : 1,
              transition: "opacity 0.12s", cursor: "pointer",
            }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontFamily: SANS, fontSize: 10, color: "var(--t2)" }}>{sector}</span>
              <span style={{ fontFamily: QTC, fontSize: 8, color: "var(--t2)", letterSpacing: "0.5" }}>{arts.length} arts</span>
            </div>
            <div style={{ display: "flex", height: 10 }}>
              {useFrames
                ? FRAME_COLORS.map(({ frame, color }) => {
                    const count  = arts.filter(a => a.primaryFrame === frame).length;
                    const pct    = count / total * 100;
                    const segKey = `${sector}:${frame}`;
                    return pct > 0 ? (
                      <div key={frame}
                        onMouseEnter={e => { e.stopPropagation(); setHovSeg(segKey); }}
                        onMouseLeave={e => { e.stopPropagation(); setHovSeg(null); }}
                        style={{
                          width: `${pct}%`, background: color, cursor: "pointer",
                          opacity: hovSeg && hovSeg !== segKey ? 0.25 : 1,
                          transition: "opacity 0.12s",
                        }} />
                    ) : null;
                  })
                : (Object.entries(ANGLE_COLORS) as [Angle, string][]).map(([angle, color]) => {
                    const count  = arts.filter(a => a.primaryAngle === angle).length;
                    const pct    = count / total * 100;
                    const segKey = `${sector}:${angle}`;
                    return pct > 0 ? (
                      <div key={angle}
                        onMouseEnter={e => { e.stopPropagation(); setHovSeg(segKey); }}
                        onMouseLeave={e => { e.stopPropagation(); setHovSeg(null); }}
                        style={{
                          width: `${pct}%`, background: color, cursor: "pointer",
                          opacity: hovSeg && hovSeg !== segKey ? 0.25 : 1,
                          transition: "opacity 0.12s",
                        }} />
                    ) : null;
                  })
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── WordCountOverTimeChart ─────────────────────────────────────────────────
const LINE_PALETTE = [
  "var(--red)", "var(--green)", "#EF9F27", "#7C3AED", "var(--red-m)", "var(--green-m)",
];

function WordCountOverTimeChart({ articles, stats, filterMode }: {
  articles:   Article[];
  stats:      ExtStat[];
  filterMode: "outlet" | "language" | "time";
}) {
  // Build month-keyed data grouped by outlet or language
  const months = [...new Set(articles.map(a => a.publishedAt.slice(0, 7)))].sort();

  type LineData = { key: string; color: string; data: Record<string, number[]> };

  const lines: LineData[] = [];

  if (filterMode === "outlet") {
    stats.slice(0, 6).forEach((o, i) => {
      const outletArts = articles.filter(a => a.outlet === o.id);
      const data: Record<string, number[]> = {};
      for (const a of outletArts) {
        const m = a.publishedAt.slice(0, 7);
        data[m] ??= [];
        data[m].push(a.wordCount);
      }
      lines.push({ key: o.name, color: LINE_PALETTE[i % LINE_PALETTE.length], data });
    });
  } else if (filterMode === "language") {
    const langs = [...new Set(articles.map(a => a.language).filter(Boolean))];
    langs.slice(0, 6).forEach((lang, i) => {
      const langArts = articles.filter(a => a.language === lang);
      const data: Record<string, number[]> = {};
      for (const a of langArts) {
        const m = a.publishedAt.slice(0, 7);
        data[m] ??= [];
        data[m].push(a.wordCount);
      }
      lines.push({ key: lang!, color: LINE_PALETTE[i % LINE_PALETTE.length], data });
    });
  } else {
    // "time" — single overall trend line
    const data: Record<string, number[]> = {};
    for (const a of articles) {
      const m = a.publishedAt.slice(0, 7);
      data[m] ??= [];
      data[m].push(a.wordCount);
    }
    lines.push({ key: "All outlets", color: "var(--t1)", data });
  }

  const chartData = months.map(m => {
    const row: Record<string, number | string> = { month: m };
    for (const line of lines) {
      const vals = line.data[m];
      row[line.key] = vals && vals.length > 0
        ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
        : 0;
    }
    return row;
  });

  if (chartData.length === 0) return null;

  return (
    <div style={{ border: "1px solid var(--border)", padding: "20px 24px" }}>
      <p style={{ fontFamily: QTC, fontSize: 9, letterSpacing: "1.2", textTransform: "uppercase", color: "var(--t2)", marginBottom: 4 }}>
        Avg. word count over time
        {filterMode !== "time" && (
          <span style={{ marginLeft: 8, fontFamily: SANS, fontSize: 9, letterSpacing: 0, color: "var(--t2)", fontWeight: 400 }}>
            · by {filterMode}
          </span>
        )}
      </p>
      <p style={{ fontFamily: PF, fontStyle: "italic", fontSize: 13, color: "var(--t2)", marginBottom: 16 }}>
        Does article length shift as coverage matures?
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 24, left: 0 }}>
          <CartesianGrid strokeDasharray="2 6" stroke="var(--border)" strokeOpacity={0.5} />
          <XAxis dataKey="month"
            tick={{ fontFamily: SANS, fontSize: 9, fill: "var(--t2)" }}
            angle={-35} textAnchor="end" interval={Math.floor(months.length / 6)} />
          <YAxis tick={{ fontFamily: SANS, fontSize: 9, fill: "var(--t2)" }}
            label={{ value: "words", angle: -90, position: "insideTopLeft", offset: 12,
              style: { fontFamily: PF, fontStyle: "italic", fontSize: 11, fill: "var(--t2)" } }} />
          <Tooltip
            contentStyle={{ background: "var(--bg)", border: "0.5px solid var(--border)", fontFamily: SS, fontSize: 12 }}
            labelStyle={{ fontFamily: PFSC, fontSize: 11 }}
          />
          {lines.length > 1 && <Legend iconType="circle" iconSize={8}
            wrapperStyle={{ fontFamily: SANS, fontSize: 10, paddingTop: 8 }} />}
          {lines.map(line => (
            <Line key={line.key} type="monotone" dataKey={line.key}
              stroke={line.color} strokeWidth={1.5} dot={false}
              activeDot={{ r: 4, fill: line.color }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── InsightSection ─────────────────────────────────────────────────────────
function InsightSection({
  metricA, metricB, metricAParam, metricBParam,
  stats, articles, scatterData, reg, mA, mB, mALabel, mBLabel, filterMode,
}: {
  metricA:      string;
  metricB:      string;
  metricAParam: MetricParam;
  metricBParam: MetricParam;
  stats:        ExtStat[];
  articles:     Article[];
  scatterData:  { name: string; x: number; y: number }[];
  reg:          { slope: number; int: number; minX: number; maxX: number; r: number } | null;
  mA:           Metric;
  mB:           Metric;
  mALabel:      string;
  mBLabel:      string;
  filterMode:   "outlet" | "language" | "time";
}) {
  const rule   = getPairRule(metricA, metricB);
  const charts = rule.charts;
  if (!rule.valid || charts.length === 0 || stats.length === 0) return null;

  const nodes = charts.map(id => {
    switch (id) {
      case "cross-tab-heatmap":
        return { id, el: <CrossTabHeatmap articles={articles} /> };
      case "country-group":
        return { id, el: <CountryGroupChart stats={stats} mA={mA} mB={mB} metricAParam={metricAParam} metricBParam={metricBParam} /> };
      case "country-stacked-dist":
        return { id, el: <CountryStackedDistChart stats={stats} mA={mA} mB={mB} /> };
      case "correlation-panel":
        return reg ? { id, el: <CorrelationPanel scatterData={scatterData} reg={reg} mA={mA} mB={mB} mALabel={mALabel} mBLabel={mBLabel} /> } : null;
      case "frame-dist":
        return { id, el: <FrameDistributionChart stats={stats} /> };
      case "angle-dist":
        return { id, el: <AngleDistributionChart stats={stats} /> };
      case "entry-timeline":
        return { id, el: <EntryTimelineChart stats={stats} /> };
      case "timeline-by-frame":
        return { id, el: <ColoredEntryTimeline stats={stats} colorBy="frame" /> };
      case "timeline-by-angle":
        return { id, el: <ColoredEntryTimeline stats={stats} colorBy="angle" /> };
      case "word-dist-by-group":
        return { id, el: <WordDistByGroupChart articles={articles} mA={mA} mB={mB} /> };
      case "sector-grouped-dist":
        return { id, el: <SectorGroupedDistChart articles={articles} mA={mA} mB={mB} /> };
      case "word-count-over-time":
        return { id, el: <WordCountOverTimeChart articles={articles} stats={stats} filterMode={filterMode} /> };
      default:
        return null;
    }
  }).filter((x): x is { id: InsightChartId; el: ReactElement } => x !== null);

  if (nodes.length === 0) return null;

  const [first, ...rest] = nodes;

  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ borderTop: "1px solid var(--border)", marginBottom: 28 }} />
      <div>{first.el}</div>
      {rest.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: rest.length > 1 ? "1fr 1fr" : "1fr",
          gap: 24, marginTop: 24,
        }}>
          {rest.map(n => <div key={n.id}>{n.el}</div>)}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function DiscrepancyDesk() {
  const { articles, loading } = useArticles();
  const allStats = useMemo(() => getOutletStats(articles), [articles]);

  const extStats = useMemo((): ExtStat[] => {
    if (articles.length === 0) {
      return allStats.map(o => ({
        ...o,
        angleCoverage: 0, lagDays: 0, avgWordCount: 0,
        sectorCount: 0, countryCode: 0, outletCountry: "",
        angleDist: {},
      }));
    }

    const MS_PER_DAY = 86_400_000;
    const FLOOR      = new Date("2020-01-01").getTime();

    const artsByOutlet = new Map(allStats.map(o => [o.id, articles.filter(a => a.outlet === o.id)]));

    // Anchor to minimum per-outlet first date, not global article minimum.
    // A single stray old article from any outlet won't poison the reference.
    const outletFirstTimes = allStats.map(o => {
      const ts = (artsByOutlet.get(o.id) ?? [])
        .map(a => new Date(a.publishedAt).getTime())
        .filter(t => isFinite(t) && t >= FLOOR);
      return ts.length ? Math.min(...ts) : Infinity;
    }).filter(t => t < Infinity);
    const globalStart = outletFirstTimes.length ? Math.min(...outletFirstTimes) : FLOOR;

    const dominantCountry = (oa: typeof articles) => {
      const counts: Record<string, number> = {};
      for (const a of oa) if (a.country) counts[a.country] = (counts[a.country] ?? 0) + 1;
      const entries = Object.entries(counts);
      return entries.length > 0 ? entries.sort((x, y) => y[1] - x[1])[0][0] : "";
    };

    const allCountries = [...new Set(
      allStats.map(o => dominantCountry(artsByOutlet.get(o.id) ?? [])).filter(Boolean)
    )].sort();
    const countryIndex: Record<string, number> = Object.fromEntries(allCountries.map((c, i) => [c, i]));

    return allStats.map(o => {
      const oa = artsByOutlet.get(o.id) ?? [];

      const withAngle    = oa.filter(a => a.primaryAngle !== null).length;
      const angleCoverage = oa.length > 0 ? Math.round(withAngle / oa.length * 100) : 0;

      const oaTimes  = oa.map(a => new Date(a.publishedAt).getTime()).filter(t => isFinite(t) && t > 0);
      const first    = oaTimes.length ? Math.min(...oaTimes) : globalStart;
      const lagDays  = Math.max(0, Math.round((first - globalStart) / MS_PER_DAY));

      const totalWords   = oa.reduce((s, a) => s + a.wordCount, 0);
      const avgWordCount = oa.length > 0 ? Math.round(totalWords / oa.length) : 0;

      const sectorCount = new Set(oa.map(a => a.sector).filter(Boolean)).size;

      const dc          = dominantCountry(oa);
      const countryCode = dc ? (countryIndex[dc] ?? 0) : 0;

      const angleDist: Partial<Record<Angle, number>> = {};
      for (const a of oa) if (a.primaryAngle) {
        angleDist[a.primaryAngle] = (angleDist[a.primaryAngle] ?? 0) + 1;
      }

      return { ...o, angleCoverage, lagDays, avgWordCount, sectorCount, countryCode, outletCountry: dc, angleDist };
    });
  }, [articles, allStats]);

  const [metricA, setMetricA]               = useState("country");
  const [metricB, setMetricB]               = useState("frame");
  const [metricAParam, setMetricAParam]     = useState<MetricParam>({});
  const [metricBParam, setMetricBParam]     = useState<MetricParam>({});
  const [pendingA, setPendingA]             = useState<string | null>(null);
  const [pendingAParam, setPendingAParam]   = useState<MetricParam>({});
  const [filterMode, setFilterMode]         = useState<"outlet" | "language" | "time">("outlet");
  const [selectedOutlets, setSelectedOutlets] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (extStats.length > 0 && selectedOutlets.size === 0) {
      const top5 = [...extStats]
        .sort((a, b) => b.articleCount - a.articleCount)
        .slice(0, 5)
        .map(o => o.id);
      setSelectedOutlets(new Set(top5));
    }
  }, [extStats]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const r = getPairRule(metricA, metricB);
    if (filterMode === "time"     && !r.byTime)     setFilterMode("outlet");
    if (filterMode === "language" && !r.byLanguage) setFilterMode("outlet");
  }, [metricA, metricB]); // eslint-disable-line react-hooks/exhaustive-deps

  const mA = METRICS.find(m => m.id === metricA)!;
  const mB = METRICS.find(m => m.id === metricB)!;

  const mALabel = metricAParam.frameFilter ? `${mA.label} · ${metricAParam.frameFilter}`
                : metricAParam.angleFilter  ? `${mA.label} · ${metricAParam.angleFilter}`
                : mA.label;
  const mBLabel = metricBParam.frameFilter ? `${mB.label} · ${metricBParam.frameFilter}`
                : metricBParam.angleFilter  ? `${mB.label} · ${metricBParam.angleFilter}`
                : mB.label;

  const displayStats = useMemo(() =>
    selectedOutlets.size === 0
      ? extStats
      : extStats.filter(o => selectedOutlets.has(o.id)),
    [extStats, selectedOutlets]
  );


  const scatterData = useMemo(() =>
    displayStats.map(o => ({
      name: o.name,
      x: resolveValue(mA, o, metricAParam),
      y: resolveValue(mB, o, metricBParam),
    })),
    [displayStats, metricA, metricB, metricAParam, metricBParam] // eslint-disable-line react-hooks/exhaustive-deps
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
    const int   = (sy - slope * sx) / n;
    const xs    = pts.map(p => p.x);
    const mX    = sx / n;
    const mY    = sy / n;
    const ssX   = pts.reduce((s, p) => s + (p.x - mX) ** 2, 0);
    const ssY   = pts.reduce((s, p) => s + (p.y - mY) ** 2, 0);
    const sXY   = pts.reduce((s, p) => s + (p.x - mX) * (p.y - mY), 0);
    const r     = ssX * ssY > 0 ? sXY / Math.sqrt(ssX * ssY) : 0;
    return { slope, int, minX: Math.min(...xs), maxX: Math.max(...xs), r };
  }, [scatterData]);

  const compatibleIds = useMemo((): Set<string> => {
    if (!pendingA) return new Set();
    return new Set(
      HEX_NODES.map(n => n.metricId).filter(id => id !== pendingA && getPairRule(pendingA, id).valid)
    );
  }, [pendingA]);

  const handleHexClick = (id: string) => {
    if (pendingA === null) {
      setPendingA(id);
      setPendingAParam({});
    } else if (id === pendingA) {
      setPendingA(null);
      setPendingAParam({});
    } else {
      const rule = getPairRule(pendingA, id);
      if (!rule.valid) return;
      setMetricA(pendingA);
      setMetricAParam(pendingAParam);
      setMetricB(id);
      setMetricBParam({});
      setPendingA(null);
      setPendingAParam({});
    }
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

  const pendingM    = pendingA ? METRICS.find(m => m.id === pendingA) : null;
  const isLeftNode  = pendingA === "wordcount" || pendingA === "sector";
  const panelPadTop = pendingA ? getPanelPaddingTop(pendingA) : 0;

  const panelContent = pendingM ? (
    <div style={{
      background: "#F5F1EA", border: "1px solid var(--border)",
      padding: "18px 20px", boxShadow: "3px 3px 0 var(--border)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontFamily: PFSC, fontSize: 12, color: "var(--t1)", letterSpacing: "0.02em" }}>
          {pendingM.label}
        </span>
        <button onClick={() => { setPendingA(null); setPendingAParam({}); }} style={{
          background: "none", border: "none", cursor: "pointer",
          fontFamily: QTC, fontSize: 14, color: "var(--t2)",
          lineHeight: 1, padding: "0 0 0 8px",
        }}>×</button>
      </div>
      <p style={{ fontFamily: SS, fontSize: 12, color: "var(--t2)", lineHeight: 1.5, marginBottom: 14 }}>
        {pendingM.desc}
      </p>
      {pendingM.id === "frame" && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontFamily: QTC, fontSize: 8, letterSpacing: "0.8", textTransform: "uppercase", color: "var(--t2)", marginBottom: 6 }}>
            Filter to frame
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {[null, ...FRAMES].map(f => {
              const active = f === null ? !pendingAParam.frameFilter : pendingAParam.frameFilter === f;
              return (
                <button key={f ?? "all"}
                  onClick={() => setPendingAParam(f ? { frameFilter: f } : {})}
                  style={{
                    padding: "2px 7px",
                    background: active ? "var(--t1)" : "transparent",
                    color: active ? "var(--bg)" : "var(--t2)",
                    border: "1px solid var(--border)",
                    fontFamily: QTC, fontSize: 8, letterSpacing: "0.5",
                    cursor: "pointer",
                  }}>
                  {f === null ? "All" : f.length > 14 ? f.slice(0, 12) + "…" : f}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {pendingM.id === "angle" && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontFamily: QTC, fontSize: 8, letterSpacing: "0.8", textTransform: "uppercase", color: "var(--t2)", marginBottom: 6 }}>
            Filter to angle
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {[null, ...ANGLES].map(a => {
              const active = a === null ? !pendingAParam.angleFilter : pendingAParam.angleFilter === a;
              return (
                <button key={a ?? "all"}
                  onClick={() => setPendingAParam(a ? { angleFilter: a } : {})}
                  style={{
                    padding: "2px 7px",
                    background: active ? "var(--t1)" : "transparent",
                    color: active ? "var(--bg)" : "var(--t2)",
                    border: "1px solid var(--border)",
                    fontFamily: QTC, fontSize: 8, letterSpacing: "0.5",
                    cursor: "pointer",
                  }}>
                  {a === null ? "All" : a}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <p style={{ fontFamily: PF, fontStyle: "italic", fontSize: 12, color: "var(--t2)", marginTop: 4 }}>
        Now click a highlighted node to pair
      </p>
    </div>
  ) : null;

  return (
    <div style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 44px 80px" }}>

        {/* sub-strip */}
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

        {/* headline */}
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
            <span style={{ background: SALMON, border: "1px solid var(--t1)", padding: "0 10px", color: "#fff", whiteSpace: "nowrap" }}>
              {mALabel}
            </span>
            <span>by</span>
            <span style={{ background: LIME, border: "1px solid var(--t1)", padding: "0 10px", color: "var(--t1)", whiteSpace: "nowrap" }}>
              {mBLabel}
            </span>
          </div>
        </div>

        {/* hex with side panels */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          gap: 16, margin: "4px auto 0",
          maxWidth: pendingM ? 840 : 480,
          transition: "max-width 0.3s ease",
        }}>
          {/* Left panel zone — sector and wordcount nodes */}
          <div style={{
            width: pendingM && isLeftNode ? PANEL_W : 0,
            flexShrink: 0, overflow: "hidden",
            transition: "width 0.25s ease",
            paddingTop: panelPadTop,
          }}>
            {pendingM && isLeftNode && panelContent}
          </div>

          {/* Hex */}
          <div style={{ width: 432, flexShrink: 0, padding: "0 24px" }}>
            <HexPicker
              metricA={metricA}
              metricB={metricB}
              pendingA={pendingA}
              compatibleIds={compatibleIds}
              onNodeClick={handleHexClick}
            />
          </div>

          {/* Right panel zone — all other nodes */}
          <div style={{
            width: pendingM && !isLeftNode ? PANEL_W : 0,
            flexShrink: 0, overflow: "hidden",
            transition: "width 0.25s ease",
            paddingTop: panelPadTop,
          }}>
            {pendingM && !isLeftNode && panelContent}
          </div>
        </div>
        <p style={{
          fontFamily: PF, fontStyle: "italic", fontSize: 14, lineHeight: "20px",
          color: "var(--t2)", textAlign: "center", margin: "10px auto 0", maxWidth: 480,
        }}>
          {pendingA
            ? "Now click a highlighted node to set the paired axis"
            : "Click a metric node to begin — it becomes your primary axis"
          }
        </p>

        {/* controls */}
        <div style={{ maxWidth: 760, margin: "28px auto 0" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <div style={{ display: "flex" }}>
              {(["outlet", "language", "time"] as const).map((mode, i) => {
                const disabled = (mode === "time" && !getPairRule(metricA, metricB).byTime)
                              || (mode === "language" && !getPairRule(metricA, metricB).byLanguage);
                return (
                <button key={mode} onClick={() => { if (!disabled) setFilterMode(mode); }} style={{
                  padding: "5px 20px",
                  background: filterMode === mode ? "var(--t1)" : "transparent",
                  color: filterMode === mode ? "var(--bg)" : disabled ? "var(--t2)" : "var(--t1)",
                  border: `1px solid ${disabled ? "var(--border)" : "var(--t1)"}`,
                  marginLeft: i > 0 ? -1 : 0,
                  fontFamily: QTC, fontSize: 12, letterSpacing: "0.8",
                  textTransform: "uppercase",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.35 : 1,
                  position: "relative", zIndex: filterMode === mode ? 1 : 0,
                }}>
                  by {mode}
                </button>
              );})}
            </div>
          </div>

          {filterMode === "outlet" ? (
            <div style={{
              border: "1px solid var(--t1)", padding: "12px 16px",
              display: "flex", flexWrap: "wrap",
              gap: 8, alignItems: "center", justifyContent: "center",
            }}>
              {[...extStats].sort((a, b) => b.articleCount - a.articleCount).slice(0, 20).map(o => {
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
              border: "1px solid var(--border)", padding: "14px 16px", textAlign: "center",
              fontFamily: QTC, fontSize: 10, letterSpacing: "0.8",
              textTransform: "uppercase", color: "var(--t2)",
            }}>
              {filterMode === "language" ? "Language filter — coming soon" : "Time filter — coming soon"}
            </div>
          )}

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
                onClick={() => { setMetricA(p.a); setMetricB(p.b); setMetricAParam({}); setMetricBParam({}); }}
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

        {/* insight charts */}
        {!loading && displayStats.length > 0 && (
          <InsightSection
            metricA={metricA} metricB={metricB}
            metricAParam={metricAParam} metricBParam={metricBParam}
            stats={displayStats}
            articles={articles}
            scatterData={scatterData}
            reg={reg}
            mA={mA} mB={mB}
            mALabel={mALabel} mBLabel={mBLabel}
            filterMode={filterMode}
          />
        )}

        {/* outlet comparison grid */}
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
              {" "}{mALabel} and{" "}
              <span style={{ background: LIME, color: "var(--t1)", padding: "0 4px" }}>B</span>
              {" "}{mBLabel}, alongside each outlet&rsquo;s frame and stage profile.
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(displayStats.length, 5)}, 1fr)`,
              gap: "1px", border: "1px solid var(--border)",
              background: "var(--border)", overflow: "hidden",
            }}>
              {displayStats.map(o => (
                <OutletCard
                  key={o.id} outlet={o} mA={mA} mB={mB}
                  vA={resolveValue(mA, o, metricAParam)}
                  vB={resolveValue(mB, o, metricBParam)}
                />
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 20 }}>
              {[
                { label: "Frames", items: FRAME_COLORS.map(f => ({ label: f.frame, color: f.color })) },
                { label: "Stages", items: STAGE_COLORS.map(s => ({ label: s.stage, color: s.color })) },
              ].map(({ label, items }) => (
                <div key={label}>
                  <p style={{ fontFamily: QTC, fontSize: 9, letterSpacing: "1.2", textTransform: "uppercase", color: "var(--t2)", marginBottom: 8 }}>
                    {label}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 20px" }}>
                    {items.map(({ label: l, color }) => (
                      <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 10, height: 10, background: color, flexShrink: 0 }} />
                        <span style={{ fontFamily: SS, fontSize: 12, color: "var(--t2)", lineHeight: 1 }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* scatter section header */}
        <div style={{ marginTop: 56 }}>
          <DblRule />
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", padding: "10px 0",
            fontFamily: PDK, fontSize: 14, color: "var(--t2)",
          }}>
            <span>
              <em style={{ fontFamily: PF, fontStyle: "italic" }}>{mBLabel}</em>
              {" "}coverage · across{" "}
              <em style={{ fontFamily: PF, fontStyle: "italic" }}>{mALabel}</em>
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
          Each dot is one outlet. x-axis = <em>{mALabel}</em> ({mA.desc}); y-axis = <em>{mBLabel}</em>. The dashed line is the regression — dots above over-index on {mB.short} for their level of {mA.short}.
        </p>

        {/* scatter plot */}
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
              <CartesianGrid strokeDasharray="2 6" stroke="var(--border)" strokeOpacity={0.5} />
              <XAxis
                type="number" dataKey="x" name={mA.label}
                tick={{ fontFamily: SANS, fontSize: 11, fill: "var(--t2)" }}
                label={{
                  value: `${mALabel} (${mA.unit}) →`,
                  position: "insideBottomRight", offset: -8,
                  style: { fontFamily: PF, fontStyle: "italic", fontSize: 13, fill: "var(--t1)" },
                }}
              />
              <YAxis
                type="number" dataKey="y" name={mB.label}
                tick={{ fontFamily: SANS, fontSize: 11, fill: "var(--t2)" }}
                label={{
                  value: `↑ ${mBLabel} (${mB.unit})`,
                  angle: -90, position: "insideTopLeft", offset: 16,
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
                  return <ScatterTooltip active={p.active} payload={p.payload} mA={mA} mB={mB} mALabel={mALabel} mBLabel={mBLabel} />;
                }}
              />
              <Scatter
                data={scatterData}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shape={(props: any) => {
                  const { cx, cy, payload } = props as { cx: number; cy: number; payload: { name: string } };
                  const nm    = payload.name;
                  const label = nm.length > 18 ? nm.substring(0, 16) + "…" : nm;
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={5} fill="var(--t1)" fillOpacity={0.72} />
                      <text x={cx + 8} y={cy - 1} fontSize={10} fontFamily={SANS} fill="var(--t1)" fillOpacity={0.72}>
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
                  stroke="var(--t2)" strokeDasharray="6 3" strokeWidth={1.5}
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        )}

        {/* footer */}
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
