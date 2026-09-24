import { NextResponse } from "next/server";
import { updateVoter, deleteVoter } from "@/lib/db/voters";
import { getSessionFromRequest } from "@/lib/auth/session";
import { store } from "@/lib/data-store";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const session = getSessionFromRequest(req);

    // If Karyakarta, verify booth permission
    if (session && session.role === "KARYAKARTA") {
      const existingVoter = store.getVoters({ candidateId: session.candidateId || undefined }).find((v) => v.id === id);
      if (existingVoter && session.assignedBooths && session.assignedBooths.length > 0) {
        if (!session.assignedBooths.includes(existingVoter.booth)) {
          return NextResponse.json(
            {
              error: "Forbidden",
              message: `You are only authorized to update voters in assigned booths: [${session.assignedBooths.join(", ")}].`,
            },
            { status: 403 }
          );
        }
      }
    }

    const updated = await updateVoter(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Voter not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, voter: updated, version: store.getVersion() });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to update voter", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = getSessionFromRequest(req);

    // RBAC: Karyakartas are strictly forbidden from deleting voter records
    if (session && session.role === "KARYAKARTA") {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Karyakartas are not permitted to delete voter records.",
        },
        { status: 403 }
      );
    }

    const success = await deleteVoter(id);
    if (!success) {
      return NextResponse.json({ error: "Voter not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Voter deleted successfully", version: store.getVersion() });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to delete voter", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
