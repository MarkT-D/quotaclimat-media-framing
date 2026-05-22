"use client";
import { useState, useRef, useCallback } from "react";
import { Upload, Link2, FileText, Loader2, CheckCircle, X } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { FRAMES, STAGES, SECTORS, CRISIS_DOMAINS, type Frame } from "@/lib/articleTypes";
import Badge from "@/components/Badge";

type AnalysisResult = {
  title: string;
  wordCount: number;
  sector: string;
  crisisDomain: string;
  stage: string;
  primaryFrame: Frame;
  frameScores: Record<Frame, number>;
  misinformationScore: number;
  keywords: string[];
  excerpt: string;
  progress: { label: string; done: boolean }[];
};

const FRAME_COLORS = ["var(--red)", "#EF9F27", "var(--red-m)", "#7C3AED", "var(--green)"];

const PIPELINE_STEPS = [
  "Fetching article content",
  "Applying keyword dictionary filter",
  "Running BERT sector classifier",
  "Running framing classifier",
  "Computing misinformation risk score",
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mockAnalyse(filename?: string): Promise<AnalysisResult> {
  return new Promise(async (resolve) => {
    await sleep(2400);
    const frame = FRAMES[Math.floor(Math.random() * FRAMES.length)];
    const scores = {} as Record<Frame, number>;
    let rem = 1;
    [...FRAMES].filter((f) => f !== frame).forEach((f, i, arr) => {
      const v = parseFloat((rem * (i === arr.length - 1 ? 1 : Math.random() * 0.4)).toFixed(2));
      scores[f] = v;
      rem -= v;
    });
    scores[frame] = parseFloat((Math.random() * 0.3 + 0.45).toFixed(2));
    resolve({
      title: filename ? `Analysis of: ${filename}` : "Submitted article analysis",
      wordCount: Math.round(Math.random() * 1400 + 400),
      sector: SECTORS[Math.floor(Math.random() * SECTORS.length)],
      crisisDomain: CRISIS_DOMAINS[Math.floor(Math.random() * CRISIS_DOMAINS.length)],
      stage: STAGES[Math.floor(Math.random() * STAGES.length)],
      primaryFrame: frame,
      frameScores: scores,
      misinformationScore: parseFloat((Math.random() * 0.55).toFixed(2)),
      keywords: ["climate", "policy", "energy", "emissions", "transition"].slice(0, Math.round(Math.random() * 3 + 2)),
      excerpt: "Article content has been processed and classified. In the production system this will contain the actual article text extracted from your document or URL.",
      progress: PIPELINE_STEPS.map((label) => ({ label, done: true })),
    });
  });
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-2 shadow text-xs" style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}>
      <p style={{ color: "var(--t1)" }}>{payload[0]?.payload?.fullFrame ?? payload[0]?.name}</p>
      <p style={{ color: "var(--t2)" }}>{payload[0]?.value}%</p>
    </div>
  );
};

export default function UploadPage() {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [progress, setProgress] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setStatus("idle"); setResult(null); }
  }, []);

  const handleAnalyse = async () => {
    if (mode === "file" && !file) return;
    if (mode === "url" && !url.trim()) return;
    setStatus("loading");
    setProgress([]);
    for (const step of PIPELINE_STEPS) {
      await sleep(420);
      setProgress((p) => [...p, step]);
    }
    const res = await mockAnalyse(file?.name);
    setResult(res);
    setStatus("done");
  };

  const reset = () => { setFile(null); setUrl(""); setStatus("idle"); setResult(null); setProgress([]); };

  const misiPct = result ? Math.round(result.misinformationScore * 100) : 0;
  const misiColor = misiPct < 20 ? "var(--green)" : misiPct < 50 ? "#D4A017" : "var(--red)";

  const frameBarData = result
    ? FRAMES.map((f, i) => ({
        frame: f.split(" ").slice(0, 2).join(" "),
        fullFrame: f,
        score: Math.round((result.frameScores[f] ?? 0) * 100),
        fill: FRAME_COLORS[i],
      }))
    : [];

  const radarData = result
    ? FRAMES.map((f) => ({ frame: f.split(" ")[0], value: Math.round((result.frameScores[f] ?? 0) * 100) }))
    : [];

  const progressPct = status === "loading" ? Math.round((progress.length / PIPELINE_STEPS.length) * 100) : 100;

  return (
    <div className="max-w-3xl mx-auto space-y-5 px-8 pt-8">
      {/* Hero */}
      <div className="rounded-xl p-5" style={{ background: "var(--green-l)", border: "0.5px solid rgba(45,106,79,0.2)" }}>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--green-d)" }}>Analyse an article</p>
        <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--green)", lineHeight: 1.6 }}>
          Upload a PDF, Word doc, or plain text file — or paste a URL — to run the full QuotaClimat analysis pipeline. The system will classify the article by sector, crisis domain, causal stage, and framing, then compute a misinformation risk score.
        </p>

        {/* Mode toggle */}
        <div className="flex gap-1 w-fit rounded-lg p-1" style={{ background: "rgba(45,106,79,0.1)" }}>
          {(["file", "url"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); reset(); }}
              className="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
              style={
                mode === m
                  ? { background: "#fff", color: "var(--green-d)", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }
                  : { color: "var(--green)" }
              }
            >
              {m === "file" ? "Upload file" : "Paste URL"}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      {status !== "done" && (
        <div>
          {mode === "file" ? (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className="rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all"
              style={{
                background: "var(--bg)",
                border: `2px dashed ${dragging ? "var(--green)" : file ? "var(--green-m)" : "var(--border)"}`,
              }}
            >
              <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setStatus("idle"); setResult(null); } }} />
              {file ? (
                <>
                  <FileText className="w-7 h-7 mb-2" style={{ color: "var(--green)" }} />
                  <p className="text-sm font-medium" style={{ color: "var(--t1)" }}>{file.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--t2)" }}>{(file.size / 1024).toFixed(1)} KB</p>
                </>
              ) : (
                <>
                  <Upload className="w-7 h-7 mb-2" style={{ color: "var(--t2)" }} />
                  <p className="text-sm" style={{ color: "var(--t2)" }}>
                    Drop a <span className="font-medium" style={{ color: "var(--t1)" }}>PDF, Word, or TXT</span> file here
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--t2)" }}>or click to browse</p>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-xl p-5" style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}>
              <label className="block text-xs mb-2" style={{ color: "var(--t2)" }}>Article URL</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t2)" }} />
                  <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://lemonde.fr/article/..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg"
                    style={{ border: "1px solid rgba(45,106,79,0.3)", background: "#fff", color: "var(--t1)" }}
                  />
                </div>
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--t2)" }}>In this prototype, URL fetching is simulated.</p>
            </div>
          )}

          {/* Progress */}
          {status === "loading" && (
            <div className="mt-4 rounded-xl p-4" style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--green-d)" }}>
                Running pipeline... {progressPct}%
              </p>
              <div className="h-1 rounded-full mb-3" style={{ background: "rgba(45,106,79,0.15)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: "var(--green)" }} />
              </div>
              <div className="space-y-1.5">
                {PIPELINE_STEPS.map((step) => (
                  <div key={step} className="flex items-center gap-2 text-xs" style={{ color: progress.includes(step) ? "var(--green-d)" : "var(--t2)" }}>
                    {progress.includes(step)
                      ? <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--green)" }} />
                      : <div className="w-3.5 h-3.5 shrink-0 rounded-full border" style={{ borderColor: "var(--border)" }} />
                    }
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAnalyse}
              disabled={status === "loading" || (mode === "file" ? !file : !url.trim())}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-40"
              style={{ background: "var(--green)" }}
            >
              {status === "loading" ? <><Loader2 className="w-4 h-4 animate-spin" />Analysing</> : "Run analysis"}
            </button>
            {(file || url) && (
              <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2.5 text-xs rounded-lg"
                style={{ border: "0.5px solid var(--border)", color: "var(--t2)", background: "var(--bg)" }}>
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {status === "done" && result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" style={{ color: "var(--green)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--green-d)" }}>Analysis complete</span>
            </div>
            <button onClick={reset} className="text-xs underline underline-offset-2" style={{ color: "var(--t2)" }}>
              Analyse another
            </button>
          </div>

          {/* Result header */}
          <div className="rounded-xl p-5" style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--green-l)" }}>
                <FileText className="w-4 h-4" style={{ color: "var(--green)" }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--green-d)" }}>Analysis complete</p>
                <p className="text-xs" style={{ color: "var(--t2)" }}>{result.wordCount.toLocaleString()} words processed</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge label={result.sector} />
              <Badge label={result.crisisDomain} />
              <Badge label={result.stage} />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--t2)", lineHeight: 1.7 }}>{result.excerpt}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {result.keywords.map((k) => (
                <span key={k} className="text-xs px-2 py-1 rounded-md" style={{ background: "var(--bg2)", color: "var(--t2)" }}>#{k}</span>
              ))}
            </div>
          </div>

          {/* Analysis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Misinfo */}
            <div className="rounded-xl p-5" style={{ background: "var(--bg)", border: `0.5px solid ${misiColor}` }}>
              <p className="text-sm font-medium mb-3" style={{ color: "var(--t1)" }}>Misinformation risk</p>
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
                  ? { background: "#FEF9EE", color: "#7A4F00" }
                  : { background: "var(--red-l)", color: "var(--red-d)" }}
              >
                {misiPct < 20 ? "Low risk" : misiPct < 50 ? "Moderate" : "High risk"}
              </span>
              <p className="text-xs leading-relaxed mt-3" style={{ color: "var(--t2)" }}>
                {misiPct < 20 ? "No significant signals detected." : misiPct < 50 ? "Some claims warrant review against scientific sources." : "High-risk signals. Manual review recommended."}
              </p>
            </div>

            {/* Frame bar */}
            <div className="rounded-xl p-5" style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--t1)" }}>Frame probabilities</p>
              <p className="text-xs mb-3" style={{ color: "var(--t2)" }}>Semetko &amp; Valkenburg (2000)</p>
              <ResponsiveContainer width="100%" height={170}>
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
                Primary frame: <span className="font-medium" style={{ color: "var(--t1)" }}>{result.primaryFrame}</span>
              </p>
            </div>
          </div>

          {/* Classification detail */}
          <div className="rounded-xl p-5" style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}>
            <p className="text-sm font-medium mb-3" style={{ color: "var(--t1)" }}>Classification</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Sector", value: result.sector },
                { label: "Crisis domain", value: result.crisisDomain },
                { label: "Causal stage", value: result.stage },
                { label: "Primary frame", value: result.primaryFrame },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg p-3" style={{ background: "var(--bg2)" }}>
                  <p className="text-[10px] mb-1" style={{ color: "var(--t2)" }}>{label}</p>
                  <p className="text-xs font-medium" style={{ color: "var(--t1)" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
