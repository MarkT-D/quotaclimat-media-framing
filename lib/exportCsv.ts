import type { Article } from "./articleTypes";

function escapeCsvValue(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportToCsv(rows: Record<string, unknown>[], filename = "export.csv"): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map(row => headers.map(h => escapeCsvValue(row[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function articleToCsvRow(a: Article): Record<string, unknown> {
  return {
    id:            a.id,
    title:         a.title,
    outlet:        a.outlet,
    published_at:  a.publishedAt,
    language:      a.language ?? "",
    country:       a.country ?? "",
    sector:        a.sector ?? "",
    crisis_domain: a.crisisDomain ?? "",
    stage:         a.stage ?? "",
    primary_frame: a.primaryFrame ?? "",
    primary_angle: a.primaryAngle ?? "",
    word_count:    a.wordCount,
    url:           a.url ?? "",
  };
}
