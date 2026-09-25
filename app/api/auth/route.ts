import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { store } from "@/lib/data-store";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { ensureDefaultUsers } from "@/lib/auth/seed";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, password } = body;

    // Requirement: Name, Mobile Number, and Password are ALL required
    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: "Name is required (कृपया अपना नाम दर्ज करें)" },
        { status: 400 }
      );
    }
    if (!phone || !String(phone).trim()) {
      return NextResponse.json(
        { error: "Mobile number is required (कृपया मोबाइल नंबर दर्ज करें)" },
        { status: 400 }
      );
    }
    if (!password || !String(password).trim()) {
      return NextResponse.json(
        { error: "Password is required (कृपया पासवर्ड दर्ज करें)" },
        { status: 400 }
      );
    }

    const cleanPhone = String(phone).replace(/\D/g, "");
    const trimmedName = String(name).trim();
    const trimmedPassword = String(password).trim();

    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit mobile number (10 अंकों का मान्य मोबाइल नंबर दर्ज करें)" },
        { status: 400 }
      );
    }

    // Ensure seed default Super Admin exists if fresh
    await ensureDefaultUsers();

    // -------------------------------------------------------------
    // 1. Check existing User in Neon PostgreSQL by Phone
    // -------------------------------------------------------------
    try {
      const dbUser = await prisma.user.findFirst({
        where: {
          phone: { equals: cleanPhone },
        },
        include: {
          candidateProfiles: true,
          karyakartaProfile: true,
        },
      });

      if (dbUser) {
        const isMatch = await verifyPassword(trimmedPassword, dbUser.password);
        if (isMatch) {
          // If the user entered an updated name, persist it to DB
          if (trimmedName && dbUser.name !== trimmedName && dbUser.role !== "SUPER_ADMIN") {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { name: trimmedName },
            });
            dbUser.name = trimmedName;
          }

          let candidateId = dbUser.candidateProfiles?.[0]?.id || null;
          let assignedBooths: string[] = [];

          if (dbUser.karyakartaProfile) {
            candidateId = dbUser.karyakartaProfile.candidateId || candidateId;
            try {
              assignedBooths = JSON.parse(dbUser.karyakartaProfile.assignedBooths || "[]");
            } catch {
              assignedBooths = [];
            }

            // Update karyakarta lastSeen
            await prisma.karyakartaProfile.update({
              where: { id: dbUser.karyakartaProfile.id },
              data: { lastSeen: new Date(), status: "Active" },
            }).catch(() => {});
          }

          const userRole = (dbUser.role as "SUPER_ADMIN" | "CANDIDATE_ADMIN" | "KARYAKARTA") || "KARYAKARTA";

          const sessionPayload = {
            userId: dbUser.id,
            phone: dbUser.phone,
            name: dbUser.name,
            role: userRole,
            candidateId: candidateId || undefined,
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
              candidateId: candidateId || undefined,
              assignedBooths,
            },
          });

          setSessionCookie(response, token);
          return response;
        }
      }

      // -------------------------------------------------------------
      // 2. Check if this is a Karyakarta logging in with Candidate's Worker Password
      // -------------------------------------------------------------
      const matchedCandidate = await prisma.candidate.findFirst({
        where: {
          status: "ACTIVE",
          workerPassword: {
            equals: trimmedPassword,
          },
        },
      });

      if (matchedCandidate) {
        // Register or update this Karyakarta user in Neon DB with their entered Name!
        const hashedPassword = await hashPassword(trimmedPassword);
        const karyakartaUser = await prisma.user.upsert({
          where: { phone: cleanPhone },
          update: {
            name: trimmedName,
            password: hashedPassword,
            role: "KARYAKARTA",
          },
          create: {
            name: trimmedName,
            phone: cleanPhone,
            password: hashedPassword,
            role: "KARYAKARTA",
          },
        });

        // Register or update KaryakartaProfile linked to this candidate
        await prisma.karyakartaProfile.upsert({
          where: { userId: karyakartaUser.id },
          update: {
            candidateId: matchedCandidate.id,
            status: "Active",
            lastSeen: new Date(),
          },
          create: {
            userId: karyakartaUser.id,
            candidateId: matchedCandidate.id,
            roleTitle: "Field Worker",
            assignedBooths: JSON.stringify(["1"]),
            status: "Active",
            lastSeen: new Date(),
          },
        });

        // Register in store so memory store also has this worker
        store.addTeamMember({
          name: trimmedName,
          phone: cleanPhone,
          roleTitle: "Field Worker",
          assignedBooths: ["1"],
          candidateId: matchedCandidate.id,
          status: "Active",
        });

        // Record heartbeat in store so it appears in live polling immediately
        store.recordHeartbeat(trimmedName, "1");

        const sessionPayload = {
          userId: karyakartaUser.id,
          phone: cleanPhone,
          name: trimmedName,
          role: "KARYAKARTA" as const,
          candidateId: matchedCandidate.id,
          assignedBooths: ["1"],
        };

        const token = createSessionToken(sessionPayload);

        const response = NextResponse.json({
          success: true,
          source: "database_worker_auth",
          token,
          user: sessionPayload,
        });

        setSessionCookie(response, token);
        return response;
      }
    } catch (dbErr) {
      console.warn("Neon DB auth check failed, falling back to local store:", dbErr);
    }

    // -------------------------------------------------------------
    // 3. Fallback to in-memory store
    // -------------------------------------------------------------
    const localUser = store.authenticate(cleanPhone, trimmedPassword);
    if (localUser) {
      const token = createSessionToken({
        userId: localUser.id,
        phone: localUser.phone,
        name: trimmedName || localUser.name,
        role: localUser.role,
        candidateId: localUser.candidateId,
        assignedBooths: localUser.assignedBooths || [],
      });

      const response = NextResponse.json({
        success: true,
        source: "memory_store",
        token,
        user: {
          id: localUser.id,
          name: trimmedName || localUser.name,
          phone: localUser.phone,
          role: localUser.role,
          candidateId: localUser.candidateId,
          assignedBooths: localUser.assignedBooths || [],
        },
      });

      setSessionCookie(response, token);
      return response;
    }

    return NextResponse.json(
      { error: "Invalid mobile number or password (अमान्य मोबाइल नंबर या पासवर्ड)" },
      { status: 401 }
    );
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
