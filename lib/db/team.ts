import { prisma } from "@/lib/db";
import { store } from "@/lib/data-store";
import { TeamMember, WorkerLocation } from "@/lib/types";
import { hashPassword } from "@/lib/auth/password";

/**
 * Maps a Prisma KaryakartaProfile + User to the frontend TeamMember interface.
 */
function mapProfileToTeamMember(profile: any, contactedCount = 0): TeamMember {
  let assignedBooths: string[] = ["1"];
  try {
    assignedBooths = JSON.parse(profile.assignedBooths || "[]");
  } catch {
    assignedBooths = ["1"];
  }

  const isOnline = profile.lastSeen
    ? Date.now() - new Date(profile.lastSeen).getTime() < 10 * 60 * 1000 // online if seen in last 10 mins
    : false;

  const location: WorkerLocation | undefined =
    profile.lastLat != null && profile.lastLng != null
      ? {
          workerId: profile.id,
          name: profile.user?.name || "Karyakarta",
          phone: profile.user?.phone || "",
          roleTitle: profile.roleTitle,
          assignedBooths,
          candidateId: profile.candidateId,
          lat: profile.lastLat,
          lng: profile.lastLng,
          lastUpdated: profile.lastSeen ? new Date(profile.lastSeen).getTime() : Date.now(),
          isOnline,
        }
      : undefined;

  return {
    id: profile.id,
    name: profile.user?.name || "Karyakarta",
    phone: profile.user?.phone || "",
    roleTitle: profile.roleTitle || "Field Worker",
    assignedBooths,
    status: (profile.status as "Active" | "Inactive") || "Active",
    candidateId: profile.candidateId,
    contactedCount,
    location,
  };
}

/**
 * Retrieves all team members for a candidate from Neon PostgreSQL.
 */
export async function getTeamMembers(candidateId = "cand_1"): Promise<TeamMember[]> {
  try {
    const profiles = await prisma.karyakartaProfile.findMany({
      where: { candidateId },
      include: {
        user: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (profiles.length > 0) {
      // Calculate real contacted count per worker
      const members: TeamMember[] = [];
      for (const p of profiles) {
        let contactedCount = 0;
        try {
          contactedCount = await prisma.voter.count({
            where: {
              candidateId,
              workerName: p.user.name,
              status: { in: ["Contacted", "In-Favor", "Slip-Given"] },
            },
          });
        } catch {
          contactedCount = 0;
        }
        members.push(mapProfileToTeamMember(p, contactedCount));
      }
      return members;
    }
  } catch (err) {
    console.warn("Neon DB getTeamMembers notice, falling back to store:", err);
  }

  // Fallback to store
  return store.getTeam(candidateId);
}

/**
 * Creates a new Karyakarta team member in Neon PostgreSQL and memory store.
 */
export async function createTeamMember(data: {
  name: string;
  phone: string;
  roleTitle?: string;
  assignedBooths?: string[];
  candidateId?: string;
  password?: string;
}): Promise<TeamMember> {
  const cleanPhone = String(data.phone).replace(/\D/g, "");
  const cId = data.candidateId || "cand_1";
  const booths = Array.isArray(data.assignedBooths) && data.assignedBooths.length > 0 ? data.assignedBooths : ["12"];

  let createdMember: TeamMember | null = null;

  try {
    const hashedPassword = await hashPassword(data.password || "karyakarta");

    // Upsert User
    const user = await prisma.user.upsert({
      where: { phone: cleanPhone },
      update: {
        name: data.name,
        role: "KARYAKARTA",
      },
      create: {
        name: data.name,
        phone: cleanPhone,
        password: hashedPassword,
        role: "KARYAKARTA",
      },
    });

    // Upsert KaryakartaProfile
    const profile = await prisma.karyakartaProfile.upsert({
      where: { userId: user.id },
      update: {
        candidateId: cId,
        roleTitle: data.roleTitle || "Field Worker",
        assignedBooths: JSON.stringify(booths),
        status: "Active",
      },
      create: {
        userId: user.id,
        candidateId: cId,
        roleTitle: data.roleTitle || "Field Worker",
        assignedBooths: JSON.stringify(booths),
        status: "Active",
      },
      include: {
        user: true,
      },
    });

    createdMember = mapProfileToTeamMember(profile, 0);
  } catch (err) {
    console.warn("Neon DB createTeamMember notice, falling back to store:", err);
  }

  // Sync to in-memory store
  const storeMember = store.addTeamMember({
    name: data.name,
    phone: data.phone,
    roleTitle: data.roleTitle || "Field Worker",
    assignedBooths: booths,
    status: "Active",
    candidateId: cId,
    password: data.password || "karyakarta",
  });

  return createdMember || storeMember;
}

/**
 * Updates a worker's live GPS coordinates in Neon PostgreSQL and memory store.
 */
export async function updateWorkerLocation(data: {
  workerName: string;
  workerId?: string;
  phone?: string;
  roleTitle?: string;
  assignedBooths?: string[];
  candidateId?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
}): Promise<WorkerLocation> {
  const cId = data.candidateId || "cand_1";

  try {
    // Try updating DB KaryakartaProfile if user found
    let profileToUpdate = null;
    if (data.workerId) {
      profileToUpdate = await prisma.karyakartaProfile.findFirst({
        where: {
          OR: [{ id: data.workerId }, { userId: data.workerId }],
        },
      });
    }

    if (!profileToUpdate && data.workerName) {
      profileToUpdate = await prisma.karyakartaProfile.findFirst({
        where: {
          candidateId: cId,
          user: { name: data.workerName },
        },
      });
    }

    if (profileToUpdate) {
      await prisma.karyakartaProfile.update({
        where: { id: profileToUpdate.id },
        data: {
          lastLat: Number(data.lat),
          lastLng: Number(data.lng),
          lastSeen: new Date(),
        },
      });
    }
  } catch (err) {
    console.warn("Neon DB updateWorkerLocation notice:", err);
  }

  // Also record in memory store for live broadcast
  return store.recordWorkerLocation({
    workerName: data.workerName,
    workerId: data.workerId,
    phone: data.phone,
    roleTitle: data.roleTitle,
    assignedBooths: data.assignedBooths,
    candidateId: cId,
    lat: Number(data.lat),
    lng: Number(data.lng),
    accuracy: data.accuracy ? Number(data.accuracy) : 5,
    address: data.address,
  });
}
