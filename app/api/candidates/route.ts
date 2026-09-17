import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";
import { getSessionCookie } from "@/lib/cookie-server";

export async function GET() {
  try {
    const candidates = store.getCandidates();
    return NextResponse.json({ success: true, candidates });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "à¤ªà¥à¤°à¤¤à¥à¤¯à¤¾à¤¶à¥€ à¤¸à¥‚à¤šà¥€ à¤²à¥‹à¤¡ à¤•à¤°à¤¨à¥‡ à¤®à¥‡à¤‚ à¤µà¤¿à¤«à¤²", details: err instanceof Error ? err.message : String(err) },
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
      return NextResponse.json({ error: "à¤•à¥‡à¤µà¤² à¤¸à¥à¤ªà¤° à¤à¤¡à¤®à¤¿à¤¨ à¤¹à¥€ à¤ªà¥à¤°à¤¤à¥à¤¯à¤¾à¤¶à¥€ à¤–à¤¾à¤¤à¤¾ à¤¬à¤¨à¤¾ à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤" }, { status: 403 });
    }

    const body = await req.json();
    const { name, phone, party, electionName, wardConstituency, boothCount, status, posterUrl } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "à¤ªà¥à¤°à¤¤à¥à¤¯à¤¾à¤¶à¥€ à¤•à¤¾ à¤¨à¤¾à¤® à¤”à¤° à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤†à¤µà¤¶à¥à¤¯à¤• à¤¹à¥ˆà¤‚à¥¤" }, { status: 400 });
    }

    const result = store.createCandidateWithAdmin(
      {
        name,
        phone,
        party,
        electionName,
        wardConstituency,
        boothCount: Number(boothCount) || 1,
        status: status || "ACTIVE",
        posterUrl,
      },
      sessionData.user.id,
      sessionData.user.name
    );

    return NextResponse.json(
      {
        success: true,
        candidate: result.candidate,
        tempPassword: result.tempPassword, // Returned ONLY ONCE for Super Admin one-time modal
        user: result.user,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "à¤ªà¥à¤°à¤¤à¥à¤¯à¤¾à¤¶à¥€ à¤–à¤¾à¤¤à¤¾ à¤¬à¤¨à¤¾à¤¨à¥‡ à¤®à¥‡à¤‚ à¤¤à¥à¤°à¥à¤Ÿà¤¿ à¤¹à¥à¤ˆà¥¤" },
      { status: 400 }
    );
  }
}

