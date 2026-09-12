import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidateId") || "cand_1";
    const stats = store.getStats(candidateId);
    return NextResponse.json({ success: true, stats });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to fetch campaign stats", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
