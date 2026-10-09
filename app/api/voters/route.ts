import { NextResponse } from "next/server";
import { getVoters, createVoter } from "@/lib/db/voters";
import { getSessionFromRequest } from "@/lib/auth/session";
import { store } from "@/lib/data-store";

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication is required to view voter records." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const candidateId =
      session.role === "SUPER_ADMIN"
        ? searchParams.get("candidateId") || session.candidateId || "cand_1"
        : session.candidateId || "cand_1";

    const booth = searchParams.get("booth") || "ALL";
    const status = searchParams.get("status") || "ALL";
    const query = searchParams.get("q") || "";
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize") || searchParams.get("limit");
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : undefined;

    // If Karyakarta, restrict strictly to assigned booths
    const assignedBooths =
      session.role === "KARYAKARTA" && session.assignedBooths && session.assignedBooths.length > 0
        ? session.assignedBooths
        : undefined;

    const result = await getVoters({
      candidateId,
      booth,
      status,
      query,
      assignedBooths,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      voters: result.voters,
      count: result.voters.length,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
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
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication is required to add voter records." },
        { status: 401 }
      );
    }

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
      zilaParishad,
      panchayatSamiti,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Voter name is required" }, { status: 400 });
    }

    const targetCandidateId =
      session.role === "SUPER_ADMIN" ? candidateId || session.candidateId || "cand_1" : session.candidateId || "cand_1";

    const boothVal = booth || "1";

    // If Karyakarta, verify they are adding within their assigned booth
    if (
      session.role === "KARYAKARTA" &&
      session.assignedBooths &&
      session.assignedBooths.length > 0 &&
      !session.assignedBooths.includes(String(boothVal).trim())
    ) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: `You can only add voters to your assigned booth(s): [${session.assignedBooths.join(", ")}].`,
        },
        { status: 403 }
      );
    }

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
      zilaParishad,
      panchayatSamiti,
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
