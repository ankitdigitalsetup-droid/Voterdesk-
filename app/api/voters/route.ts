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
    const { name, epic, guardian, age, gender, house, booth, phone, address, boothAddress, voted, isSupporter, isOutside, status, worker, notes, candidateId } = body;

    if (!name) {
      return NextResponse.json({ error: "Voter name is required" }, { status: 400 });
    }

    const boothVal = String(booth || "1").trim();
    const epicVal = epic && String(epic).trim()
      ? String(epic).toUpperCase().trim()
      : `RJX${boothVal.padStart(2, "0")}${Math.floor(10000 + Math.random() * 90000)}`;

    const voter = store.addVoter({
      name,
      epic: epicVal,
      guardian: guardian || "",
      age: String(age || "35"),
      gender: gender || "Male",
      house: house || "",
      booth: boothVal,
      phone: phone || "",
      address: address || "",
      boothAddress: boothAddress || "",
      voted: voted || "नहीं",
      isSupporter: isSupporter || "हाँ",
      isOutside: isOutside || "नहीं",
      status: status || (isSupporter === "हाँ" ? "In-Favor" : "Pending"),
      worker: worker || "Unassigned",
      notes: notes || "",
      candidateId: candidateId || "cand_1",
    });

    return NextResponse.json({ success: true, voter, version: store.getVersion() }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to add voter", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
