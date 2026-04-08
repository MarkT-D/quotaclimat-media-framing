import Link from "next/link";
import { type Article, OUTLETS } from "@/lib/mockData";
import Badge from "./Badge";

interface Props {
  article: Article;
}

export default function ArticleCard({ article }: Props) {
  const outlet = OUTLETS.find((o) => o.id === article.outlet);
  const misiPct = Math.round(article.misinformationScore * 100);
  const misiColor = misiPct < 20 ? "var(--green)" : misiPct < 50 ? "#D4A017" : "var(--red)";

  return (
    <Link href={`/article/${article.id}`}>
      <div
        className="rounded-xl p-4 cursor-pointer transition-all group"
        style={{
          background: "var(--bg)",
          border: "0.5px solid var(--border)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--red)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        <p className="text-[11px] font-medium mb-1" style={{ color: "var(--red)" }}>
          {outlet?.name} · {article.publishedAt}
        </p>
        <p className="text-sm font-medium leading-snug mb-2 line-clamp-2" style={{ color: "var(--t1)" }}>
          {article.title}
        </p>
        <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: "var(--t2)" }}>
          {article.excerpt}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <Badge label={article.sector} size="sm" />
          <Badge label={article.stage} size="sm" />
        </div>

        {/* Misinfo bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px]" style={{ color: "var(--t2)" }}>Misinfo risk</span>
            <span className="text-[10px] font-medium" style={{ color: misiColor }}>{misiPct}%</span>
          </div>
          <div className="h-1 rounded-full" style={{ background: "var(--bg2)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${misiPct}%`, background: misiColor }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
