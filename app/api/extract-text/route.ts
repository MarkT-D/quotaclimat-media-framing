import { NextResponse } from "next/server";

const BACKEND = process.env.CLASSIFY_API_URL ?? "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const res = await fetch(`${BACKEND}/extract-text`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Text extraction unavailable" }, { status: 503 });
  }
}
