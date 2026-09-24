import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    // Try to get fresh user data from database
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.userId },
        include: {
          candidateProfiles: true,
          karyakartaProfile: true,
        },
      });

      if (dbUser) {
        let assignedBooths: string[] = [];
        if (dbUser.karyakartaProfile) {
          try {
            assignedBooths = JSON.parse(dbUser.karyakartaProfile.assignedBooths || "[]");
          } catch {
            assignedBooths = [];
          }
        }

        return NextResponse.json({
          authenticated: true,
          user: {
            id: dbUser.id,
            name: dbUser.name,
            phone: dbUser.phone,
            role: dbUser.role,
            candidateId: session.candidateId || "cand_1",
            assignedBooths: assignedBooths.length > 0 ? assignedBooths : session.assignedBooths || [],
          },
        });
      }
    } catch {
      // Fallback to session payload directly if DB is momentarily unreachable
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        name: session.name,
        phone: session.phone,
        role: session.role,
        candidateId: session.candidateId,
        assignedBooths: session.assignedBooths || [],
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { authenticated: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
