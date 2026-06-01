import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { mapDbRowToArticle, type DbRow } from "@/lib/articleMapper";

type UploadPayload = {
  title: string;
  outlet: string;
  publishedAt: string;
  language?: string;
  body: string;
  wordCount: number;
  frameScores: Record<string, number>;
};

export async function POST(req: Request) {
  const p: UploadPayload = await req.json();

  const sourceId = `UPLOAD:${crypto.randomUUID()}`;
  const fa  = p.frameScores["Attribution of Responsibility"] ?? null;
  const fhi = p.frameScores["Human Interest"]                ?? null;
  const fc  = p.frameScores["Conflict"]                      ?? null;
  const fm  = p.frameScores["Morality"]                      ?? null;
  const fe  = p.frameScores["Economic Consequences"]         ?? null;

  const rows = await sql<{ id: number }[]>`
    INSERT INTO articles (
      source_id, title, body, outlet, published_at, language,
      word_count, ingested_at,
      frame_attribution, frame_human_interest, frame_conflict, frame_morality, frame_economic
    ) VALUES (
      ${sourceId}, ${p.title}, ${p.body}, ${p.outlet}, ${p.publishedAt},
      ${p.language ?? null}, ${p.wordCount}, NOW(),
      ${fa}, ${fhi}, ${fc}, ${fm}, ${fe}
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
      angle_health, angle_economics, angle_jobs, angle_politics, angle_geopolitics, angle_purchasing_power
    FROM articles
    ORDER BY published_at DESC
  `;
  return NextResponse.json(rows.map(mapDbRowToArticle));
}
