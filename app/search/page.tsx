"use client";
import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import {
  SECTORS, CRISIS_DOMAINS, STAGES, FRAMES,
  type Sector, type CrisisDomain, type Stage, type Frame, type Article,
} from "@/lib/mockData";
import { useArticles } from "@/lib/useArticles";

const F = {
  playfair: "var(--font-playfair)",
  serif:    "var(--font-source-serif)",
  plex:     "var(--font-plex-sans)",
};

// Schema angle labels — schema.sql: angle_health, angle_economics, angle_jobs,
// angle_politics, angle_geopolitics, angle_purchasing_power
// Mapped to mockData primaryFrame as a proxy until the classifier runs.
const ANGLES = ["Health", "Economics", "Jobs", "Politics", "Geopolitics", "Purchasing Power"] as const;
type Angle = typeof ANGLES[number];

const FRAME_TO_ANGLE: Record<Frame, Angle> = {
  "Attribution of Responsibility": "Politics",
  "Human Interest":                "Health",
  "Conflict":                      "Geopolitics",
  "Morality":                      "Jobs",
  "Economic Consequences":         "Economics",
};

// Schema languages — language TEXT in articles table
// Dropdown rather than chips: list will grow (FR, NL, DE, EN…)
const LANGUAGES = ["FR", "NL", "DE", "EN"] as const;
type Language = typeof LANGUAGES[number];

function getLanguageCode(language: string | null): Language {
  if (!language) return "FR";
  const lc = language.toLowerCase();
  if (lc.includes("dutch") || lc.includes("flemish") || lc.includes("nl")) return "NL";
  if (lc.includes("german") || lc.includes("deutsch")) return "DE";
  if (lc.includes("english")) return "EN";
  return "FR";
}

// Frame → moss color mapping for the indicator bar
const FRAME_COLORS: Record<Frame, string> = {
  "Attribution of Responsibility": "#4A6741",
  "Human Interest":                "#7A9A6A",
  "Conflict":                      "#B8402E",
  "Morality":                      "#8B7355",
  "Economic Consequences":         "#A8BE8A",
};

function Rule({ color = "var(--border)", thick = false }: { color?: string; thick?: boolean }) {
  return <div style={{ borderTop: `${thick ? "2px" : "1px"} solid ${color}` }} />;
}

function ChipFilter<T extends string>({
  label, options, value, onChange, displayFn,
}: {
  label: string;
  options: readonly T[];
  value: T | "";
  onChange: (v: T | "") => void;
  displayFn?: (v: T) => string;
}) {
  return (
    <div className="flex items-center flex-wrap" style={{ gap: "4px 5px" }}>
      <span style={{
        fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
        textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 4, whiteSpace: "nowrap",
      }}>
        {label}
      </span>
      {(["", ...options] as Array<T | "">).map((opt) => {
        const active = value === opt;
        return (
          <button key={opt || "__all"} onClick={() => onChange(opt)}
            style={{
              fontFamily: F.plex, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em",
              background: active ? "var(--t1)" : "transparent",
              color: active ? "var(--bg)" : "var(--t2)",
              border: `1px solid ${active ? "var(--t1)" : "var(--border)"}`,
              padding: "3px 9px", cursor: "pointer",
              transition: "all 0.12s",
            }}
          >
            {opt ? (displayFn ? displayFn(opt) : opt) : "All"}
          </button>
        );
      })}
    </div>
  );
}

function DropFilter({ label, value, onChange, opts }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opts: readonly string[];
}) {
  return (
    <div className="flex items-center" style={{ gap: 6 }}>
      <span style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ position: "relative" }}>
        <select
          value={value} onChange={(e) => onChange(e.target.value)}
          style={{
            fontFamily: F.plex, fontSize: 11, color: "var(--t1)",
            background: "transparent", border: "none", outline: "none",
            cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.04em",
            paddingRight: 16, appearance: "none",
          }}
        >
          <option value="">All</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <div style={{ position: "absolute", right: 2, top: "52%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <svg width="7" height="4" viewBox="0 0 7 4" fill="currentColor" style={{ color: "var(--t2)" }}><path d="M0 0L3.5 4L7 0" /></svg>
        </div>
      </div>
    </div>
  );
}

const Sep = () => <div style={{ width: 1, height: 12, background: "var(--border)", flexShrink: 0, alignSelf: "center" }} />;

// ── Article item ────────────────────────────────────────────────────────────

function NewsItem({ article, index }: { article: Article; index: number }) {
  const artNo = String(index + 1).padStart(3, "0");
  const lang = getLanguageCode(article.language);
  const angle = article.primaryFrame != null ? FRAME_TO_ANGLE[article.primaryFrame] : null;
  const frameColor = article.primaryFrame != null ? FRAME_COLORS[article.primaryFrame] : "var(--t2)";
  const framePct = article.primaryFrame != null
    ? Math.round((article.frameScores[article.primaryFrame] ?? 0) * 100)
    : 0;

  return (
    <Link href={`/article/${article.id}`} className="group block h-full">
      <article className="flex flex-col h-full">

        {/* Byline row */}
        <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
          <span style={{
            fontFamily: F.plex, fontSize: 11, color: "var(--green)",
          }}>
            {article.outlet}
          </span>
          <span style={{
            fontFamily: F.plex, fontSize: 10, color: "var(--t2)",
          }}>
            {lang} · {article.publishedAt.slice(0, 10)} · #{artNo}
          </span>
        </div>

        {/* Headline */}
        <h2 className="group-hover:underline"
          style={{
            fontFamily: F.playfair, fontWeight: 700, fontSize: 20, lineHeight: "24px",
            color: "var(--t1)", marginBottom: 9,
            textDecorationThickness: "1px", textUnderlineOffset: "2px",
          }}
        >
          {article.title}
        </h2>

        {/* Word count pill */}
        <div style={{ marginBottom: 8 }}>
          <span style={{
            fontFamily: F.plex, fontSize: 10, color: "var(--t2)",
            border: "1px solid var(--border)", padding: "1px 6px",
          }}>
            {article.wordCount.toLocaleString()} words
          </span>
        </div>

        {/* Excerpt — newspaper paragraph */}
        <p style={{
          fontFamily: F.serif, fontWeight: 300, fontSize: 14, lineHeight: "22px",
          color: "var(--t1)", opacity: 0.85, flex: 1,
        }}>
          {article.excerpt}
        </p>

        {/* Frame probability bar */}
        <div style={{ marginTop: 14, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: F.plex, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--t2)" }}>
              Frame · {article.primaryFrame != null ? article.primaryFrame.split(" ").slice(0, 2).join(" ") : "—"}
            </span>
            <span style={{ fontFamily: F.plex, fontSize: 9, color: "var(--t2)" }}>
              {framePct}%
            </span>
          </div>
          <div style={{ height: 2, background: "var(--bg2)", borderRadius: 1 }}>
            <div style={{ height: "100%", width: `${framePct}%`, background: frameColor, borderRadius: 1 }} />
          </div>
        </div>

        {/* Tag line: sector · angle · stage · domain */}
        <p style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)" }}>
          {article.sector ?? "—"} · {angle ?? "—"} · {article.stage ?? "—"} · {article.crisisDomain ?? "—"}
        </p>

      </article>
    </Link>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");

  const { articles: allArticles } = useArticles();

  // Filter state — mirrors schema columns
  const [query,      setQuery]      = useState("");
  const [sector,     setSector]     = useState<Sector | "">("");
  const [domain,     setDomain]     = useState<CrisisDomain | "">("");
  const [stage,      setStage]      = useState<Stage | "">("");
  const [angle,      setAngle]      = useState<Angle | "">("");
  const [frame,      setFrame]      = useState<Frame | "">("");
  const [lang,       setLang]       = useState<Language | "">("");
  const [outlet,     setOutlet]     = useState<string>("");
  const [maxMisinfo,   setMaxMisinfo]   = useState<number>(100);
  const [page,         setPage]         = useState(0);
  const [filtersOpen,  setFiltersOpen]  = useState(true);
  const [uploadFile,   setUploadFile]   = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const PER_PAGE = 9;

  const bump = () => setPage(0);

  const results = useMemo(() => allArticles.filter((a) => {
    const q = query.toLowerCase();
    const articleAngle = a.primaryFrame != null ? FRAME_TO_ANGLE[a.primaryFrame] : null;
    return (
      (!q      || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q) || a.keywords.some((k) => k.includes(q))) &&
      (!sector || a.sector === sector) &&
      (!domain || a.crisisDomain === domain) &&
      (!stage  || a.stage === stage) &&
      (!angle  || articleAngle === angle) &&
      (!frame  || a.primaryFrame === frame) &&
      (!lang   || getLanguageCode(a.language) === lang) &&
      (!outlet || a.outlet === outlet) &&
      (a.misinformationScore == null || a.misinformationScore * 100 <= maxMisinfo)
    );
  }), [allArticles, query, sector, domain, stage, angle, frame, lang, outlet, maxMisinfo]);

  const paginated  = results.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(results.length / PER_PAGE);
  const hasFilters = !!(query || sector || domain || stage || angle || frame || lang || outlet || maxMisinfo < 100);
  const activeFilterCount = [sector, domain, stage, angle, frame, lang, outlet, maxMisinfo < 100 ? "m" : ""].filter(Boolean).length;

  const resetFilters = () => {
    setQuery(""); setSector(""); setDomain(""); setStage(""); setAngle("");
    setFrame(""); setLang(""); setOutlet(""); setMaxMisinfo(100); setPage(0);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-11">

      {/* Sub-strip — no rule beneath */}
      <div className="flex justify-between items-center py-[7px]">
        <span style={{ fontFamily: F.plex, fontSize: 13, color: "var(--t2)" }}>
          Edition II · The Reader · Search Desk
        </span>
        <span style={{ fontFamily: F.plex, fontSize: 13, color: "var(--t2)" }}>
          Updated {h}:{m} CET
        </span>
      </div>

      {/* Search as headline — centered, Playfair Display SC */}
      <div className="pt-10 pb-2">
        <input
          type="text" value={query}
          onChange={(e) => { setQuery(e.target.value); bump(); }}
          onKeyDown={(e) => e.key === "Enter" && bump()}
          placeholder="Search the archive…"
          style={{
            width: "100%", fontFamily: F.playfair,
            fontWeight: 400, fontSize: 52, lineHeight: "60px",
            color: "var(--t1)", background: "transparent", border: "none",
            borderBottom: `2px solid var(--t1)`, outline: "none",
            paddingBottom: 14, textAlign: "center", caretColor: "var(--t1)",
          }}
        />
        <div className="relative mt-3">
          <p style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 14, color: "var(--t2)", lineHeight: "22px", textAlign: "center" }}>
            {results.length.toLocaleString()} articles across {new Set(allArticles.map((a) => a.outlet)).size} outlets — {allArticles.length.toLocaleString()} total in the archive
          </p>
          <label style={{
            position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)",
            fontFamily: F.plex, fontSize: 12,
            background: "var(--t1)", color: "var(--bg)",
            padding: "6px 18px", cursor: "pointer", display: "inline-block", whiteSpace: "nowrap",
          }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              style={{ display: "none" }}
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
            {uploadFile
              ? (uploadFile.name.length > 22 ? uploadFile.name.slice(0, 22) + "…" : uploadFile.name)
              : "Upload article"}
          </label>
        </div>
      </div>

      <div className="mt-5"><Rule /></div>

      {/* Filters — collapsible */}
      <div>
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex items-center gap-2 w-full py-3"
          style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <span style={{ fontFamily: F.plex, fontSize: 13, color: "var(--t2)" }}>
            {hasFilters ? `Filters — ${activeFilterCount} applied` : "Filters"}
          </span>
          <span style={{
            fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
            display: "inline-block",
            transform: filtersOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}>
            ▾
          </span>
          {hasFilters && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); resetFilters(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); resetFilters(); } }}
              style={{
                marginLeft: "auto", fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
                textDecoration: "underline", cursor: "pointer",
              }}
            >
              Clear all
            </span>
          )}
        </button>

      <div style={{
        overflow: "hidden",
        maxHeight: filtersOpen ? 300 : 0,
        transition: "max-height 0.3s ease",
      }}>
      <div className="pb-4 space-y-3">

        {/* Row 1: Sector chips — schema: sector_transport, sector_buildings… */}
        <ChipFilter
          label="Sector"
          options={SECTORS}
          value={sector}
          onChange={(v) => { setSector(v); bump(); }}
        />

        {/* Row 2: Angle chips — schema: angle_health, angle_economics… */}
        <ChipFilter
          label="Angle"
          options={ANGLES}
          value={angle}
          onChange={(v) => { setAngle(v); bump(); }}
        />

        {/* Row 3: all dropdowns */}
        <div className="flex items-center flex-wrap" style={{ gap: "6px 0" }}>

          <DropFilter
            label="Frame"
            value={frame}
            onChange={(v) => { setFrame(v as Frame | ""); bump(); }}
            opts={FRAMES as unknown as string[]}
          />

          <div className="mx-5"><Sep /></div>

          <DropFilter
            label="Stage"
            value={stage}
            onChange={(v) => { setStage(v as Stage | ""); bump(); }}
            opts={STAGES as unknown as string[]}
          />

          <div className="mx-5"><Sep /></div>

          <DropFilter
            label="Domain"
            value={domain}
            onChange={(v) => { setDomain(v as CrisisDomain | ""); bump(); }}
            opts={CRISIS_DOMAINS as unknown as string[]}
          />

          <div className="mx-5"><Sep /></div>

          <DropFilter
            label="Language"
            value={lang}
            onChange={(v) => { setLang(v as Language | ""); bump(); }}
            opts={LANGUAGES as unknown as string[]}
          />

          <div className="mx-5"><Sep /></div>

          <DropFilter
            label="Outlet"
            value={outlet}
            onChange={(v) => { setOutlet(v); bump(); }}
            opts={Array.from(new Set(allArticles.map((a) => a.outlet))).sort()}
          />

          <div className="mx-5"><Sep /></div>

          {/* Misinfo slider */}
          <div className="flex items-center" style={{ gap: 8 }}>
            <span style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
              Misinfo ≤ {maxMisinfo}%
            </span>
            <input type="range" min={0} max={100} value={maxMisinfo}
              onChange={(e) => { setMaxMisinfo(Number(e.target.value)); bump(); }}
              style={{ width: 90, accentColor: "var(--green)" }}
            />
          </div>

        </div>
      </div>
      </div>
      </div>

      {/* Results meta + pagination */}
      <div className="flex justify-between items-center pb-2">
        <span style={{ fontFamily: F.plex, fontSize: 12, color: "var(--t2)" }}>
          Showing {paginated.length} of {results.length} matching articles
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-5">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              style={{ fontFamily: F.plex, fontSize: 12, color: page === 0 ? "var(--border)" : "var(--t1)", background: "none", border: "none", cursor: page === 0 ? "default" : "pointer" }}>
              ← Prev
            </button>
            <span style={{ fontFamily: F.plex, fontSize: 12, color: "var(--t2)" }}>
              {page + 1} / {totalPages}
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              style={{ fontFamily: F.plex, fontSize: 12, color: page >= totalPages - 1 ? "var(--border)" : "var(--t1)", background: "none", border: "none", cursor: page >= totalPages - 1 ? "default" : "pointer" }}>
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Double rule — broadsheet section break */}
      <Rule color="var(--t1)" thick />
      <div style={{ marginTop: 3 }}><Rule color="var(--t1)" /></div>

      {/* Newspaper columns */}
      {paginated.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginTop: 28 }}>
          {paginated.map((article, i) => {
            const col = i % 3;
            const isLastRow = i >= paginated.length - (paginated.length % 3 || 3);
            return (
              <div key={article.id} style={{
                borderLeft:    col > 0    ? "1px solid var(--border)" : "none",
                borderBottom:  !isLastRow ? "1px solid var(--bg2)"    : "none",
                paddingTop:    i >= 3 ? 28 : 0,
                paddingBottom: 28,
                paddingLeft:   col === 0 ? 0  : 32,
                paddingRight:  col === 2 ? 0  : 32,
              }}>
                <NewsItem article={article} index={page * PER_PAGE + i} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <p style={{ fontFamily: F.playfair, fontStyle: "italic", fontSize: 24, color: "var(--t2)" }}>
            No articles match your filters.
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 40 }}><Rule /></div>
      <div className="flex justify-between items-center py-4">
        <span style={{ fontFamily: F.plex, fontSize: 14, color: "var(--t2)" }}>
          The Climate Narrative Lab · The Reader
        </span>
        <span style={{ fontFamily: F.plex, fontSize: 14, color: "var(--t2)" }}>
          Edition II
        </span>
      </div>

    </div>
  );
}
