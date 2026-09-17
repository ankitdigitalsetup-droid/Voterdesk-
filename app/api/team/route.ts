import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidateId") || "cand_1";
    const team = store.getTeam(candidateId);
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
    const body = await req.json();
    const { name, phone, roleTitle, assignedBooths, candidateId, password } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and mobile number are required" }, { status: 400 });
    }

    const member = store.addTeamMember({
      name,
      phone,
      roleTitle: roleTitle || "Field Worker",
      assignedBooths: Array.isArray(assignedBooths) ? assignedBooths : ["12"],
      status: "Active",
      candidateId: candidateId || "cand_1",
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
