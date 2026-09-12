import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { candidateId, voters } = body;

    if (!candidateId || !Array.isArray(voters)) {
      return NextResponse.json(
        { error: "Invalid payload: candidateId and voters array are required" },
        { status: 400 }
      );
    }

    const result = store.importVoters(candidateId, voters);

    return NextResponse.json({
      success: true,
      importedCount: result.imported,
      totalVoters: result.total,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to import voters", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
