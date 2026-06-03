import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { mapDbRowToArticle, type DbRow } from "@/lib/articleMapper";

const SECTOR_COL: Record<string, string> = {
  "Energy":           "sector_energy",
  "Transport":        "sector_transport",
  "Agriculture":      "sector_agriculture",
  "Industry":         "sector_industry",
  "Buildings":        "sector_buildings",
  "Water":            "sector_water",
  "Ecosystem":        "sector_ecosystem",
  "Resource Economy": "sector_resource_economy",
};

type UploadPayload = {
  title: string;
  outlet: string;
  publishedAt: string;
  language?: string;
  country?: string;
  sector?: string;
  body: string;
  wordCount: number;
  frameScores: Record<string, number>;
  angleScores?: Record<string, number>;
  explanationFrames?: Record<string, number>;
  explanationAngles?: Record<string, number>;
};

export async function POST(req: Request) {
  const p: UploadPayload = await req.json();

  const sourceId = `UPLOAD:${crypto.randomUUID()}`;
  const fa  = p.frameScores["Attribution of Responsibility"] ?? null;
  const fhi = p.frameScores["Human Interest"]                ?? null;
  const fc  = p.frameScores["Conflict"]                      ?? null;
  const fm  = p.frameScores["Morality"]                      ?? null;
  const fe  = p.frameScores["Economic Consequences"]         ?? null;

  const ah  = p.angleScores?.["Health"]          ?? null;
  const ae  = p.angleScores?.["Economics"]        ?? null;
  const aj  = p.angleScores?.["Jobs"]             ?? null;
  const ap  = p.angleScores?.["Politics"]         ?? null;
  const ag  = p.angleScores?.["Geopolitics"]      ?? null;
  const app = p.angleScores?.["Purchasing Power"] ?? null;

  const expFrames = p.explanationFrames && Object.keys(p.explanationFrames).length > 0
    ? p.explanationFrames : null;
  const expAngles = p.explanationAngles && Object.keys(p.explanationAngles).length > 0
    ? p.explanationAngles : null;

  const sectorCol = p.sector ? SECTOR_COL[p.sector] ?? null : null;
  const hasClassification = fa !== null || ah !== null;

  const rows = await sql<{ id: number }[]>`
    INSERT INTO articles (
      source_id, title, body, outlet, published_at, language, country,
      word_count, ingested_at,
      frame_attribution, frame_human_interest, frame_conflict, frame_morality, frame_economic,
      angle_health, angle_economics, angle_jobs, angle_politics, angle_geopolitics, angle_purchasing_power,
      explanation_frames, explanation_angles,
      classified_at,
      sector_energy, sector_transport, sector_agriculture, sector_industry,
      sector_buildings, sector_water, sector_ecosystem, sector_resource_economy
    ) VALUES (
      ${sourceId}, ${p.title}, ${p.body}, ${p.outlet}, ${p.publishedAt},
      ${p.language ?? null}, ${p.country ?? null},
      ${p.wordCount}, NOW(),
      ${fa}, ${fhi}, ${fc}, ${fm}, ${fe},
      ${ah}, ${ae}, ${aj}, ${ap}, ${ag}, ${app},
      ${expFrames ? sql.json(expFrames) : null},
      ${expAngles ? sql.json(expAngles) : null},
      ${hasClassification ? sql`NOW()` : null},
      ${sectorCol === "sector_energy"},
      ${sectorCol === "sector_transport"},
      ${sectorCol === "sector_agriculture"},
      ${sectorCol === "sector_industry"},
      ${sectorCol === "sector_buildings"},
      ${sectorCol === "sector_water"},
      ${sectorCol === "sector_ecosystem"},
      ${sectorCol === "sector_resource_economy"}
    )
    RETURNING id
  `;

  return NextResponse.json({ id: rows[0].id });
}

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await sql<DbRow[]>`
    SELECT
      id, source_id, title, outlet, published_at, language, country, word_count, url,
      sector_transport, sector_buildings, sector_energy, sector_industry,
      sector_agriculture, sector_water, sector_ecosystem, sector_resource_economy,
      stage_general_concepts, stage_causes, stage_consequences, stage_solutions,
      domain_climate, domain_biodiversity, domain_resources,
      ln_subject,
      frame_attribution, frame_human_interest, frame_conflict, frame_morality, frame_economic,
      angle_health, angle_economics, angle_jobs, angle_politics, angle_geopolitics, angle_purchasing_power,
      explanation_frames, explanation_angles
    FROM articles
    ORDER BY published_at DESC
  `;
  return NextResponse.json(rows.map(mapDbRowToArticle));
}
