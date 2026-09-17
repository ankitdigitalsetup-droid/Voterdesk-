import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";
import { getSessionCookie } from "@/lib/cookie-server";

export async function GET() {
  try {
    const token = await getSessionCookie();
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const sessionData = store.getSession(token);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ authenticated: false, error: "Session expired or invalid" }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: sessionData.user,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { authenticated: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

