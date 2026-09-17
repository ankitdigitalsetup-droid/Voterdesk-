import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";
import { getSessionCookie } from "@/lib/cookie-server";

export async function POST(req: Request) {
  try {
    const token = await getSessionCookie();
    if (!token) {
      return NextResponse.json({ error: "à¤…à¤¨à¤§à¤¿à¤•à¥ƒà¤¤: à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¤¹à¤²à¥‡ à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¤°à¥‡à¤‚à¥¤" }, { status: 401 });
    }

    const sessionData = store.getSession(token);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ error: "à¤¸à¤¤à¥à¤° à¤¸à¤®à¤¾à¤ªà¥à¤¤ à¤¹à¥‹ à¤šà¥à¤•à¤¾ à¤¹à¥ˆà¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¥à¤¨à¤ƒ à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¤°à¥‡à¤‚à¥¤" }, { status: 401 });
    }

    const body = await req.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "à¤µà¤°à¥à¤¤à¤®à¤¾à¤¨ à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤à¤µà¤‚ à¤¨à¤¯à¤¾ à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤¦à¥‹à¤¨à¥‹à¤‚ à¤†à¤µà¤¶à¥à¤¯à¤• à¤¹à¥ˆà¤‚à¥¤" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "à¤¨à¤¯à¤¾ à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤•à¤® à¤¸à¥‡ à¤•à¤® 6 à¤…à¤•à¥à¤·à¤°à¥‹à¤‚ à¤•à¤¾ à¤¹à¥‹à¤¨à¤¾ à¤šà¤¾à¤¹à¤¿à¤à¥¤" },
        { status: 400 }
      );
    }

    const updatedUser = store.changeUserPassword(sessionData.user.id, oldPassword, newPassword);

    return NextResponse.json({
      success: true,
      message: "à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤¸à¤«à¤²à¤¤à¤¾à¤ªà¥‚à¤°à¥à¤µà¤• à¤¬à¤¦à¤² à¤¦à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾ à¤¹à¥ˆà¥¤",
      user: updatedUser,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ à¤¬à¤¦à¤²à¤¨à¥‡ à¤®à¥‡à¤‚ à¤¤à¥à¤°à¥à¤Ÿà¤¿ à¤¹à¥à¤ˆà¥¤" },
      { status: 400 }
    );
  }
}

