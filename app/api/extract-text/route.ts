import { NextResponse } from "next/server";

const BACKEND = process.env.CLASSIFY_API_URL ?? "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Materialise bytes before sending — File from req.formData() is a lazy
    // stream that hangs if passed directly to another fetch body
    const bytes = await file.arrayBuffer();
    const outForm = new FormData();
    outForm.append("file", new Blob([bytes], { type: file.type || "application/octet-stream" }), file.name);

    const res = await fetch(`${BACKEND}/extract-text`, {
      method: "POST",
      body: outForm,
      signal: AbortSignal.timeout(30_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Text extraction unavailable";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
