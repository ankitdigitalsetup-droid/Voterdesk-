import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = store.updateVoter(id, body);
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
    const success = store.deleteVoter(id);
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
