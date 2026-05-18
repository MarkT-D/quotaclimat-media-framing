import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { mapDbRowToArticle, type DbRow } from "@/lib/articleMapper";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = parseInt(id.replace(/^art-/, ""), 10);
  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await sql<DbRow[]>`
    SELECT * FROM articles WHERE id = ${numericId} LIMIT 1
  `;
  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(mapDbRowToArticle(rows[0]));
}
