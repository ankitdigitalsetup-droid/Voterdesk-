import { NextResponse } from "next/server";
import { getVoters, createVoter } from "@/lib/db/voters";
import { getSessionFromRequest } from "@/lib/auth/session";
import { store } from "@/lib/data-store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session = getSessionFromRequest(req);

    const candidateId = session?.candidateId || searchParams.get("candidateId") || "cand_1";
    const booth = searchParams.get("booth") || "ALL";
    const status = searchParams.get("status") || "ALL";
    const query = searchParams.get("q") || "";

    // If Karyakarta, restrict to assigned booths
    const assignedBooths =
      session && session.role === "KARYAKARTA" && session.assignedBooths && session.assignedBooths.length > 0
        ? session.assignedBooths
        : undefined;

    const result = await getVoters({
      candidateId,
      booth,
      status,
      query,
      assignedBooths,
    });

    return NextResponse.json({
      success: true,
      voters: result.voters,
      count: result.total,
      source: result.source,
      version: store.getVersion(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to fetch voters", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    const body = await req.json();
    const {
      name,
      epic,
      guardian,
      age,
      gender,
      house,
      booth,
      phone,
      address,
      boothAddress,
      voted,
      isSupporter,
      isOutside,
      status,
      worker,
      notes,
      candidateId,
      slipMessage,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Voter name is required" }, { status: 400 });
    }

    const targetCandidateId = session?.candidateId || candidateId || "cand_1";

    const voter = await createVoter({
      name,
      epic,
      guardian,
      age,
      gender,
      house,
      booth: booth || "1",
      phone,
      address,
      boothAddress,
      voted,
      isSupporter,
      isOutside,
      status,
      worker: worker || (session ? session.name : "Unassigned"),
      notes,
      slipMessage,
      candidateId: targetCandidateId,
    });

    return NextResponse.json(
      {
        success: true,
        voter,
        version: store.getVersion(),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to add voter", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
