import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { store } from "@/lib/data-store";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { ensureDefaultUsers } from "@/lib/auth/seed";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, password } = body;

    if (!phone) {
      return NextResponse.json({ error: "Mobile number is required" }, { status: 400 });
    }

    const cleanPhone = String(phone).replace(/\D/g, "");

    // 1. Authenticate against PostgreSQL via Prisma
    try {
      // Ensure seed data exists if DB is completely fresh
      await ensureDefaultUsers();

      const dbUser = await prisma.user.findFirst({
        where: {
          phone: {
            equals: cleanPhone,
          },
        },
        include: {
          candidateProfiles: true,
          karyakartaProfile: true,
        },
      });

      if (dbUser) {
        const isMatch = await verifyPassword(password || "", dbUser.password);
        if (isMatch) {
          // Resolve candidateId and assignedBooths
          let candidateId = dbUser.candidateProfiles?.[0]?.id || null;
          let assignedBooths: string[] = [];

          if (dbUser.karyakartaProfile) {
            candidateId = dbUser.karyakartaProfile.candidateId || candidateId;
            try {
              assignedBooths = JSON.parse(dbUser.karyakartaProfile.assignedBooths || "[]");
            } catch {
              assignedBooths = [];
            }
          }

          const userRole = (dbUser.role as "SUPER_ADMIN" | "CANDIDATE_ADMIN" | "KARYAKARTA") || "KARYAKARTA";

          const sessionPayload = {
            userId: dbUser.id,
            phone: dbUser.phone,
            name: dbUser.name,
            role: userRole,
            candidateId: candidateId || "cand_1",
            assignedBooths,
          };

          const token = createSessionToken(sessionPayload);

          const response = NextResponse.json({
            success: true,
            source: "database",
            token,
            user: {
              id: dbUser.id,
              name: dbUser.name,
              phone: dbUser.phone,
              role: userRole,
              candidateId: candidateId || "cand_1",
              assignedBooths,
            },
          });

          setSessionCookie(response, token);
          return response;
        }
      }
    } catch (dbErr) {
      console.warn("Neon DB authentication check failed, falling back to local store:", dbErr);
    }

    // 2. Fallback to in-memory store for offline/local resilience
    const localUser = store.authenticate(phone, password);
    if (localUser) {
      const token = createSessionToken({
        userId: localUser.id,
        phone: localUser.phone,
        name: localUser.name,
        role: localUser.role,
        candidateId: localUser.candidateId || "cand_1",
        assignedBooths: localUser.assignedBooths || [],
      });

      const response = NextResponse.json({
        success: true,
        source: "memory_store",
        token,
        user: {
          id: localUser.id,
          name: localUser.name,
          phone: localUser.phone,
          role: localUser.role,
          candidateId: localUser.candidateId,
          assignedBooths: localUser.assignedBooths || [],
        },
      });

      setSessionCookie(response, token);
      return response;
    }

    return NextResponse.json({ error: "Invalid mobile number or password" }, { status: 401 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Authentication failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  clearSessionCookie(response);
  return response;
}
