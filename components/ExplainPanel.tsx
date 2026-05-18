"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { X, AlertTriangle, Layers, Info } from "lucide-react";
import type { Article } from "@/lib/mockData";
import { getArticleExplanation, type Token } from "@/lib/mockExplanations";

type View = "misinfo" | "framing";

// Color helpers

function misinfoColor(w: number): string {
  if (w < 0.06) return "transparent";
  // amber at low weights → deep crimson at high weights
  const r = 200;
  const g = Math.round(Math.max(38, 160 - w * 160));
  const b = 38;
  const a = Math.min(0.78, w * 0.9);
  return `rgba(${r},${g},${b},${a})`;
}

function framingColor(w: number): string {
  if (w < 0.06) return "transparent";
  const a = Math.min(0.75, w * 0.85);
  return `rgba(109,40,217,${a})`;
}

function tokenStyle(token: Token, view: View): React.CSSProperties {
  const w = view === "misinfo" ? token.misinfoWeight : token.framingWeight;
  const bg = view === "misinfo" ? misinfoColor(w) : framingColor(w);
  if (bg === "transparent") return {};
  return {
    backgroundColor: bg,
    borderRadius: "2px",
    padding: "1px 0",
    // keep text readable on darker backgrounds
    color: w > 0.65 ? "#fff" : undefined,
    cursor: "default",
  };
}

// Legend

function Legend({ view }: { view: View }) {
  const stops = view === "misinfo"
    ? ["rgba(200,160,38,0.2)", "rgba(200,80,38,0.55)", "rgba(200,38,38,0.78)"]
    : ["rgba(109,40,217,0.15)", "rgba(109,40,217,0.45)", "rgba(109,40,217,0.75)"];

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px]" style={{ color: "var(--t2)" }}>Low</span>
      <div className="flex-1 h-2 rounded-full" style={{
        background: `linear-gradient(to right, ${stops.join(", ")})`,
        border: "0.5px solid var(--border)",
      }} />
      <span className="text-[10px]" style={{ color: "var(--t2)" }}>High contribution</span>
    </div>
  );
}

// Highlighted text

function HighlightedText({ tokens, view }: { tokens: Token[]; view: View }) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <p className="text-sm leading-[1.85] whitespace-pre-wrap" style={{ color: "var(--t1)" }}>
      {tokens.map((tok, i) => {
        if (tok.isWhitespace) return tok.text;
        const w = view === "misinfo" ? tok.misinfoWeight : tok.framingWeight;
        const style = tokenStyle(tok, view);
        const isHovered = hovered === i;

        return (
          <span
            key={i}
            style={{
              ...style,
              outline: isHovered && w > 0.05 ? "1px solid rgba(0,0,0,0.25)" : undefined,
              transition: "background-color 0.12s",
            }}
            title={w > 0.05 ? `Weight: ${(w * 100).toFixed(0)}%` : undefined}
            onMouseEnter={() => w > 0.05 && setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {tok.text}
          </span>
        );
      })}
    </p>
  );
}

// Main panel

export default function ExplainPanel({
  article,
  onClose,
}: {
  article: Article;
  onClose: () => void;
}) {
  const [view, setView] = useState<View>("misinfo");
  const { tokens } = useMemo(() => getArticleExplanation(article), [article]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const VIEW_META = {
    misinfo: {
      label: "Misinformation",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      activeBg: "var(--red)",
      description: "Word-level keyword attribution. Highlighted words are associated with misinformation signals from a curated lexicon.",
      note: "Keyword-based detection · Production: BERT + keyword fusion",
    },
    framing: {
      label: "Framing",
      icon: <Layers className="w-3.5 h-3.5" />,
      activeBg: "#7C3AED",
      description: `SHAP/LIME attention simulation. Highlighted words are most predictive of the "${article.primaryFrame}" frame classification.`,
      note: "Mock SHAP attribution · Production: BERT + SHAP / LIME",
    },
  } satisfies Record<View, { label: string; icon: React.ReactNode; activeBg: string; description: string; note: string }>;

  const meta = VIEW_META[view];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      onMouseDown={onClose}
    >
      <div
        className="rounded-xl w-full max-w-2xl flex flex-col overflow-hidden"
        style={{
          background: "var(--bg)",
          border: "0.5px solid var(--border)",
          maxHeight: "88vh",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-5 py-4"
          style={{ borderBottom: "0.5px solid var(--border)" }}
        >
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--t1)" }}>
              Classification explanation
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--t2)" }}>
              Word-level contribution to model output
            </p>
          </div>

          <div className="flex items-center gap-2.5 mt-0.5">
            {/* View toggle */}
            <div
              className="flex rounded-lg overflow-hidden text-xs font-medium"
              style={{ border: "0.5px solid var(--border)" }}
            >
              {(["misinfo", "framing"] as View[]).map((v) => {
                const m = VIEW_META[v];
                const active = view === v;
                return (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 transition-colors"
                    style={
                      active
                        ? { background: m.activeBg, color: "#fff" }
                        : { background: "var(--bg2)", color: "var(--t2)" }
                    }
                  >
                    {m.icon}
                    {m.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="rounded-md p-1 transition-colors hover:opacity-70"
              style={{ color: "var(--t2)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info bar */}
        <div
          className="flex items-start gap-2 px-5 py-2.5"
          style={{ borderBottom: "0.5px solid var(--border)", background: "var(--bg2)" }}
        >
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--t2)" }} />
          <p className="text-xs leading-relaxed" style={{ color: "var(--t2)" }}>
            {meta.description}
          </p>
        </div>

        {/* Scrollable text */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ minHeight: 0 }}>
          <p
            className="text-[10px] font-medium uppercase tracking-wide mb-3"
            style={{ color: "var(--t2)", opacity: 0.6 }}
          >
            Mock article body — hover words to see weights
          </p>
          <HighlightedText tokens={tokens} view={view} />
        </div>

        {/* Legend + footnote */}
        <div
          className="px-5 py-3 space-y-2"
          style={{ borderTop: "0.5px solid var(--border)", background: "var(--bg2)" }}
        >
          <Legend view={view} />
          <p className="text-[10px]" style={{ color: "var(--t2)", opacity: 0.6 }}>
            {meta.note}
          </p>
        </div>
      </div>
    </div>
  );
}
