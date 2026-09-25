import { NextResponse } from "next/server";
import { getCandidatePasswords } from "@/lib/db/candidates";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    let candidateId = searchParams.get("candidateId");

    // If candidate admin or karyakarta, prioritize their candidateId
    if (session && session.role !== "SUPER_ADMIN" && session.candidateId) {
      candidateId = session.candidateId;
    }

    if (!candidateId) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
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
