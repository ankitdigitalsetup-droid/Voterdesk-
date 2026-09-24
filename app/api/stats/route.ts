import { NextResponse } from "next/server";
import { getCampaignStats } from "@/lib/db/candidates";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    const { searchParams } = new URL(req.url);

    const candidateId = session?.candidateId || searchParams.get("candidateId") || "cand_1";
    const stats = await getCampaignStats(candidateId);

    return NextResponse.json({ success: true, stats });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to fetch campaign stats", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
