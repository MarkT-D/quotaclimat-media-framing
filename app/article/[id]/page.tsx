"use client";
import { use, useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";
import { ArrowLeft, ExternalLink, AlertTriangle, CheckCircle, Info, Lightbulb } from "lucide-react";
import { FRAMES } from "@/lib/mockData";
import type { Article } from "@/lib/mockData";
import Badge from "@/components/Badge";
import ExplainPanel from "@/components/ExplainPanel";

const FRAME_COLORS = ["var(--red)", "#EF9F27", "var(--red-m)", "#7C3AED", "var(--green)"];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-2.5 shadow text-xs" style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}>
      <p className="font-medium mb-0.5" style={{ color: "var(--t1)" }}>{payload[0]?.payload?.fullFrame}</p>
      <p style={{ color: "var(--t2)" }}>Probability: {payload[0]?.value}%</p>
    </div>
  );
};

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [article, setArticle] = useState<Article | null>(null);
  const [notFoundError, setNotFoundError] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then((r) => {
        if (!r.ok) throw r.status;
        return r.json() as Promise<Article>;
      })
      .then(setArticle)
      .catch((status) => {
        if (status === 404) setNotFoundError(true);
      });
  }, [id]);

  if (notFoundError) notFound();
  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-8 pt-8">
        <p style={{ color: "var(--t2)", fontFamily: "var(--font-plex-sans)" }}>Loading…</p>
      </div>
    );
  }

  const misiPct = article.misinformationScore != null ? Math.round(article.misinformationScore * 100) : null;
  const misiColor = misiPct == null ? "var(--t2)" : misiPct < 20 ? "var(--green)" : misiPct < 50 ? "#D4A017" : "var(--red)";

  const frameBarData = FRAMES.map((f, i) => ({
    frame: f.split(" ").slice(0, 2).join(" "),
    fullFrame: f,
    score: Math.round((article.frameScores[f] ?? 0) * 100),
    fill: FRAME_COLORS[i],
  }));

  const radarData = FRAMES.map((f) => ({
    frame: f.split(" ")[0],
    value: Math.round((article.frameScores[f] ?? 0) * 100),
  }));

  return (
    <>
    <div className="max-w-4xl mx-auto space-y-5 px-8 pt-8">
      {/* Back */}
      <Link href="/search" className="inline-flex items-center gap-1.5 text-sm transition-colors"
        style={{ color: "var(--t2)" }}>
        <ArrowLeft className="w-4 h-4" />
        Back to articles
      </Link>

      {/* Article header */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}>
        <p className="text-[11px] font-medium mb-2" style={{ color: "var(--red)" }}>
          {article.outlet} · {article.publishedAt}
        </p>
        <h1 className="text-lg font-medium leading-snug mb-3" style={{ color: "var(--t1)" }}>
          {article.title}
        </h1>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {article.sector && <Badge label={article.sector} />}
          {article.crisisDomain && <Badge label={article.crisisDomain} />}
          {article.stage && <Badge label={article.stage} />}
        </div>
        <p className="text-sm leading-relaxed mb-3" style={{
          color: "var(--t2)",
          borderLeft: "2px solid var(--border)",
          paddingLeft: "1rem",
          lineHeight: 1.7,
        }}>
          {article.excerpt}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {article.keywords.map((k) => (
            <span key={k} className="text-xs px-2 py-1 rounded-md" style={{ background: "var(--bg2)", color: "var(--t2)" }}>
              #{k}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--t2)" }}>
          <span>{article.wordCount.toLocaleString()} words</span>
          {article.url && (
            <a href={article.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1" style={{ color: "var(--green)" }}>
              View source <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Analysis panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Misinfo — hidden when not available */}
        {misiPct != null && (
          <div className="rounded-xl p-5" style={{ background: "var(--bg)", border: `0.5px solid ${misiColor}` }}>
            <div className="flex items-center gap-2 mb-3">
              {misiPct >= 50
                ? <AlertTriangle className="w-4 h-4" style={{ color: "var(--red)" }} />
                : misiPct >= 20
                ? <Info className="w-4 h-4" style={{ color: "#D4A017" }} />
                : <CheckCircle className="w-4 h-4" style={{ color: "var(--green)" }} />}
              <p className="text-sm font-medium" style={{ color: "var(--t1)" }}>Misinformation risk</p>
            </div>

            <div className="flex items-end gap-1 mb-3">
              <span className="text-5xl font-medium" style={{ color: misiColor }}>{misiPct}</span>
              <span className="text-base mb-1" style={{ color: "var(--t2)" }}> / 100</span>
            </div>

            <div className="h-1.5 rounded-full mb-3" style={{ background: "var(--bg2)" }}>
              <div className="h-full rounded-full" style={{ width: `${misiPct}%`, background: misiColor }} />
            </div>

            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={misiPct < 20
                ? { background: "var(--green-l)", color: "var(--green-d)" }
                : misiPct < 50
                ? { background: "var(--bg2)", color: "#D4A017" }
                : { background: "var(--red-l)", color: "var(--red-d)" }}
            >
              {misiPct < 20 ? "Low risk" : misiPct < 50 ? "Moderate" : "High risk"}
            </span>

            <p className="text-xs leading-relaxed mt-3" style={{ color: "var(--t2)" }}>
              {misiPct < 20
                ? "No significant signals. Coverage appears factually sound."
                : misiPct < 50
                ? "Moderate signals. Some claims warrant review against scientific sources."
                : "High-risk signals. Manual review recommended."}
            </p>
            <p className="text-[10px] mt-3" style={{ color: "var(--t2)", opacity: 0.6 }}>
              BERT-based enhancement pending.
            </p>
          </div>
        )}

        {/* Frame bar */}
        <div className="rounded-xl p-5" style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--t1)" }}>Frame probabilities</p>
          <p className="text-xs mb-3" style={{ color: "var(--t2)" }}>Semetko &amp; Valkenburg (2000)</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={frameBarData} layout="vertical" margin={{ left: 80, right: 10 }}>
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="frame" tick={{ fontSize: 10 }} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" radius={[0, 3, 3, 0]}>
                {frameBarData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs mt-2" style={{ color: "var(--t2)" }}>
            Primary: <span className="font-medium" style={{ color: "var(--t1)" }}>{article.primaryFrame ?? "—"}</span>
          </p>
        </div>

        {/* Radar */}
        <div className="rounded-xl p-5" style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--t1)" }}>Frame profile</p>
          <p className="text-xs mb-2" style={{ color: "var(--t2)" }}>Radar view</p>
          <ResponsiveContainer width="100%" height={210}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--bg2)" />
              <PolarAngleAxis dataKey="frame" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} />
              <Radar dataKey="value" stroke="var(--red)" fill="var(--red)" fillOpacity={0.15} />
              <Tooltip formatter={(v) => [`${v}%`, "Probability"]} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Explain button */}
      <div className="flex justify-center">
        <button
          onClick={() => setExplainOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-75"
          style={{ background: "var(--bg)", border: "0.5px solid var(--border)", color: "var(--t1)" }}
        >
          <Lightbulb className="w-4 h-4" style={{ color: "var(--red)" }} />
          Explain classifications
        </button>
      </div>

      {/* Classification */}
      <div className="rounded-xl p-5" style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}>
        <p className="text-sm font-medium mb-3" style={{ color: "var(--t1)" }}>Classification details</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Sector", value: article.sector ?? "—" },
            { label: "Crisis domain", value: article.crisisDomain ?? "—" },
            { label: "Causal stage", value: article.stage ?? "—" },
            { label: "Primary frame", value: article.primaryFrame ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg p-3" style={{ background: "var(--bg2)" }}>
              <p className="text-[10px] mb-1" style={{ color: "var(--t2)" }}>{label}</p>
              <p className="text-xs font-medium" style={{ color: "var(--t1)" }}>{value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--t2)", opacity: 0.7 }}>
          Classifications are generated by keyword-based detection and will be enhanced by BERT classifiers in the production pipeline.
        </p>
      </div>
    </div>

    {explainOpen && (
      <ExplainPanel article={article} onClose={() => setExplainOpen(false)} />
    )}
    </>
  );
}
