"use client";
import { useState, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { countryName } from "@/lib/countryName";

const F = {
  playfair: "var(--font-playfair)",
  plex:     "var(--font-plex-sans)",
  qtc:      "var(--font-quantico)",
};

// ── Types ──────────────────────────────────────────────────────────────────────

type UploadMeta = {
  title: string; outlet: string; date: string;
  language: string; country: string; sector: string;
};
type ClassifyResult = {
  frameScores: Record<string, number>;
  explanation: Record<string, number>;
  angleScores?: Record<string, number>;
  explanationAngles?: Record<string, number>;
};
type Suggestions = { outlets: string[]; languages: string[]; countries: string[]; sectors: string[] };

// ── Country name ↔ ISO-2 ───────────────────────────────────────────────────────

const COUNTRY_TO_ISO: Record<string, string> = {
  "France": "FR", "Belgium": "BE", "Germany": "DE", "Netherlands": "NL",
  "United Kingdom": "GB", "Switzerland": "CH", "Austria": "AT",
  "Spain": "ES", "Italy": "IT", "Portugal": "PT", "Luxembourg": "LU",
  "Ireland": "IE", "Denmark": "DK", "Sweden": "SE", "Norway": "NO",
  "Finland": "FI", "Poland": "PL", "Czech Republic": "CZ", "Slovakia": "SK",
  "Hungary": "HU", "Romania": "RO", "Bulgaria": "BG", "Greece": "GR",
  "Croatia": "HR", "Slovenia": "SI", "Serbia": "RS", "Ukraine": "UA",
  "Russia": "RU", "Turkey": "TR", "United States": "US", "Canada": "CA",
  "Australia": "AU", "Japan": "JP", "China": "CN", "Brazil": "BR",
};
const ALL_COUNTRY_NAMES = Object.keys(COUNTRY_TO_ISO).sort();

// ── Normalisation ──────────────────────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  fr: "french", french: "french", français: "french", francais: "french",
  nl: "dutch",  dutch: "dutch",   nederlands: "dutch", flemish: "dutch",
  de: "german", german: "german", deutsch: "german",
  en: "english", english: "english",
  es: "spanish", spanish: "spanish",
  it: "italian", italian: "italian",
  pt: "portuguese", portuguese: "portuguese",
};

function normLanguage(v: string) { return LANG_MAP[v.trim().toLowerCase()] ?? v.trim().toLowerCase(); }

function normCountry(v: string): string {
  const trimmed = v.trim();
  if (COUNTRY_TO_ISO[trimmed]) return trimmed;           // already a full name
  const upper = trimmed.toUpperCase();
  const fromCode = countryName(upper);                   // Intl.DisplayNames: "FR" → "France"
  if (fromCode !== "—" && fromCode !== upper) return fromCode;
  const lower = trimmed.toLowerCase();
  return ALL_COUNTRY_NAMES.find(n => n.toLowerCase() === lower) ?? trimmed;
}

function countryToISO(v: string): string {
  return COUNTRY_TO_ISO[v.trim()] ?? (v.trim().length === 2 ? v.trim().toUpperCase() : v.trim());
}

function normSector(v: string, sectors: string[]): string {
  return sectors.find(s => s.toLowerCase() === v.trim().toLowerCase()) ?? v.trim();
}

// ── Text extraction ────────────────────────────────────────────────────────────

const FR_STOPS = new Set([
  "le","la","les","de","du","des","un","une","et","en","à","au","aux",
  "est","il","elle","ils","elles","nous","vous","que","qui","pour","par","sur","avec","dans",
]);

function extractMeta(text: string, filename: string): UploadMeta {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const stem  = filename.replace(/\.[^.]+$/, "");
  const title = lines[0]?.slice(0, 200) || stem;

  const outletRe = /^(?:source|from|outlet|by|par|auteur)[:\s]+(.+)$/i;
  const outlet   = lines.slice(1, 5).map(l => outletRe.exec(l)?.[1]?.trim()).find(Boolean) ?? "";

  const dateRe  = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2},? \d{4})\b/i;
  const rawDate = lines.slice(0, 6).map(l => dateRe.exec(l)?.[1]).find(Boolean);
  const date    = rawDate
    ? (() => { try { return new Date(rawDate).toISOString().slice(0, 10); } catch { return new Date().toISOString().slice(0, 10); } })()
    : new Date().toISOString().slice(0, 10);

  const words    = text.toLowerCase().split(/\s+/).slice(0, 200);
  const frCount  = words.filter(w => FR_STOPS.has(w)).length;
  const language = filename.includes("_fr") || frCount / words.length > 0.06 ? "french" : "english";

  return { title, outlet, date, language, country: "", sector: "" };
}

const API = "http://localhost:8000";

async function extractText(file: File): Promise<{ text: string; suggestedTitle: string }> {
  if (file.name.toLowerCase().endsWith(".txt")) return { text: await file.text(), suggestedTitle: "" };
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(`${API}/extract-text`, { method: "POST", body: form });
  } catch {
    throw new Error("PDF/DOCX extraction requires the API server (localhost:8000). Run: npm run dev:full");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? body?.error ?? "Text extraction failed");
  }
  return res.json() as Promise<{ text: string; suggestedTitle: string }>;
}

// ── Autocomplete input ────────────────────────────────────────────────────────

function Autocomplete({
  label, value, suggestions, type = "text", span,
  onChange, onBlur,
}: {
  label: string; value: string; suggestions: string[]; type?: string;
  span?: boolean; onChange: (v: string) => void; onBlur?: () => void;
}) {
  const [open, setOpen]       = useState(false);
  const [active, setActive]   = useState(-1);
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = value.trim()
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : suggestions.slice(0, 8);

  function select(s: string) {
    onChange(s);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) { if (e.key === "ArrowDown") { setOpen(true); setActive(0); } return; }
    if (e.key === "ArrowDown")  { e.preventDefault(); setActive(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")    { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && active >= 0) { e.preventDefault(); select(filtered[active]); }
    if (e.key === "Escape")     { setOpen(false); setActive(-1); }
  }

  return (
    <div ref={wrapRef} style={{ gridColumn: span ? "1 / -1" : undefined, position: "relative" }}>
      <div style={{
        fontFamily: F.qtc, fontSize: 9, textTransform: "uppercase",
        letterSpacing: "0.08em", color: "var(--t2)", marginBottom: 6,
      }}>
        {label}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete="off"
        onChange={e => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setTimeout(() => { setOpen(false); onBlur?.(); }, 150); }}
        onKeyDown={onKeyDown}
        style={{
          width: "100%", fontFamily: F.plex, fontSize: 13, color: "var(--t1)",
          background: "transparent", border: "none",
          borderBottom: "1px solid var(--border)", outline: "none", padding: "4px 0",
        }}
      />
      {open && filtered.length > 0 && (
        <div
          onMouseDown={e => e.preventDefault()}
          style={{
            position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 200,
            background: "var(--bg)", border: "1px solid var(--t1)",
            maxHeight: 200, overflowY: "auto",
          }}
        >
          {filtered.map((s, i) => (
            <div
              key={s}
              onClick={() => select(s)}
              style={{
                padding: "7px 12px",
                fontFamily: F.plex, fontSize: 12, color: "var(--t1)",
                background: i === active ? "var(--bg2)" : "transparent",
                cursor: "pointer", borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none",
              }}
              onMouseEnter={() => setActive(i)}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function UploadPanel({ onSaved }: { onSaved: (id: number) => void }) {
  const [file,        setFile]        = useState<File | null>(null);
  const [text,        setText]        = useState<string | null>(null);
  const [meta,        setMeta]        = useState<UploadMeta | null>(null);
  const [extracting,  setExtracting]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [classifyP,   setClassifyP]   = useState<Promise<ClassifyResult | null> | null>(null);
  const [mounted,     setMounted]     = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions>({ outlets: [], languages: [], countries: [], sectors: [] });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    fetch("/api/meta").then(r => r.json()).then((d: Suggestions) => {
      setSuggestions({
        ...d,
        countries: [...new Set([
          ...d.countries.map(c => countryName(c) === "—" ? c : countryName(c)),
          ...ALL_COUNTRY_NAMES,
        ])].sort(),
      });
    }).catch(() => null);
  }, []);

  function set(key: keyof UploadMeta, value: string) {
    setMeta(m => m ? { ...m, [key]: value } : m);
  }

  function norm(key: keyof UploadMeta) {
    if (!meta) return;
    if (key === "language") set("language", normLanguage(meta.language));
    if (key === "country")  set("country",  normCountry(meta.country));
    if (key === "sector")   set("sector",   normSector(meta.sector, suggestions.sectors));
  }

  async function onFileSelected(f: File) {
    setFile(f); setText(null); setMeta(null); setError(null); setExtracting(true);
    try {
      const { text: t, suggestedTitle } = await extractText(f);
      const m = extractMeta(t, f.name);
      if (suggestedTitle && !m.title) m.title = suggestedTitle;
      setText(t); setMeta(m);
      const p: Promise<ClassifyResult | null> = fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: m.title + " " + t }),
      }).then(r => r.ok ? r.json() as Promise<ClassifyResult> : null).catch(() => null);
      setClassifyP(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read file. Make sure the API server is running for PDF/DOCX.");
    } finally {
      setExtracting(false);
    }
  }

  function reset() {
    setFile(null); setText(null); setMeta(null); setError(null);
    setClassifyP(null); setSaving(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function save() {
    if (!text || !meta) return;
    setSaving(true);
    const result = classifyP ? await classifyP : null;
    const wordCount = text.trim().split(/\s+/).length;
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:             meta.title,
          outlet:            meta.outlet || "Unknown",
          publishedAt:       meta.date,
          language:          meta.language || null,
          country:           meta.country ? countryToISO(meta.country) : null,
          sector:            meta.sector  || null,
          body:              text,
          wordCount,
          frameScores:       result?.frameScores ?? {},
          explanationFrames: result?.explanation ?? {},
          angleScores:       result?.angleScores ?? {},
          explanationAngles: result?.explanationAngles ?? {},
        }),
      });
      const { id } = await res.json() as { id: number };
      onSaved(id);
    } catch {
      setSaving(false);
    }
  }

  const btnLabel = extracting
    ? "Reading…"
    : file ? (file.name.length > 22 ? file.name.slice(0, 22) + "…" : file.name)
    : "Upload article";

  const showModal = mounted && (text !== null || error !== null);

  return (
    <>
      <label style={{
        fontFamily: F.plex, fontSize: 12,
        background: extracting ? "var(--t2)" : "var(--t1)", color: "var(--bg)",
        padding: "6px 18px", cursor: extracting ? "default" : "pointer",
        display: "inline-block", whiteSpace: "nowrap",
      }}>
        <input ref={inputRef} type="file" accept=".txt,.pdf,.doc,.docx" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelected(f); }} />
        {btnLabel}
      </label>

      {showModal && createPortal(
        <div onClick={e => { if (e.target === e.currentTarget) reset(); }} style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "var(--bg)", width: 620, maxWidth: "94vw",
            padding: "32px 36px 28px", position: "relative",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
              <span style={{ fontFamily: F.playfair, fontSize: 22, color: "var(--t1)" }}>
                {error ? "Upload error" : "Analyse & save"}
              </span>
              <button onClick={reset} style={{ fontFamily: F.plex, fontSize: 13, color: "var(--t2)", background: "none", border: "none", cursor: "pointer" }}>✕</button>
            </div>

            {error ? (
              <p style={{ fontFamily: F.plex, fontSize: 13, color: "var(--red)", lineHeight: "1.6" }}>{error}</p>
            ) : meta && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 24px", marginBottom: 24 }}>
                  <Autocomplete label="Title"    value={meta.title}    suggestions={[]}                       onChange={v => set("title", v)}    span />
                  <Autocomplete label="Outlet"   value={meta.outlet}   suggestions={suggestions.outlets}      onChange={v => set("outlet", v)} />
                  <Autocomplete label="Date"     value={meta.date}     suggestions={[]}           type="date" onChange={v => set("date", v)} />
                  <Autocomplete label="Language" value={meta.language} suggestions={suggestions.languages}    onChange={v => set("language", v)} onBlur={() => norm("language")} />
                  <Autocomplete label="Country"  value={meta.country}  suggestions={suggestions.countries}    onChange={v => set("country", v)}  onBlur={() => norm("country")} />
                  <Autocomplete label="Sector"   value={meta.sector}   suggestions={suggestions.sectors}      onChange={v => set("sector", v)}   onBlur={() => norm("sector")} />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                  <button
                    onClick={save}
                    disabled={saving || !meta.outlet.trim()}
                    style={{
                      fontFamily: F.plex, fontSize: 12,
                      background: saving ? "var(--t2)" : "var(--t1)", color: "var(--bg)",
                      padding: "8px 26px", cursor: saving ? "default" : "pointer",
                      border: "none", opacity: !meta.outlet.trim() ? 0.5 : 1,
                    }}
                  >
                    {saving ? "Saving…" : "Save & View →"}
                  </button>
                  <span style={{ fontFamily: F.plex, fontSize: 11, color: "var(--t2)" }}>
                    {classifyP && !saving ? "Classifier running…" : ""}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
