import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";
import { clearSessionCookie, getSessionCookie } from "@/lib/cookie-server";

export async function POST() {
  try {
    const token = await getSessionCookie();
    if (token) {
      store.deleteSession(token);
    }
    await clearSessionCookie();

    return NextResponse.json({ success: true, message: "Logged out successfully" });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Logout failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

