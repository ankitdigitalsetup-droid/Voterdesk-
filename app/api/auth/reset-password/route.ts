import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";
import { getSessionCookie } from "@/lib/cookie-server";

export async function POST(req: Request) {
  try {
    const token = await getSessionCookie();
    if (!token) {
      return NextResponse.json({ error: "à¤…à¤¨à¤§à¤¿à¤•à¥ƒà¤¤ à¤ªà¤¹à¥à¤‚à¤š" }, { status: 401 });
    }

    const sessionData = store.getSession(token);
    if (!sessionData || sessionData.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "à¤•à¥‡à¤µà¤² à¤¸à¥à¤ªà¤° à¤à¤¡à¤®à¤¿à¤¨ à¤¹à¥€ à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤°à¥€à¤¸à¥‡à¤Ÿ à¤•à¤° à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID à¤†à¤µà¤¶à¥à¤¯à¤• à¤¹à¥ˆà¥¤" }, { status: 400 });
    }

    const result = store.resetUserPassword(
      userId,
      sessionData.user.id,
      sessionData.user.name
    );

    return NextResponse.json({
      success: true,
      message: "à¤¨à¤¯à¤¾ à¤…à¤¸à¥à¤¥à¤¾à¤¯à¥€ 8-à¤…à¤‚à¤•à¥€à¤¯ à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤œà¤¨à¤°à¥‡à¤Ÿ à¤•à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾à¥¤",
      tempPassword: result.tempPassword,
      user: result.user,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤°à¥€à¤¸à¥‡à¤Ÿ à¤µà¤¿à¤«à¤² à¤°à¤¹à¤¾à¥¤" },
      { status: 500 }
    );
  }
}

