import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";
import { getSessionCookie } from "@/lib/cookie-server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidateId") || "cand_1";
    const team = store.getTeam(candidateId);
    return NextResponse.json({ success: true, team });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "à¤•à¤¾à¤°à¥à¤¯à¤•à¤°à¥à¤¤à¤¾ à¤¸à¥‚à¤šà¥€ à¤²à¥‹à¤¡ à¤•à¤°à¤¨à¥‡ à¤®à¥‡à¤‚ à¤µà¤¿à¤«à¤²", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const token = await getSessionCookie();
    if (!token) {
      return NextResponse.json({ error: "à¤…à¤¨à¤§à¤¿à¤•à¥ƒà¤¤: à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¤¹à¤²à¥‡ à¤¸à¥à¤ªà¤° à¤à¤¡à¤®à¤¿à¤¨ à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¤°à¥‡à¤‚à¥¤" }, { status: 401 });
    }

    const sessionData = store.getSession(token);
    if (!sessionData || sessionData.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "à¤•à¥‡à¤µà¤² à¤¸à¥à¤ªà¤° à¤à¤¡à¤®à¤¿à¤¨ à¤¹à¥€ à¤•à¤¾à¤°à¥à¤¯à¤•à¤°à¥à¤¤à¤¾ à¤–à¤¾à¤¤à¤¾ à¤¬à¤¨à¤¾ à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤" }, { status: 403 });
    }

    const body = await req.json();
    const { name, phone, roleTitle, assignedBooths, candidateId, status } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "à¤•à¤¾à¤°à¥à¤¯à¤•à¤°à¥à¤¤à¤¾ à¤•à¤¾ à¤¨à¤¾à¤® à¤”à¤° à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤†à¤µà¤¶à¥à¤¯à¤• à¤¹à¥ˆà¤‚à¥¤" }, { status: 400 });
    }

    if (!candidateId) {
      return NextResponse.json({ error: "à¤ªà¥à¤°à¤¤à¥à¤¯à¤¾à¤¶à¥€ (Candidate ID) à¤•à¤¾ à¤šà¤¯à¤¨ à¤†à¤µà¤¶à¥à¤¯à¤• à¤¹à¥ˆà¥¤" }, { status: 400 });
    }

    const result = store.createKaryakartaWithUser(
      {
        name,
        phone,
        candidateId,
        roleTitle: roleTitle || "Field Worker",
        assignedBooths: Array.isArray(assignedBooths) ? assignedBooths : ["1"],
        status: status || "ACTIVE",
      },
      sessionData.user.id,
      sessionData.user.name
    );

    return NextResponse.json(
      {
        success: true,
        member: result.teamMember,
        tempPassword: result.tempPassword, // Returned ONLY ONCE for Super Admin one-time modal
        user: result.user,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "à¤•à¤¾à¤°à¥à¤¯à¤•à¤°à¥à¤¤à¤¾ à¤œà¥‹à¤¡à¤¼à¤¨à¥‡ à¤®à¥‡à¤‚ à¤¤à¥à¤°à¥à¤Ÿà¤¿ à¤¹à¥à¤ˆà¥¤" },
      { status: 400 }
    );
  }
}

