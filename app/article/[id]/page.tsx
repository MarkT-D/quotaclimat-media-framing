"use client";
import { use, useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { FRAMES, ANGLES } from "@/lib/articleTypes";
import type { Article, Angle } from "@/lib/articleTypes";
import { getArticleExplanation, type Token } from "@/lib/mockExplanations";
import { exportToCsv, articleToCsvRow } from "@/lib/exportCsv";

// ─── Constants ────────────────────────────────────────────────────────────────

const F = {
  playfair: "var(--font-playfair)",
  serif:    "var(--font-source-serif)",
  plex:     "var(--font-plex-sans)",
  qtc:      "var(--font-quantico)",
};

const FRAME_COLORS = ["var(--red)", "#EF9F27", "var(--red-m)", "#7C3AED", "var(--green)"];
const ANGLE_COLORS = ["#2D4228", "#3A5535", "#4A6741", "#6B9B65", "#A8BE8A", "#C8DEB8"];

const KW_LIMIT = 8;

const COUNTRY_NAMES: Record<string, string> = {
  FR: "France", BE: "Belgium", DE: "Germany", GB: "United Kingdom",
  US: "United States", ES: "Spain", IT: "Italy", NL: "Netherlands",
  CH: "Switzerland", AT: "Austria", PL: "Poland", PT: "Portugal",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tokenBg(w: number, mode: "frame" | "angle"): string {
  if (w < 0.15) return "transparent";
  const rgb = mode === "frame" ? "184, 64, 46" : "74, 103, 65";
  return `rgba(${rgb}, ${Math.min(w * 0.7, 0.38)})`;
}

function groupIntoParagraphs(tokens: Token[]): Token[][] {
  const paras: Token[][] = [[]];
  for (const t of tokens) {
    if (t.isWhitespace && t.text.includes("\n")) {
      paras.push([]);
    } else {
      paras[paras.length - 1].push(t);
    }
  }
  return paras.filter(p => p.length > 0);
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

interface TooltipPayloadItem { value: number; payload: Record<string, string | number> }

function ChartTooltip({ active, payload, labelKey }: { active?: boolean; payload?: TooltipPayloadItem[]; labelKey: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg)", border: "1px solid var(--border)",
      padding: "8px 12px", fontFamily: F.plex,
    }}>
      <p style={{ color: "var(--t2)", fontSize: 11, marginBottom: 2 }}>{payload[0]?.payload?.[labelKey]}</p>
      <p style={{ color: "var(--t1)", fontSize: 12, fontWeight: 500 }}>{payload[0]?.value}%</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [article, setArticle]           = useState<Article | null>(null);
  const [notFoundError, setNotFoundError] = useState(false);
  const [tokens, setTokens]             = useState<Token[] | null>(null);
  const [bodyExpanded, setBodyExpanded]  = useState(false);
  const [showAllKw, setShowAllKw]        = useState(false);
  const [highlightMode, setHighlightMode] = useState<"frame" | "angle">("frame");

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then(r => { if (!r.ok) throw r.status; return r.json() as Promise<Article>; })
      .then(setArticle)
      .catch(status => { if (status === 404) setNotFoundError(true); });
  }, [id]);

  useEffect(() => {
    if (!article) return;
    const { tokens: t } = getArticleExplanation(article);
    setTokens(t);
  }, [article]);

  if (notFoundError) notFound();
  if (!article) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 32px", fontFamily: F.plex, color: "var(--t2)", fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  // Chart data
  const frameBarData = FRAMES.map((f, i) => ({
    frame:     f.split(" ").slice(0, 2).join(" "),
    fullFrame: f,
    score:     Math.round((article.frameScores[f] ?? 0) * 100),
    fill:      FRAME_COLORS[i],
  }));

  const angleBarData = ANGLES.map((a, i) => ({
    angle:     a === "Purchasing Power" ? "Purch. Power" : a,
    fullAngle: a,
    score:     Math.round(((article.angleScores?.[a as Angle]) ?? 0) * 100),
    fill:      ANGLE_COLORS[i],
  }));

  // Keywords
  const visibleKw = showAllKw ? article.keywords : article.keywords.slice(0, KW_LIMIT);
  const hiddenKw  = article.keywords.length - KW_LIMIT;

  // Body text paragraphs
  const paragraphs = tokens ? groupIntoParagraphs(tokens) : [];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 48px 48px" }}>

      {/* ── Top bar: back + export ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Link href="/search" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
          textDecoration: "none", letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
          <ArrowLeft style={{ width: 13, height: 13 }} />
          Back to articles
        </Link>
        <button
          onClick={() => exportToCsv([articleToCsvRow(article)], `article-${article.id}.csv`)}
          style={{
            fontFamily: F.qtc, fontSize: 9, letterSpacing: "1.2px",
            textTransform: "uppercase", color: "var(--t2)",
            background: "none", border: "1px solid var(--border)",
            padding: "6px 14px", cursor: "pointer",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--t1)"; e.currentTarget.style.color = "var(--t1)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--t2)"; }}
        >
          ↓ Export CSV
        </button>
      </div>

      {/* ── Article header ── */}
      <div style={{ borderTop: "2px solid var(--t1)", paddingTop: 16 }}>
        <p style={{
          fontFamily: F.qtc, fontSize: 10, letterSpacing: "1.2px",
          textTransform: "uppercase", color: "var(--t2)", marginBottom: 10,
        }}>
          {article.outlet}&ensp;·&ensp;{article.publishedAt}
        </p>

        <h1 style={{
          fontFamily: F.playfair, fontWeight: 400,
          fontSize: 26, lineHeight: "32px", color: "var(--t1)",
          marginBottom: 20, maxWidth: 960,
        }}>
          {article.title}
        </h1>

        {/* Classification strip */}
        <div className="grid grid-cols-3" style={{ border: "1px solid var(--border)", marginBottom: 16 }}>
          {[
            { label: "Sector",  value: article.sector ?? "—" },
            { label: "Angle",   value: article.primaryAngle ?? "—" },
            { label: "Country", value: article.country ? (COUNTRY_NAMES[article.country] ?? article.country) : "—" },
          ].map(({ label, value }, i) => (
            <div key={label} style={{
              padding: "12px 16px",
              borderRight: i < 2 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ fontFamily: F.qtc, fontSize: 9, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--t2)", marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontFamily: F.plex, fontSize: 14, fontWeight: 500, color: "var(--t1)" }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Keywords */}
        {article.keywords.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {visibleKw.map(k => (
              <span key={k} style={{
                fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
                background: "var(--bg2)", border: "1px solid var(--border)",
                padding: "2px 8px",
              }}>
                #{k}
              </span>
            ))}
            {!showAllKw && hiddenKw > 0 && (
              <button onClick={() => setShowAllKw(true)} style={{
                fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
                background: "none", border: "1px solid var(--border)",
                padding: "2px 8px", cursor: "pointer",
              }}>
                +{hiddenKw} more
              </button>
            )}
            {showAllKw && hiddenKw > 0 && (
              <button onClick={() => setShowAllKw(false)} style={{
                fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
                background: "none", border: "none", cursor: "pointer",
                textDecoration: "underline",
              }}>
                show less
              </button>
            )}
          </div>
        )}

        {/* Meta row */}
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <span style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t2)" }}>
            {article.wordCount.toLocaleString()} words
          </span>
          {article.crisisDomain && (
            <span style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t2)" }}>
              {article.crisisDomain}
            </span>
          )}
          {article.url && (
            <a href={article.url} target="_blank" rel="noopener noreferrer" style={{
              fontFamily: F.plex, fontSize: 11, color: "var(--green)",
              display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none",
            }}>
              View source <ExternalLink style={{ width: 11, height: 11 }} />
            </a>
          )}
        </div>
      </div>

      {/* ── Article body with SHAP highlights ── */}
      <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ fontFamily: F.qtc, fontSize: 9, letterSpacing: "1.2px", textTransform: "uppercase", color: "var(--t2)", margin: 0 }}>
            Article text · {highlightMode === "frame" ? "framing" : "angle"} signals highlighted
          </p>
          <div style={{ display: "flex", gap: 4 }}>
            {(["frame", "angle"] as const).map(m => (
              <button key={m} onClick={() => setHighlightMode(m)} style={{
                fontFamily: F.plex, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em",
                background: highlightMode === m ? "var(--t1)" : "transparent",
                color: highlightMode === m ? "var(--bg)" : "var(--t2)",
                border: `1px solid ${highlightMode === m ? "var(--t1)" : "var(--border)"}`,
                padding: "2px 10px", cursor: "pointer", transition: "all 0.12s",
              }}>
                {m === "frame" ? "Frame" : "Angle"}
              </button>
            ))}
          </div>
        </div>

        {tokens === null ? (
          <div>
            {[88, 96, 74].map((w, i) => (
              <div key={i} style={{
                height: 11, width: `${w}%`, background: "var(--bg2)",
                marginBottom: 10, opacity: 0.8,
              }} />
            ))}
          </div>
        ) : (
          <div>
            <div style={{ fontFamily: F.serif, fontSize: 15, lineHeight: "24px", color: "var(--t1)" }}>
              {(bodyExpanded ? paragraphs : paragraphs.slice(0, 1)).map((para, pi) => (
                <p key={pi} style={{ marginBottom: 16 }}>
                  {para.map((t, ti) => (
                    <span key={ti} style={{ background: tokenBg(highlightMode === "frame" ? t.framingWeight : t.angleWeight, highlightMode), padding: "1px 0" }}>
                      {t.text}
                    </span>
                  ))}
                </p>
              ))}
            </div>
            {paragraphs.length > 1 && (
              <button onClick={() => setBodyExpanded(e => !e)} style={{
                fontFamily: F.plex, fontSize: 11, letterSpacing: "0.04em",
                textTransform: "uppercase", color: "var(--t2)",
                background: "none", border: "1px solid var(--border)",
                padding: "5px 12px", cursor: "pointer", marginTop: 4,
              }}>
                {bodyExpanded ? "Collapse" : `Read more (${paragraphs.length - 1} more paragraphs)`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 1, background: "var(--border)", marginTop: 28 }}>
        {/* Frame chart */}
        <div style={{ background: "var(--bg)", padding: "20px 20px 16px" }}>
          <p style={{ fontFamily: F.plex, fontSize: 11, fontWeight: 500, color: "var(--t1)", marginBottom: 2 }}>
            Frame probabilities
          </p>
          <p style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)", marginBottom: 12 }}>
            Semetko &amp; Valkenburg (2000)
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={frameBarData} layout="vertical" margin={{ left: 90, right: 12 }}>
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 9, fontFamily: F.plex, fill: "var(--t2)" }} />
              <YAxis type="category" dataKey="frame" tick={{ fontSize: 9, fontFamily: F.plex, fill: "var(--t2)" }} width={90} />
              <Tooltip content={<ChartTooltip labelKey="fullFrame" />} />
              <Bar dataKey="score" radius={[0, 2, 2, 0]}>
                {frameBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)", marginTop: 6 }}>
            Primary:&ensp;<span style={{ fontWeight: 600, color: "var(--t1)" }}>{article.primaryFrame ?? "—"}</span>
          </p>
        </div>

        {/* Angle chart */}
        <div style={{ background: "var(--bg)", padding: "20px 20px 16px" }}>
          <p style={{ fontFamily: F.plex, fontSize: 11, fontWeight: 500, color: "var(--t1)", marginBottom: 2 }}>
            Angle distribution
          </p>
          <p style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)", marginBottom: 12 }}>
            QuotaClimat taxonomy
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={angleBarData} layout="vertical" margin={{ left: 90, right: 12 }}>
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 9, fontFamily: F.plex, fill: "var(--t2)" }} />
              <YAxis type="category" dataKey="angle" tick={{ fontSize: 9, fontFamily: F.plex, fill: "var(--t2)" }} width={90} />
              <Tooltip content={<ChartTooltip labelKey="fullAngle" />} />
              <Bar dataKey="score" radius={[0, 2, 2, 0]}>
                {angleBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)", marginTop: 6 }}>
            Primary:&ensp;<span style={{ fontWeight: 600, color: "var(--t1)" }}>{article.primaryAngle ?? "—"}</span>
          </p>
        </div>
      </div>

    </div>
  );
}
