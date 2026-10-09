import { NextResponse } from "next/server";
import { getCandidatePasswords } from "@/lib/db/candidates";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication is required to access campaign credentials." },
        { status: 401 }
      );
    }

    // RBAC: Karyakartas must never access master campaign passwords
    if (session.role === "KARYAKARTA") {
      return NextResponse.json(
        { error: "Forbidden", message: "Karyakartas are not permitted to view campaign passwords." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    let candidateId = searchParams.get("candidateId");

    // Candidate Admin is strictly scoped to their own candidateId
    if (session.role === "CANDIDATE_ADMIN") {
      candidateId = session.candidateId || "";
    }

    if (!candidateId) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
    }

    // If Candidate Admin tried to query a different candidate
    if (session.role === "CANDIDATE_ADMIN" && session.candidateId !== candidateId) {
      return NextResponse.json(
        { error: "Forbidden", message: "Access denied to other candidates' passwords." },
        { status: 403 }
      );
    }

    const passwords = await getCandidatePasswords(candidateId);
    return NextResponse.json({ success: true, passwords });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to fetch candidate passwords", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
