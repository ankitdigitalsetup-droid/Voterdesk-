import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const startTime = Date.now();

  try {
    // 1. Verify PostgreSQL Database Connectivity
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: "healthy",
      service: "VoterDesk",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: "connected",
        provider: "Neon Serverless PostgreSQL",
        latencyMs: dbLatencyMs,
      },
      environment: process.env.NODE_ENV || "development",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        status: "degraded",
        service: "VoterDesk",
        timestamp: new Date().toISOString(),
        database: {
          status: "disconnected",
          error: err instanceof Error ? err.message : String(err),
        },
      },
      { status: 503 }
    );
  }
}
