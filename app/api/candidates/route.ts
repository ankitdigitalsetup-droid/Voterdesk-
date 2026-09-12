import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";

export async function GET() {
  try {
    const candidates = store.getCandidates();
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
    const body = await req.json();
    const { name, phone, party, electionName, wardConstituency, boothCount, password } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Candidate name and phone number are required" }, { status: 400 });
    }

    const newCandidate = store.addCandidate({
      name,
      phone,
      party: party || "Independent",
      electionName: electionName || "Municipal Election 2026",
      wardConstituency: wardConstituency || "Ward 01",
      boothCount: Number(boothCount) || 10,
      status: "ACTIVE",
      password: password || "voterdesk",
    });

    return NextResponse.json({ success: true, candidate: newCandidate }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to create candidate", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
