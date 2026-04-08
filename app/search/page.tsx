"use client";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import {
  ARTICLES, SECTORS, CRISIS_DOMAINS, STAGES, OUTLETS,
  type Sector, type CrisisDomain, type Stage,
} from "@/lib/mockData";
import ArticleCard from "@/components/ArticleCard";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<Sector | "">("");
  const [domain, setDomain] = useState<CrisisDomain | "">("");
  const [stage, setStage] = useState<Stage | "">("");
  const [outlet, setOutlet] = useState<string>("");
  const [maxMisinfo, setMaxMisinfo] = useState<number>(100);
  const [page, setPage] = useState(0);

  const PER_PAGE = 12;

  const results = useMemo(() => {
    return ARTICLES.filter((a) => {
      const q = query.toLowerCase();
      const matchQuery = !q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q) || a.keywords.some((k) => k.includes(q));
      const matchSector = !sector || a.sector === sector;
      const matchDomain = !domain || a.crisisDomain === domain;
      const matchStage = !stage || a.stage === stage;
      const matchOutlet = !outlet || a.outlet === outlet;
      const matchMisinfo = a.misinformationScore * 100 <= maxMisinfo;
      return matchQuery && matchSector && matchDomain && matchStage && matchOutlet && matchMisinfo;
    });
  }, [query, sector, domain, stage, outlet, maxMisinfo]);

  const paginated = results.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(results.length / PER_PAGE);

  const resetFilters = () => { setQuery(""); setSector(""); setDomain(""); setStage(""); setOutlet(""); setMaxMisinfo(100); setPage(0); };

  const selectStyle = "w-full text-xs rounded-lg px-3 py-2 focus:outline-none";

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-medium" style={{ color: "var(--t1)" }}>Articles</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--t2)" }}>
          Filter the corpus by keyword, sector, outlet, domain, or misinformation risk
        </p>
      </div>

      {/* Search + filters */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--bg)", border: "0.5px solid var(--border)" }}>
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--t2)" }} />
          <input
            type="text" value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="Search titles, excerpts, keywords..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg"
            style={{ border: "0.5px solid var(--border)", background: "var(--bg2)", color: "var(--t1)" }}
          />
        </div>

        {/* Sector filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs shrink-0" style={{ color: "var(--t2)" }}>Sector:</span>
          <button
            onClick={() => { setSector(""); setPage(0); }}
            className="text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-all"
            style={!sector
              ? { borderColor: "var(--red)", background: "var(--red-l)", color: "var(--red-d)", fontWeight: 500 }
              : { borderColor: "var(--border)", background: "var(--bg)", color: "var(--t2)" }}
          >
            All
          </button>
          {SECTORS.slice(0, 6).map((s) => (
            <button key={s}
              onClick={() => { setSector(s); setPage(0); }}
              className="text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-all"
              style={sector === s
                ? { borderColor: "var(--red)", background: "var(--red-l)", color: "var(--red-d)", fontWeight: 500 }
                : { borderColor: "var(--border)", background: "var(--bg)", color: "var(--t2)" }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Row 2 filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] mb-1" style={{ color: "var(--t2)" }}>Crisis domain</label>
            <select value={domain} onChange={(e) => { setDomain(e.target.value as CrisisDomain | ""); setPage(0); }}
              className={selectStyle} style={{ border: "0.5px solid var(--border)", background: "var(--bg2)", color: "var(--t1)" }}>
              <option value="">All domains</option>
              {CRISIS_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] mb-1" style={{ color: "var(--t2)" }}>Stage</label>
            <select value={stage} onChange={(e) => { setStage(e.target.value as Stage | ""); setPage(0); }}
              className={selectStyle} style={{ border: "0.5px solid var(--border)", background: "var(--bg2)", color: "var(--t1)" }}>
              <option value="">All stages</option>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] mb-1" style={{ color: "var(--t2)" }}>Outlet</label>
            <select value={outlet} onChange={(e) => { setOutlet(e.target.value); setPage(0); }}
              className={selectStyle} style={{ border: "0.5px solid var(--border)", background: "var(--bg2)", color: "var(--t1)" }}>
              <option value="">All outlets</option>
              {OUTLETS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] mb-1" style={{ color: "var(--t2)" }}>
              Max misinfo risk: <span className="font-medium" style={{ color: "var(--t1)" }}>{maxMisinfo}%</span>
            </label>
            <input type="range" min={0} max={100} value={maxMisinfo}
              onChange={(e) => { setMaxMisinfo(Number(e.target.value)); setPage(0); }}
              className="w-full mt-1" style={{ accentColor: "var(--red)" }} />
          </div>
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--t2)" }}>
          <span className="font-medium" style={{ color: "var(--t1)" }}>{results.length}</span>{" "}
          article{results.length !== 1 ? "s" : ""} found
          {(query || sector || domain || stage || outlet || maxMisinfo < 100) && (
            <button onClick={resetFilters} className="ml-2 underline underline-offset-2" style={{ color: "var(--red)" }}>
              Clear filters
            </button>
          )}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-40"
              style={{ border: "0.5px solid var(--border)", background: "var(--bg)", color: "var(--t2)" }}>
              Previous
            </button>
            <span className="text-xs" style={{ color: "var(--t2)" }}>{page + 1} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs rounded-lg disabled:opacity-40"
              style={{ border: "0.5px solid var(--border)", background: "var(--bg)", color: "var(--t2)" }}>
              Next
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      {paginated.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {paginated.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-sm" style={{ color: "var(--t2)" }}>No articles match your filters.</p>
          <button onClick={resetFilters} className="mt-2 text-sm underline underline-offset-2" style={{ color: "var(--red)" }}>
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
