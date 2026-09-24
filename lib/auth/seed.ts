import { prisma } from "@/lib/db";
import { hashPassword } from "./password";

/**
 * Seeds default administrative and karyakarta users into Neon PostgreSQL if not present.
 */
export async function ensureDefaultUsers() {
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return; // Already initialized
    }

    console.log("Seeding default VoterDesk users into Neon PostgreSQL...");

    // 1. Create Super Admin
    const superAdminPassword = await hashPassword("superadmin");
    await prisma.user.create({
      data: {
        id: "usr_super_1",
        name: "Master Super Admin",
        phone: "9999999999",
        password: superAdminPassword,
        role: "SUPER_ADMIN",
      },
    });

    // 2. Create Candidate Admin & Candidate Campaign
    const candidateAdminPassword = await hashPassword("voterdesk");
    const candidateAdmin = await prisma.user.create({
      data: {
        id: "usr_cand_1",
        name: "Abhay Kumar",
        phone: "9414114497",
        password: candidateAdminPassword,
        role: "CANDIDATE_ADMIN",
      },
    });

    const candidate = await prisma.candidate.create({
      data: {
        id: "cand_1",
        name: "Abhay Kumar",
        phone: "9414114497",
        party: "Independent (निर्दलीय)",
        electionName: "Bhilwara Municipal Election 2026",
        wardConstituency: "Ward 34",
        status: "ACTIVE",
        voterLimit: 50000,
        userId: candidateAdmin.id,
      },
    });

    // 3. Create Sample Booths for cand_1
    await prisma.booth.createMany({
      data: [
        {
          id: "bth_1",
          boothNumber: "1",
          name: "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
          area: "वार्ड 34, शास्त्री नगर",
          candidateId: candidate.id,
          totalVoters: 1420,
        },
        {
          id: "bth_12",
          boothNumber: "12",
          name: "महात्मा गांधी राजकीय विद्यालय, भीलवाड़ा",
          area: "वार्ड 34, पटेल नगर",
          candidateId: candidate.id,
          totalVoters: 1180,
        },
      ],
      skipDuplicates: true,
    });

    // 4. Create Karyakartas with profiles
    const karyakartaPassword = await hashPassword("karyakarta");

    const k1 = await prisma.user.create({
      data: {
        id: "usr_work_1",
        name: "Amit Joshi",
        phone: "9829012345",
        password: karyakartaPassword,
        role: "KARYAKARTA",
      },
    });

    await prisma.karyakartaProfile.create({
      data: {
        userId: k1.id,
        candidateId: candidate.id,
        roleTitle: "Booth In-Charge",
        assignedBooths: JSON.stringify(["1", "12", "13"]),
        status: "Active",
      },
    });

    const k2 = await prisma.user.create({
      data: {
        id: "usr_work_2",
        name: "Neha Saini",
        phone: "9829054321",
        password: karyakartaPassword,
        role: "KARYAKARTA",
      },
    });

    await prisma.karyakartaProfile.create({
      data: {
        userId: k2.id,
        candidateId: candidate.id,
        roleTitle: "Field Worker",
        assignedBooths: JSON.stringify(["15"]),
        status: "Active",
      },
    });

    console.log("✅ Successfully seeded default users and candidate into Neon PostgreSQL!");
  } catch (error) {
    console.error("Error seeding default users:", error);
  }
}
