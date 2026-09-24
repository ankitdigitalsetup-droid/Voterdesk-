import { NextResponse } from "next/server";
import { getTeamMembers, createTeamMember } from "@/lib/db/team";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const candidateId = session?.candidateId || searchParams.get("candidateId") || "cand_1";

    const team = await getTeamMembers(candidateId);
    return NextResponse.json({ success: true, team });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to fetch team members", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = getSessionFromRequest(req);

    // RBAC: Karyakartas cannot create other team members
    if (session && session.role === "KARYAKARTA") {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Karyakartas are not permitted to manage team members.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, phone, roleTitle, assignedBooths, candidateId, password } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and mobile number are required" }, { status: 400 });
    }

    const targetCandidateId =
      session?.role === "CANDIDATE_ADMIN" ? session.candidateId || "cand_1" : candidateId || "cand_1";

    const member = await createTeamMember({
      name,
      phone,
      roleTitle: roleTitle || "Field Worker",
      assignedBooths: Array.isArray(assignedBooths) ? assignedBooths : ["12"],
      candidateId: targetCandidateId,
      password: password || "karyakarta",
    });

    return NextResponse.json({ success: true, member }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to add team member", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
