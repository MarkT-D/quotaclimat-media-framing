import type { Article, Frame, Angle, Sector, CrisisDomain, Stage } from "./articleTypes";

export interface DbRow {
  id: number;
  source_id: string | null;
  title: string;
  body?: string;
  outlet: string;
  published_at: Date | string;
  language: string | null;
  country: string | null;
  word_count: number | null;
  url: string | null;
  sector_transport: boolean | null;
  sector_buildings: boolean | null;
  sector_energy: boolean | null;
  sector_industry: boolean | null;
  sector_agriculture: boolean | null;
  sector_water: boolean | null;
  sector_ecosystem: boolean | null;
  sector_resource_economy: boolean | null;
  stage_general_concepts: boolean | null;
  stage_causes: boolean | null;
  stage_consequences: boolean | null;
  stage_solutions: boolean | null;
  domain_climate: boolean | null;
  domain_biodiversity: boolean | null;
  domain_resources: boolean | null;
  frame_attribution: number | null;
  frame_human_interest: number | null;
  frame_conflict: number | null;
  frame_morality: number | null;
  frame_economic: number | null;
  angle_health: number | null;
  angle_economics: number | null;
  angle_jobs: number | null;
  angle_politics: number | null;
  angle_geopolitics: number | null;
  angle_purchasing_power: number | null;
  ln_subject: string | null;
}

function firstTrue<T>(pairs: [boolean | null | undefined, T][]): T | null {
  for (const [flag, value] of pairs) {
    if (flag === true) return value;
  }
  return null;
}

function argmax(scores: Partial<Record<string, number>>): string | null {
  let best: string | null = null;
  let bestVal = -Infinity;
  for (const [key, val] of Object.entries(scores)) {
    if (val != null && val > bestVal) {
      bestVal = val;
      best = key;
    }
  }
  return best;
}

export function mapDbRowToArticle(row: DbRow): Article {
  const sector = firstTrue<Sector>([
    [row.sector_energy, "Energy"],
    [row.sector_transport, "Transport"],
    [row.sector_agriculture, "Agriculture"],
    [row.sector_industry, "Industry"],
    [row.sector_buildings, "Buildings"],
    [row.sector_water, "Water"],
    [row.sector_ecosystem, "Ecosystem"],
    [row.sector_resource_economy, "Resource Economy"],
  ]);

  const stage = firstTrue<Stage>([
    [row.stage_general_concepts, "General Concepts"],
    [row.stage_causes, "Causes"],
    [row.stage_consequences, "Consequences"],
    [row.stage_solutions, "Solutions"],
  ]);

  const crisisDomain = firstTrue<CrisisDomain>([
    [row.domain_climate, "Climate"],
    [row.domain_biodiversity, "Biodiversity"],
    [row.domain_resources, "Resources"],
  ]);

  const frameScores: Partial<Record<Frame, number>> = {};
  if (row.frame_attribution != null) frameScores["Attribution of Responsibility"] = row.frame_attribution;
  if (row.frame_human_interest != null) frameScores["Human Interest"] = row.frame_human_interest;
  if (row.frame_conflict != null) frameScores["Conflict"] = row.frame_conflict;
  if (row.frame_morality != null) frameScores["Morality"] = row.frame_morality;
  if (row.frame_economic != null) frameScores["Economic Consequences"] = row.frame_economic;

  const primaryFrame = argmax(frameScores) as Frame | null;

  const angleScores: Partial<Record<Angle, number>> = {};
  if (row.angle_health != null) angleScores["Health"] = row.angle_health;
  if (row.angle_economics != null) angleScores["Economics"] = row.angle_economics;
  if (row.angle_jobs != null) angleScores["Jobs"] = row.angle_jobs;
  if (row.angle_politics != null) angleScores["Politics"] = row.angle_politics;
  if (row.angle_geopolitics != null) angleScores["Geopolitics"] = row.angle_geopolitics;
  if (row.angle_purchasing_power != null) angleScores["Purchasing Power"] = row.angle_purchasing_power;

  const primaryAngle = argmax(angleScores) as Angle | null;

  const keywords = row.ln_subject
    ? Array.from(new Set(
        row.ln_subject.split(";").map((k) => k.replace(/\s*\(\d+%\)\s*$/, "").trim()).filter(Boolean)
      ))
    : [];

  const body = row.body ?? "";
  const excerpt = body.replace(/\s+/g, " ").trim().slice(0, 250);

  const pubAt = row.published_at instanceof Date
    ? row.published_at.toISOString().split("T")[0]
    : String(row.published_at).split("T")[0];

  return {
    id: `art-${String(row.id).padStart(4, "0")}`,
    title: row.title,
    outlet: row.outlet,
    publishedAt: pubAt,
    language: row.language,
    country: row.country,
    sector,
    crisisDomain,
    stage,
    primaryFrame,
    frameScores,
    primaryAngle,
    angleScores,
    wordCount: row.word_count ?? 0,
    excerpt,
    url: row.url ?? undefined,
    keywords,
  };
}
