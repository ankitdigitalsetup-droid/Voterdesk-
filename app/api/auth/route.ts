import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";
import { setSessionCookie } from "@/lib/cookie-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const loginId = (body.loginId || body.phone || "").trim();
    const password = (body.password || "").trim();

    if (!loginId) {
      return NextResponse.json(
        { error: "à¤•à¥ƒà¤ªà¤¯à¤¾ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤¯à¤¾ à¤²à¥‰à¤—à¤¿à¤¨ à¤†à¤ˆà¤¡à¥€ à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚à¥¤" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤¦à¤°à¥à¤œ à¤•à¤°à¥‡à¤‚à¥¤" },
        { status: 400 }
      );
    }

    const authResult = store.authenticate(loginId, password);
    if (authResult.error || !authResult.user) {
      const statusCode = authResult.status ? 403 : 401;
      return NextResponse.json(
        { error: authResult.error || "à¤…à¤®à¤¾à¤¨à¥à¤¯ à¤®à¥‹à¤¬à¤¾à¤‡à¤² à¤¨à¤‚à¤¬à¤° à¤¯à¤¾ à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡à¥¤" },
        { status: statusCode }
      );
    }

    const user = authResult.user;

    // Create persistent server session
    const session = store.createSession(user.id);
    if (session) {
      await setSessionCookie(session.token);
    }

    // Return authenticated user details (Strictly no password or hash exposed)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        candidateId: user.candidateId,
        assignedBooths: user.assignedBooths || [],
        status: user.status,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "à¤ªà¥à¤°à¤®à¤¾à¤£à¥€à¤•à¤°à¤£ à¤µà¤¿à¤«à¤² à¤°à¤¹à¤¾à¥¤", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

