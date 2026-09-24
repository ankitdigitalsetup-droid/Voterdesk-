import { NextResponse } from "next/server";
import { batchImportVoters } from "@/lib/db/voters";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const session = getSessionFromRequest(req);

    // RBAC: Karyakarta is strictly forbidden from bulk importing voters
    if (session && session.role === "KARYAKARTA") {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Karyakartas are not permitted to import voter lists.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { candidateId, voters } = body;

    if (!candidateId || !Array.isArray(voters)) {
      return NextResponse.json(
        { error: "Invalid payload: candidateId and voters array are required" },
        { status: 400 }
      );
    }

    // RBAC: Candidate Admin can only import into their own campaign
    if (session && session.role === "CANDIDATE_ADMIN" && session.candidateId !== candidateId) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Cannot import voters into another candidate's campaign.",
        },
        { status: 403 }
      );
    }

    const startTime = Date.now();
    const result = await batchImportVoters(candidateId, voters);
    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      importedCount: result.importedCount,
      totalVoters: result.totalVoters,
      boothsCreated: result.boothsCreated,
      durationMs,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to import voters", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
