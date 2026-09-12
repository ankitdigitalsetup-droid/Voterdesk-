import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidateId") || "cand_1";
    const booth = searchParams.get("booth") || "ALL";
    const status = searchParams.get("status") || "ALL";
    const query = searchParams.get("q") || "";

    const voters = store.getVoters({ candidateId, booth, status, query });
    return NextResponse.json({ success: true, voters, count: voters.length });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to fetch voters", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, epic, guardian, age, gender, house, booth, phone, status, worker, notes, candidateId } = body;

    if (!name || !epic) {
      return NextResponse.json({ error: "Voter name and EPIC number are required" }, { status: 400 });
    }

    const voter = store.addVoter({
      name,
      epic: epic.toUpperCase().trim(),
      guardian: guardian || "",
      age: String(age || ""),
      gender: gender || "Male",
      house: house || "",
      booth: booth || "1",
      phone: phone || "",
      status: status || "Pending",
      worker: worker || "Unassigned",
      notes: notes || "",
      candidateId: candidateId || "cand_1",
    });

    return NextResponse.json({ success: true, voter }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to add voter", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
