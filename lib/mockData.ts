// Types and constants for QuotaClimat dashboard.
// Data is sourced from the PostgreSQL backend via /api/articles.

export const SECTORS = [
  "Energy",
  "Transport",
  "Agriculture",
  "Industry",
  "Buildings",
  "Water",
  "Ecosystem",
  "Resource Economy",
] as const;

export type Sector = (typeof SECTORS)[number];

export const CRISIS_DOMAINS = ["Climate", "Biodiversity", "Resources"] as const;
export type CrisisDomain = (typeof CRISIS_DOMAINS)[number];

export const STAGES = ["General Concepts", "Causes", "Consequences", "Solutions"] as const;
export type Stage = (typeof STAGES)[number];

export const FRAMES = [
  "Attribution of Responsibility",
  "Human Interest",
  "Conflict",
  "Morality",
  "Economic Consequences",
] as const;
export type Frame = (typeof FRAMES)[number];

export const ANGLES = [
  "Health", "Economics", "Jobs", "Politics", "Geopolitics", "Purchasing Power",
] as const;
export type Angle = (typeof ANGLES)[number];

// --- Article -----------------------------------------------------------------

export interface Article {
  id: string;
  title: string;
  outlet: string;                           // raw outlet name from DB
  publishedAt: string;                      // ISO date
  language: string | null;
  country: string | null;                    // ISO-2 from DB (FR, BE, …)
  sector: Sector | null;                    // null when no sector flag set
  crisisDomain: CrisisDomain | null;
  stage: Stage | null;
  primaryFrame: Frame | null;
  frameScores: Partial<Record<Frame, number>>;  // only non-null scores
  primaryAngle: Angle | null;
  misinformationScore?: number;             // not in DB yet
  wordCount: number;
  excerpt: string;
  url?: string;
  keywords: string[];
}

// --- Outlet stats (used by newspapers page) ----------------------------------

export function getOutletStats(articles: Article[]) {
  const outletNames = Array.from(new Set(articles.map((a) => a.outlet))).sort();

  return outletNames.map((outletName) => {
    const oa = articles.filter((a) => a.outlet === outletName);

    const scored = oa.filter((a) => a.misinformationScore != null);
    const avgMisinfoScore = scored.length
      ? parseFloat((scored.reduce((s, a) => s + (a.misinformationScore ?? 0), 0) / scored.length).toFixed(2))
      : 0;

    const stageDist = {} as Record<Stage, number>;
    STAGES.forEach((s) => (stageDist[s] = 0));
    oa.forEach((a) => { if (a.stage != null) stageDist[a.stage]++; });

    const frameDist = {} as Record<Frame, number>;
    FRAMES.forEach((f) => (frameDist[f] = 0));
    oa.forEach((a) => { FRAMES.forEach((f) => { if (a.frameScores[f] != null) frameDist[f]++; }); });

    const solutionRate = oa.length
      ? parseFloat(((stageDist["Solutions"] / oa.length) * 100).toFixed(1))
      : 0;

    return {
      id: outletName,
      name: outletName,
      articleCount: oa.length,
      avgMisinfoScore,
      stageDist,
      frameDist,
      solutionRate,
    };
  });
}

export type OutletStat = ReturnType<typeof getOutletStats>[number];
