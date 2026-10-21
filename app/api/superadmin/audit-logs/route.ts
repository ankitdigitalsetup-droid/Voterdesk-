import { NextResponse } from "next/server";
import { getAuditLogs, createAuditLog } from "@/lib/db/audit";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    // Only Super Admin can view the comprehensive audit logs
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden", message: "Only Super Admin can view system audit logs." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "60", 10);

    const logs = await getAuditLogs(limit);
    return NextResponse.json({ success: true, logs });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to fetch audit logs", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden", message: "Only Super Admin can record system audit logs." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, entityType, entityId, entityName, details, performedBy } = body;

    if (!action || !details) {
      return NextResponse.json({ error: "Action and details are required" }, { status: 400 });
    }

    const newLog = await createAuditLog({
      action,
      entityType: entityType || "CAMPAIGN",
      entityId,
      entityName,
      details,
      performedBy: performedBy || session.name || "Super Admin",
    });

    return NextResponse.json({ success: true, log: newLog }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to record audit log", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
