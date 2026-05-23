"use client";
import { useState, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  SECTORS, CRISIS_DOMAINS, STAGES, FRAMES,
  type Sector, type CrisisDomain, type Stage, type Frame, type Article,
} from "@/lib/articleTypes";
import { useArticles } from "@/lib/useArticles";
import { exportToCsv, articleToCsvRow } from "@/lib/exportCsv";

const F = {
  playfair: "var(--font-playfair)",
  serif:    "var(--font-source-serif)",
  plex:     "var(--font-plex-sans)",
  qtc:      "var(--font-quantico)",
};

const ANGLES = ["Health", "Economics", "Jobs", "Politics", "Geopolitics", "Purchasing Power"] as const;
type Angle = typeof ANGLES[number];


const LANGUAGES = ["FR", "NL", "DE", "EN"] as const;
type Language = typeof LANGUAGES[number];

const LANGUAGE_NAMES: Record<string, string> = {
  FR: "French", NL: "Dutch", DE: "German", EN: "English",
};

const FRAME_SHORT: Record<string, string> = {
  "Attribution of Responsibility": "Attribution",
  "Human Interest":                "Human Interest",
  "Conflict":                      "Conflict",
  "Morality":                      "Morality",
  "Economic Consequences":         "Economic",
};

function getLanguageCode(language: string | null): Language {
  if (!language) return "FR";
  const lc = language.toLowerCase();
  if (lc.includes("dutch") || lc.includes("flemish") || lc.includes("nl")) return "NL";
  if (lc.includes("german") || lc.includes("deutsch")) return "DE";
  if (lc.includes("english")) return "EN";
  return "FR";
}

const FRAME_COLORS: Record<Frame, string> = {
  "Attribution of Responsibility": "var(--green)",
  "Human Interest":                "var(--green-d)",
  "Conflict":                      "var(--red)",
  "Morality":                      "#7C3AED",
  "Economic Consequences":         "var(--green-m)",
};


function countryLabel(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

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
        fontFamily: F.qtc, fontSize: 9, color: "var(--t2)",
        textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4, whiteSpace: "nowrap",
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
      <span style={{ fontFamily: F.qtc, fontSize: 9, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
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

function SearchFilter({ label, value, onChange, opts, displayFn }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  opts: readonly string[];
  displayFn?: (v: string) => string;
}) {
  const [inputVal, setInputVal] = useState("");
  const [open, setOpen] = useState(false);
  const display = (v: string) => displayFn ? displayFn(v) : v;
  const filtered = opts
    .filter(o => display(o).toLowerCase().includes(inputVal.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="flex items-center" style={{ gap: 6 }}>
      <span style={{ fontFamily: F.qtc, fontSize: 9, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ position: "relative" }}>
        {value ? (
          <button
            onClick={() => { onChange(""); setInputVal(""); }}
            style={{
              fontFamily: F.plex, fontSize: 11, color: "var(--t1)",
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}
          >
            {display(value)} <span style={{ fontSize: 10, color: "var(--t2)" }}>×</span>
          </button>
        ) : (
          <>
            <input
              value={inputVal}
              onChange={e => { setInputVal(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="All"
              style={{
                fontFamily: F.plex, fontSize: 11, color: "var(--t1)",
                background: "transparent", border: "none", borderBottom: "1px solid var(--border)",
                outline: "none", width: 80, padding: "1px 2px",
                textTransform: "uppercase", letterSpacing: "0.04em",
              }}
            />
            {open && filtered.length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0,
                background: "var(--bg)", border: "1px solid var(--border)",
                zIndex: 20, minWidth: 160, maxHeight: 220, overflowY: "auto",
              }}>
                {filtered.map(o => (
                  <button
                    key={o}
                    onMouseDown={() => { onChange(o); setInputVal(""); setOpen(false); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      fontFamily: F.plex, fontSize: 11, color: "var(--t1)",
                      background: "none", border: "none", cursor: "pointer",
                      padding: "5px 10px",
                      textTransform: "uppercase", letterSpacing: "0.04em",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bg2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                  >
                    {display(o)}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Article item ────────────────────────────────────────────────────────────

function NewsItem({ article, index }: { article: Article; index: number }) {
  const artNo = String(index + 1).padStart(3, "0");
  const lang = getLanguageCode(article.language);
  const frameColor = article.primaryFrame != null ? FRAME_COLORS[article.primaryFrame] : "var(--t2)";
  const framePct = article.primaryFrame != null
    ? Math.round((article.frameScores[article.primaryFrame] ?? 0) * 100)
    : 0;

  return (
    <Link href={`/article/${article.id}`} className="group block h-full">
      <article className="flex flex-col h-full">

        {/* Byline row */}
        <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
          <span style={{ fontFamily: F.plex, fontSize: 11, color: "var(--green)" }}>
            {article.outlet}
          </span>
          <span style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)" }}>
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

        {/* Excerpt */}
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
          <div style={{ height: 2, background: "var(--bg2)" }}>
            <div style={{ height: "100%", width: `${framePct}%`, background: frameColor }} />
          </div>
        </div>

        {/* Tag line */}
        <p style={{ fontFamily: F.plex, fontSize: 10, color: "var(--t2)" }}>
          {[article.sector ?? "—", article.primaryAngle, article.stage, article.crisisDomain].filter(Boolean).join(" · ")}
        </p>

      </article>
    </Link>
  );
}

// ── Inner page ────────────────────────────────────────────────────────────

function SearchPageInner() {
  const { articles: allArticles } = useArticles();
  const searchParams = useSearchParams();

  const countryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    allArticles.forEach((a) => { if (a.country) counts.set(a.country, (counts.get(a.country) ?? 0) + 1); });
    return [...counts.entries()]
      .filter(([, n]) => n >= 100)
      .sort((a, b) => b[1] - a[1])
      .map(([code]) => code);
  }, [allArticles]);

  const [query,      setQuery]      = useState(searchParams.get("q")       ?? "");
  const [sector,     setSector]     = useState<Sector | "">((searchParams.get("sector")  as Sector) ?? "");
  const [domain,     setDomain]     = useState<CrisisDomain | "">((searchParams.get("domain") as CrisisDomain) ?? "");
  const [stage,      setStage]      = useState<Stage | "">((searchParams.get("stage")   as Stage)   ?? "");
  const [angle,      setAngle]      = useState<Angle | "">((searchParams.get("angle")   as Angle)   ?? "");
  const [frame,      setFrame]      = useState<Frame | "">((searchParams.get("frame")   as Frame)   ?? "");
  const [lang,       setLang]       = useState<Language | "">((searchParams.get("lang") as Language) ?? "");
  const [outlet,     setOutlet]     = useState<string>(searchParams.get("outlet") ?? "");
  const [maxMisinfo, setMaxMisinfo] = useState<number>(Number(searchParams.get("misinfo") ?? 100));
  const [country,    setCountry]    = useState<string>(searchParams.get("country") ?? "");
  const [dateFrom,   setDateFrom]   = useState<string>(searchParams.get("dateFrom") ?? "");
  const [dateTo,     setDateTo]     = useState<string>(searchParams.get("dateTo")   ?? "");
  const [page,       setPage]       = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [uploadFile,  setUploadFile]  = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const PER_PAGE = 9;

  const bump = () => setPage(0);

  const results = useMemo(() => allArticles.filter((a) => {
    const q = query.toLowerCase();
    return (
      (!q       || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q) || a.keywords.some((k) => k.includes(q))) &&
      (!sector  || a.sector === sector) &&
      (!domain  || a.crisisDomain === domain) &&
      (!stage   || a.stage === stage) &&
      (!angle   || a.primaryAngle === angle) &&
      (!frame   || a.primaryFrame === frame) &&
      (!lang    || getLanguageCode(a.language) === lang) &&
      (!outlet  || a.outlet === outlet) &&
      (!country  || a.country === country) &&
      (!dateFrom || a.publishedAt >= dateFrom) &&
      (!dateTo   || a.publishedAt <= dateTo) &&
      (a.misinformationScore == null || a.misinformationScore * 100 <= maxMisinfo)
    );
  }), [allArticles, query, sector, domain, stage, angle, frame, lang, outlet, country, dateFrom, dateTo, maxMisinfo]);

  const paginated  = results.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(results.length / PER_PAGE);
  const hasFilters = !!(query || sector || domain || stage || angle || frame || lang || outlet || country || dateFrom || dateTo || maxMisinfo < 100);
  const activeFilterCount = [sector, domain, stage, angle, frame, lang, outlet, country, dateFrom || dateTo ? "d" : "", maxMisinfo < 100 ? "m" : ""].filter(Boolean).length;

  const resetFilters = () => {
    setQuery(""); setSector(""); setDomain(""); setStage(""); setAngle("");
    setFrame(""); setLang(""); setOutlet(""); setCountry(""); setDateFrom(""); setDateTo(""); setMaxMisinfo(100); setPage(0);
  };

  function fmtDate(d: string) {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="max-w-[1440px] mx-auto px-11">

      {/* Search input */}
      <div className="pt-10 pb-2">
        <input
          type="text" value={query}
          onChange={(e) => { setQuery(e.target.value); bump(); }}
          onKeyDown={(e) => e.key === "Enter" && bump()}
          placeholder="Search the archive…"
          style={{
            width: "100%", fontFamily: F.playfair,
            fontWeight: 400, fontSize: 36, lineHeight: "40px",
            color: "var(--t1)", background: "transparent", border: "none",
            borderBottom: "2px solid var(--t1)", outline: "none",
            paddingBottom: 12, textAlign: "center", caretColor: "var(--t1)",
          }}
        />
      </div>

      {/* Filter toolbar */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 0", marginTop: 12 }}>

        {/* Left — active filter state */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          {hasFilters && (
            <>
              <span style={{
                fontFamily: F.plex, fontSize: 10,
                background: "var(--t1)", color: "var(--bg)",
                padding: "2px 7px",
              }}>
                {activeFilterCount} applied
              </span>
              <button
                onClick={resetFilters}
                style={{
                  fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
                  background: "none", border: "none", cursor: "pointer",
                  textDecoration: "underline", textUnderlineOffset: "2px",
                }}
              >
                Clear
              </button>
            </>
          )}
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); bump(); }} style={{
              fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
              border: "1px solid var(--border)", background: "transparent",
              padding: "2px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}>
              {dateFrom ? fmtDate(dateFrom) : "…"} – {dateTo ? fmtDate(dateTo) : "…"} <span style={{ fontSize: 10 }}>×</span>
            </button>
          )}
          {country && (
            <button onClick={() => { setCountry(""); bump(); }} style={{
              fontFamily: F.plex, fontSize: 11, color: "var(--t2)",
              border: "1px solid var(--border)", background: "transparent",
              padding: "2px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
            }}>
              {countryLabel(country)} <span style={{ fontSize: 10 }}>×</span>
            </button>
          )}
        </div>

        {/* Center — filters toggle */}
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            fontFamily: F.qtc, fontSize: 13, letterSpacing: "0.08em",
            textTransform: "uppercase", color: filtersOpen ? "var(--t1)" : "var(--t2)",
            background: "none", border: "none", padding: "7px 14px", cursor: "pointer",
            transition: "color 0.15s",
          }}
        >
          Filters
          <span style={{
            display: "inline-block",
            transform: filtersOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease", lineHeight: 1,
          }}>▾</span>
        </button>

        {/* Right — actions */}
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => exportToCsv(results.map(articleToCsvRow), "articles-export.csv")}
            style={{
              fontFamily: F.qtc, fontSize: 9, letterSpacing: "0.08em",
              textTransform: "uppercase", color: "var(--t2)",
              background: "none", border: "1px solid var(--border)",
              padding: "5px 12px", cursor: "pointer",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--t1)"; e.currentTarget.style.color = "var(--t1)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--t2)"; }}
          >
            ↓ Export CSV
          </button>
          <label style={{
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

      {/* Filter panel */}
      <div style={{
        overflow: "hidden",
        maxHeight: filtersOpen ? 400 : 0,
        transition: "max-height 0.3s ease",
      }}>
        <div style={{ background: "var(--bg2)", padding: "14px 16px", marginBottom: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Row 1: Sector chips */}
            <ChipFilter label="Sector" options={SECTORS} value={sector} onChange={(v) => { setSector(v); bump(); }} />

            {/* Row 2: Angle chips */}
            <ChipFilter label="Angle" options={ANGLES} value={angle} onChange={(v) => { setAngle(v); bump(); }} />

            {/* Row 3: Frame chips */}
            <ChipFilter
              label="Frame" options={FRAMES} value={frame as Frame | ""}
              onChange={(v) => { setFrame(v); bump(); }}
              displayFn={(f) => FRAME_SHORT[f] ?? f}
            />

            {/* Row 4: Searchable filters — Language, Country, Outlet */}
            <div className="flex items-center flex-wrap" style={{ gap: "8px 24px" }}>
              <SearchFilter
                label="Language" value={lang} opts={LANGUAGES}
                onChange={(v) => { setLang(v as Language | ""); bump(); }}
                displayFn={(l) => LANGUAGE_NAMES[l] ?? l}
              />
              {countryOptions.length > 0 && (
                <SearchFilter
                  label="Country" value={country} opts={countryOptions}
                  onChange={(v) => { setCountry(v); bump(); }}
                  displayFn={countryLabel}
                />
              )}
              <SearchFilter
                label="Outlet" value={outlet}
                opts={Array.from(new Set(allArticles.map((a) => a.outlet))).sort()}
                onChange={(v) => { setOutlet(v); bump(); }}
              />
            </div>

            {/* Row 5: Date range + Stage + Domain + Misinfo */}
            <div className="flex items-center flex-wrap" style={{ gap: "8px 20px" }}>
              <div className="flex items-center" style={{ gap: 8 }}>
                <span style={{ fontFamily: F.qtc, fontSize: 9, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>From</span>
                <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); bump(); }}
                  style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t1)", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", outline: "none", cursor: "pointer", padding: "1px 4px" }}
                />
                <span style={{ fontFamily: F.qtc, fontSize: 9, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.08em" }}>To</span>
                <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); bump(); }}
                  style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t1)", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", outline: "none", cursor: "pointer", padding: "1px 4px" }}
                />
              </div>
              <DropFilter label="Stage"  value={stage}  onChange={(v) => { setStage(v as Stage | ""); bump(); }}         opts={STAGES as unknown as string[]} />
              <DropFilter label="Domain" value={domain} onChange={(v) => { setDomain(v as CrisisDomain | ""); bump(); }} opts={CRISIS_DOMAINS as unknown as string[]} />
              <div className="flex items-center" style={{ gap: 8 }}>
                <span style={{ fontFamily: F.qtc, fontSize: 9, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
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
          Showing {paginated.length} of {results.length.toLocaleString()} articles
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

      {/* Broadsheet section break */}
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
          The Climate Narrative Review · The Reader
        </span>
        <span style={{ fontFamily: F.plex, fontSize: 14, color: "var(--t2)" }}>
          Edition II
        </span>
      </div>

    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}
