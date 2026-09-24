import { NextResponse } from "next/server";
import { getCandidates, createCandidate, updateCandidate } from "@/lib/db/candidates";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const queryCandidateId = searchParams.get("id");

    // If logged in as CANDIDATE_ADMIN or KARYAKARTA, scope to their candidate
    let targetCandidateId: string | undefined = undefined;
    if (session && session.role !== "SUPER_ADMIN" && session.candidateId) {
      targetCandidateId = session.candidateId;
    } else if (queryCandidateId) {
      targetCandidateId = queryCandidateId;
    }

    const candidates = await getCandidates(targetCandidateId);
    return NextResponse.json({ success: true, candidates });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to fetch candidates", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = getSessionFromRequest(req);

    // RBAC: Only SUPER_ADMIN can create candidates in production
    if (session && session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Only Super Admin can onboard new Candidates and campaigns.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, phone, party, electionName, wardConstituency, boothCount, posterUrl, symbolName, voterLimit } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Candidate name and phone number are required" }, { status: 400 });
    }

    const candidate = await createCandidate({
      name,
      phone,
      party: party || "Independent",
      electionName: electionName || "Municipal Election 2026",
      wardConstituency: wardConstituency || "Ward 01",
      boothCount: Number(boothCount) || 10,
      posterUrl,
      symbolName,
      voterLimit: Number(voterLimit) || 50000,
      status: "ACTIVE",
    });

    return NextResponse.json({ success: true, candidate }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to create candidate", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
    }

    // RBAC: Only SUPER_ADMIN or the CANDIDATE_ADMIN themselves can edit their campaign
    if (session) {
      if (session.role === "KARYAKARTA") {
        return NextResponse.json(
          { error: "Forbidden", message: "Karyakartas cannot edit campaign details." },
          { status: 403 }
        );
      }
      if (session.role === "CANDIDATE_ADMIN" && session.candidateId !== id) {
        return NextResponse.json(
          { error: "Forbidden", message: "Cannot edit another candidate's campaign." },
          { status: 403 }
        );
      }
    }

    const updated = await updateCandidate(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, candidate: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to update candidate", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
