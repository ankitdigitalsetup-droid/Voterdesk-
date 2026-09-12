import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, password } = body;

    if (!phone) {
      return NextResponse.json({ error: "Mobile number is required" }, { status: 400 });
    }

    const user = store.authenticate(phone, password);
    if (!user) {
      return NextResponse.json({ error: "Invalid mobile number or password" }, { status: 401 });
    }

    // Return authenticated user details
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        candidateId: user.candidateId,
        assignedBooths: user.assignedBooths || [],
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Authentication failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
