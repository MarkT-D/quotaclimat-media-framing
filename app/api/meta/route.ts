import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { SECTORS } from "@/lib/articleTypes";

export const dynamic = "force-dynamic";

export async function GET() {
  const [outlets, languages, countries] = await Promise.all([
    sql<{ outlet: string }[]>`
      SELECT DISTINCT outlet FROM articles
      WHERE outlet IS NOT NULL AND outlet != ''
      ORDER BY outlet LIMIT 300`,
    sql<{ language: string }[]>`
      SELECT DISTINCT language FROM articles
      WHERE language IS NOT NULL AND language != ''
      ORDER BY language`,
    sql<{ country: string }[]>`
      SELECT DISTINCT country FROM articles
      WHERE country IS NOT NULL AND country != ''
      ORDER BY country`,
  ]);

  return NextResponse.json({
    outlets:   outlets.map(r => r.outlet),
    languages: languages.map(r => r.language),
    countries: countries.map(r => r.country),
    sectors:   [...SECTORS],
  });
}
