import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { mapDbRowToArticle, type DbRow } from "@/lib/articleMapper";

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
