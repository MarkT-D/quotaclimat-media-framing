"use client";
import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
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
  "Attribution of Responsibility": "var(--red)",
  "Human Interest":                "var(--green)",
  "Conflict":                      "var(--red-m)",
  "Morality":                      "#7C3AED",
  "Economic Consequences":         "#EF9F27",
};


function countryLabel(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

// ── Upload helpers ─────────────────────────────────────────────────────────

type UploadMeta = { title: string; outlet: string; date: string; language: string };
type ClassifyResult = { frameScores: Record<string, number>; explanation: {word: string; score?: number}[] };

const FR_STOPS = new Set(["le","la","les","de","du","des","un","une","et","en","à","au","aux","est","il","elle","ils","elles","nous","vous","que","qui","pour","par","sur","avec","dans"]);

function extractMetaFromText(text: string, filename: string): UploadMeta {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const stem  = filename.replace(/\.[^.]+$/, "");

  const title = lines[0]?.slice(0, 200) || stem;

  const outletRe = /^(?:source|from|outlet|by|par|auteur)[:\s]+(.+)$/i;
  const outlet   = lines.slice(1, 5).map(l => outletRe.exec(l)?.[1]?.trim()).find(Boolean) ?? "";

  const dateRe = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2},? \d{4})\b/i;
  const rawDate = lines.slice(0, 6).map(l => dateRe.exec(l)?.[1]).find(Boolean);
  const date    = rawDate
    ? (() => { try { return new Date(rawDate).toISOString().slice(0, 10); } catch { return new Date().toISOString().slice(0, 10); } })()
    : new Date().toISOString().slice(0, 10);

  const words   = text.toLowerCase().split(/\s+/).slice(0, 200);
  const frCount = words.filter(w => FR_STOPS.has(w)).length;
  const language = filename.includes("_fr") || frCount / words.length > 0.06 ? "french" : "english";

  return { title, outlet, date, language };
}

async function extractTextFromFile(file: File): Promise<{ text: string; suggestedTitle: string }> {
  if (file.name.toLowerCase().endsWith(".txt")) {
    const text = await file.text();
    return { text, suggestedTitle: "" };
  }
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/extract-text", { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ text: string; suggestedTitle: string }>;
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
  const [dropPos, setDropPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const display = (v: string) => displayFn ? displayFn(v) : v;
  const filtered = opts.filter(o => display(o).toLowerCase().includes(inputVal.toLowerCase()));

  const openDrop = () => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(true);
  };

  return (
    <div className="flex items-center" style={{ gap: 6 }}>
      <span style={{ fontFamily: F.qtc, fontSize: 9, color: "var(--t2)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div ref={anchorRef} style={{ position: "relative" }}>
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
          <input
            value={inputVal}
            onChange={e => { setInputVal(e.target.value); openDrop(); }}
            onFocus={openDrop}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="All"
            style={{
              fontFamily: F.plex, fontSize: 11, color: "var(--t1)",
              background: "transparent", border: "none", borderBottom: "1px solid var(--border)",
              outline: "none", width: 80, padding: "1px 2px",
              textTransform: "uppercase", letterSpacing: "0.04em",
            }}
          />
        )}
        {open && filtered.length > 0 && createPortal(
          <div style={{
            position: "fixed", top: dropPos.top, left: dropPos.left,
            background: "var(--bg)", border: "1px solid var(--border)",
            zIndex: 9999, minWidth: 160,
            maxHeight: 140, overflowY: "auto",
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
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}

// ── Typing cycle for search heading ─────────────────────────────────────────

const SEARCH_PHRASES = [
  "the archive", "by keyword", "by outlet", "by sector",
  "by frame", "by angle", "by date",
] as const;

const TYPE_MS   = 75;
const DELETE_MS = 40;
const PAUSE_MS  = 2000;

function useTypingCycle(phrases: readonly string[]) {
  const [text,  setText]  = useState(phrases[0]);
  const [idx,   setIdx]   = useState(0);
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting">("pausing");

  useEffect(() => {
    const target = phrases[idx];
    let t: ReturnType<typeof setTimeout>;
    if (phase === "pausing") {
      t = setTimeout(() => setPhase("deleting"), PAUSE_MS);
    } else if (phase === "deleting") {
      if (text.length === 0) { setIdx(i => (i + 1) % phrases.length); setPhase("typing"); }
      else { t = setTimeout(() => setText(s => s.slice(0, -1)), DELETE_MS); }
    } else {
      if (text.length < target.length) { t = setTimeout(() => setText(target.slice(0, text.length + 1)), TYPE_MS); }
      else { setPhase("pausing"); }
    }
    return () => clearTimeout(t);
  }, [text, phase, idx, phrases]);

  return text;
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

        {/* Read time pill */}
        <div style={{ marginBottom: 8 }}>
          <span style={{
            fontFamily: F.plex, fontSize: 10, color: "var(--t2)",
            border: "1px solid var(--border)", padding: "1px 6px",
          }}>
            {Math.max(1, Math.ceil(article.wordCount / 200))} min read
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
          {[article.sector ?? "—", article.primaryAngle, article.stages[0], article.crisisDomains[0]].filter(Boolean).join(" · ")}
        </p>

      </article>
    </Link>
  );
}

// ── Inner page ────────────────────────────────────────────────────────────

function SearchPageInner() {
  const { articles: allArticles } = useArticles();
  const searchParams = useSearchParams();
  const router = useRouter();
  const cycleText = useTypingCycle(SEARCH_PHRASES);

  const countryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    allArticles.forEach((a) => { if (a.country) counts.set(a.country, (counts.get(a.country) ?? 0) + 1); });
    return [...counts.entries()]
      .filter(([, n]) => n >= 100)
      .sort((a, b) => b[1] - a[1])
      .map(([code]) => code);
  }, [allArticles]);

  const availableLanguages = useMemo(() => {
    const codes = new Set(allArticles.map(a => getLanguageCode(a.language)));
    return LANGUAGES.filter(l => codes.has(l));
  }, [allArticles]);

  const [query,      setQuery]      = useState(searchParams.get("q")       ?? "");
  const [sector,     setSector]     = useState<Sector | "">((searchParams.get("sector")  as Sector) ?? "");
  const [domain,     setDomain]     = useState<CrisisDomain | "">((searchParams.get("domain") as CrisisDomain) ?? "");
  const [stage,      setStage]      = useState<Stage | "">((searchParams.get("stage")   as Stage)   ?? "");
  const [angle,      setAngle]      = useState<Angle | "">((searchParams.get("angle")   as Angle)   ?? "");
  const [frame,      setFrame]      = useState<Frame | "">((searchParams.get("frame")   as Frame)   ?? "");
  const [lang,       setLang]       = useState<Language | "">((searchParams.get("lang") as Language) ?? "");
  const [outlet,     setOutlet]     = useState<string>(searchParams.get("outlet") ?? "");

  const [country,    setCountry]    = useState<string>(searchParams.get("country") ?? "");
  const [dateFrom,   setDateFrom]   = useState<string>(searchParams.get("dateFrom") ?? "");
  const [dateTo,     setDateTo]     = useState<string>(searchParams.get("dateTo")   ?? "");
  const [page,       setPage]       = useState(0);
  const [perPage,    setPerPage]    = useState(9);
  const [filtersOpen,      setFiltersOpen]      = useState(true);
  const [uploadFile,       setUploadFile]       = useState<File | null>(null);
  const [uploadText,       setUploadText]       = useState<string | null>(null);
  const [uploadMeta,       setUploadMeta]       = useState<UploadMeta | null>(null);
  const [uploadExtracting, setUploadExtracting] = useState(false);
  const [uploadSaving,     setUploadSaving]     = useState(false);
  const [classifyPromise,  setClassifyPromise]  = useState<Promise<ClassifyResult | null> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bump = () => setPage(0);

  async function handleFileSelected(file: File) {
    setUploadFile(file);
    setUploadText(null);
    setUploadMeta(null);
    setUploadExtracting(true);
    try {
      const { text, suggestedTitle } = await extractTextFromFile(file);
      const meta = extractMetaFromText(text, file.name);
      if (suggestedTitle && !meta.title) meta.title = suggestedTitle;
      setUploadText(text);
      setUploadMeta(meta);
      const p: Promise<ClassifyResult | null> = fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: meta.title + " " + text }),
      }).then(r => r.ok ? r.json() as Promise<ClassifyResult> : null).catch(() => null);
      setClassifyPromise(p);
    } finally {
      setUploadExtracting(false);
    }
  }

  function resetUpload() {
    setUploadFile(null);
    setUploadText(null);
    setUploadMeta(null);
    setClassifyPromise(null);
    setUploadSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUploadSave() {
    if (!uploadText || !uploadMeta) return;
    setUploadSaving(true);
    const classifyResult = classifyPromise ? await classifyPromise : null;
    const wordCount = uploadText.trim().split(/\s+/).length;
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       uploadMeta.title,
          outlet:      uploadMeta.outlet || "Unknown",
          publishedAt: uploadMeta.date,
          language:    uploadMeta.language,
          body:        uploadText,
          wordCount,
          frameScores: classifyResult?.frameScores ?? {},
          explanation: classifyResult?.explanation ?? [],
        }),
      });
      const { id } = await res.json() as { id: number };
      router.push(`/article/art-${id}`);
    } catch {
      setUploadSaving(false);
    }
  }

  const results = useMemo(() => allArticles.filter((a) => {
    const q = query.toLowerCase();
    return (
      (!q       || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q) || a.keywords.some((k) => k.includes(q))) &&
      (!sector  || a.sector === sector) &&
      (!domain  || a.crisisDomains.includes(domain)) &&
      (!stage   || a.stages.includes(stage)) &&
      (!angle   || a.primaryAngle === angle) &&
      (!frame   || a.primaryFrame === frame) &&
      (!lang    || getLanguageCode(a.language) === lang) &&
      (!outlet  || a.outlet === outlet) &&
      (!country  || a.country === country) &&
      (!dateFrom || a.publishedAt >= dateFrom) &&
      (!dateTo   || a.publishedAt <= dateTo) &&
      true
    );
  }), [allArticles, query, sector, domain, stage, angle, frame, lang, outlet, country, dateFrom, dateTo]);

  const paginated  = results.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(results.length / perPage);
  const hasFilters = !!(query || sector || domain || stage || angle || frame || lang || outlet || country || dateFrom || dateTo);
  const activeFilterCount = [sector, domain, stage, angle, frame, lang, outlet, country, dateFrom || dateTo ? "d" : ""].filter(Boolean).length;

  const resetFilters = () => {
    setQuery(""); setSector(""); setDomain(""); setStage(""); setAngle("");
    setFrame(""); setLang(""); setOutlet(""); setCountry(""); setDateFrom(""); setDateTo(""); setPage(0);
  };

  function fmtDate(d: string) {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="max-w-[1440px] mx-auto px-11">

      {/* Filter toolbar */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 0", paddingTop: 36 }}>

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
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); }}
            />
            {uploadExtracting ? "Reading…" : uploadFile
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
                label="Language" value={lang} opts={availableLanguages}
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
            </div>

          </div>
        </div>
      </div>

      {/* Upload panel */}
      {uploadText !== null && uploadMeta !== null && (
        <div style={{ borderTop: "2px solid var(--t1)", padding: "18px 0 22px", marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <span style={{ fontFamily: F.playfair, fontSize: 20, color: "var(--t1)" }}>Analyse &amp; save</span>
            <button onClick={resetUpload} style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t2)", background: "none", border: "none", cursor: "pointer" }}>× dismiss</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0 24px", marginBottom: 18 }}>
            {([
              { label: "Title",    key: "title"    as const, type: "text" },
              { label: "Outlet",   key: "outlet"   as const, type: "text" },
              { label: "Date",     key: "date"     as const, type: "date" },
              { label: "Language", key: "language" as const, type: "text" },
            ] as const).map(({ label, key, type }) => (
              <div key={key}>
                <div style={{ fontFamily: F.qtc, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t2)", marginBottom: 4 }}>{label}</div>
                <input
                  type={type}
                  value={uploadMeta[key]}
                  onChange={e => setUploadMeta(m => m ? { ...m, [key]: e.target.value } : m)}
                  style={{
                    width: "100%", fontFamily: F.plex, fontSize: 13, color: "var(--t1)",
                    background: "transparent", border: "none",
                    borderBottom: "1px solid var(--border)", outline: "none", padding: "3px 0",
                  }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleUploadSave}
            disabled={uploadSaving || !uploadMeta.outlet.trim()}
            style={{
              fontFamily: F.plex, fontSize: 12,
              background: uploadSaving ? "var(--t2)" : "var(--t1)", color: "var(--bg)",
              padding: "7px 22px", cursor: uploadSaving ? "default" : "pointer",
              border: "none", opacity: !uploadMeta.outlet.trim() ? 0.5 : 1,
            }}
          >
            {uploadSaving ? "Saving…" : "Save & View →"}
          </button>
          <span style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t2)", marginLeft: 12 }}>
            {classifyPromise ? "Classifier running in background…" : ""}
          </span>
        </div>
      )}

      {/* Search input — below filters, typing effect as background text */}
      <div style={{ position: "relative", marginTop: 20, marginBottom: 4 }}>
        {!query && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, pointerEvents: "none",
            fontFamily: F.playfair, fontWeight: 400, fontSize: 26, lineHeight: "34px",
            color: "var(--t2)",
          }}>
            Search <span>{cycleText}</span>
            <span className="typing-cursor" />
          </div>
        )}
        <input
          type="text" value={query}
          onChange={(e) => { setQuery(e.target.value); bump(); }}
          onKeyDown={(e) => e.key === "Enter" && bump()}
          style={{
            width: "100%", fontFamily: F.playfair, fontWeight: 400,
            fontSize: 26, lineHeight: "34px",
            color: "var(--t1)", background: "transparent",
            border: "none", borderBottom: "1px solid var(--border)",
            outline: "none", padding: "0 0 10px",
            caretColor: "var(--t1)",
          }}
        />
      </div>

      {/* Results meta + pagination */}
      <div className="flex justify-between items-center pb-2">
        <span style={{ fontFamily: F.plex, fontSize: 12, color: "var(--t2)" }}>
          Showing {paginated.length} of {results.length.toLocaleString()} articles
        </span>
        <div className="flex items-center gap-5">
          {/* Per-page selector */}
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t2)" }}>Per page</span>
            <select
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setPage(0); }}
              style={{
                fontFamily: F.plex, fontSize: 11, color: "var(--t1)",
                background: "transparent", border: "1px solid var(--border)",
                outline: "none", padding: "2px 6px", cursor: "pointer",
              }}
            >
              {[9, 18, 36, 72].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          {/* Page navigation */}
          {totalPages > 1 && (
            <>
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                style={{ fontFamily: F.plex, fontSize: 12, color: page === 0 ? "var(--border)" : "var(--t1)", background: "none", border: "none", cursor: page === 0 ? "default" : "pointer" }}>
                ← Prev
              </button>
              <div className="flex items-center gap-1">
                <input
                  type="number" min={1} max={totalPages}
                  value={page + 1}
                  onChange={e => {
                    const v = Math.max(1, Math.min(totalPages, Number(e.target.value) || 1));
                    setPage(v - 1);
                  }}
                  style={{
                    fontFamily: F.plex, fontSize: 12, color: "var(--t1)",
                    background: "transparent", border: "none",
                    borderBottom: "1px solid var(--border)",
                    outline: "none", width: 36, textAlign: "center", padding: "1px 2px",
                  }}
                />
                <span style={{ fontFamily: F.plex, fontSize: 12, color: "var(--t2)" }}>/ {totalPages}</span>
              </div>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                style={{ fontFamily: F.plex, fontSize: 12, color: page >= totalPages - 1 ? "var(--border)" : "var(--t1)", background: "none", border: "none", cursor: page >= totalPages - 1 ? "default" : "pointer" }}>
                Next →
              </button>
            </>
          )}
        </div>
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
                <NewsItem article={article} index={page * perPage + i} />
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
