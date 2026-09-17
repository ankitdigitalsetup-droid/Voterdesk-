import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";
import { getSessionCookie } from "@/lib/cookie-server";
import { AccountStatus } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const token = await getSessionCookie();
    if (!token) {
      return NextResponse.json({ error: "à¤…à¤¨à¤§à¤¿à¤•à¥ƒà¤¤ à¤ªà¤¹à¥à¤‚à¤š" }, { status: 401 });
    }

    const sessionData = store.getSession(token);
    if (!sessionData || sessionData.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "à¤•à¥‡à¤µà¤² à¤¸à¥à¤ªà¤° à¤à¤¡à¤®à¤¿à¤¨ à¤¹à¥€ à¤–à¤¾à¤¤à¤¾ à¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤¬à¤¦à¤² à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, status } = body;

    if (!userId || !status) {
      return NextResponse.json({ error: "User ID à¤”à¤° Status à¤†à¤µà¤¶à¥à¤¯à¤• à¤¹à¥ˆà¤‚à¥¤" }, { status: 400 });
    }

    const validStatuses: AccountStatus[] = ["ACTIVE", "SUSPENDED", "DISABLED"];
    if (!validStatuses.includes(status as AccountStatus)) {
      return NextResponse.json({ error: "à¤…à¤®à¤¾à¤¨à¥à¤¯ à¤–à¤¾à¤¤à¤¾ à¤¸à¥à¤¥à¤¿à¤¤à¤¿à¥¤" }, { status: 400 });
    }

    const updatedUser = store.updateUserStatus(
      userId,
      status as AccountStatus,
      sessionData.user.id,
      sessionData.user.name
    );

    return NextResponse.json({
      success: true,
      message: `à¤–à¤¾à¤¤à¤¾ à¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤¸à¤«à¤²à¤¤à¤¾à¤ªà¥‚à¤°à¥à¤µà¤• à¤¬à¤¦à¤²à¤•à¤° ${status} à¤•à¤° à¤¦à¥€ à¤—à¤ˆà¥¤`,
      user: updatedUser,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "à¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤…à¤ªà¤¡à¥‡à¤Ÿ à¤µà¤¿à¤«à¤² à¤°à¤¹à¤¾à¥¤" },
      { status: 500 }
    );
  }
}

