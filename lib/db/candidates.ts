import { prisma } from "@/lib/db";
import { store } from "@/lib/data-store";
import { CandidateAccount } from "@/lib/types";

function mapDbCandidateToAccount(c: any): CandidateAccount {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    party: c.party || "Independent",
    electionName: c.electionName || "Municipal Election 2026",
    wardConstituency: c.wardConstituency || "Ward 34",
    status: (c.status as CandidateAccount["status"]) || "ACTIVE",
    voterCount: c._count?.voters ?? (c.voters ? c.voters.length : (c.voterLimit || 0)),
    boothCount: c.booths ? c.booths.length : 18,
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString().split("T")[0] : "2026-08-01",
    posterUrl: c.posterUrl || undefined,
    symbolName: c.symbolName || undefined,
  };
}

/**
 * Retrieves all candidates from Neon PostgreSQL with fallback to memory store.
 */
export async function getCandidates(candidateId?: string): Promise<CandidateAccount[]> {
  try {
    const whereClause: any = {};
    if (candidateId) {
      whereClause.id = candidateId;
    }

    const dbCandidates = await prisma.candidate.findMany({
      where: whereClause,
      include: {
        booths: true,
        _count: {
          select: { voters: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (dbCandidates.length > 0) {
      return dbCandidates.map(mapDbCandidateToAccount);
    }
  } catch (err) {
    console.warn("Neon DB getCandidates notice, falling back to store:", err);
  }

  // Fallback to store
  const storeCandidates = store.getCandidates();
  if (candidateId) {
    return storeCandidates.filter((c) => c.id === candidateId);
  }
  return storeCandidates;
}

/**
 * Retrieves a single candidate by ID.
 */
export async function getCandidateById(id: string): Promise<CandidateAccount | null> {
  const list = await getCandidates(id);
  return list.length > 0 ? list[0] : null;
}

/**
 * Creates a new candidate campaign in Neon PostgreSQL.
 */
export async function createCandidate(data: {
  name: string;
  phone: string;
  party?: string;
  electionName?: string;
  wardConstituency?: string;
  boothCount?: number;
  status?: "ACTIVE" | "EXPIRED" | "SUSPENDED";
  posterUrl?: string;
  symbolName?: string;
  voterLimit?: number;
  candidatePassword?: string;
  workerPassword?: string;
  voters?: any[];
}): Promise<CandidateAccount> {
  const boothTotal = Number(data.boothCount) || 10;
  const cleanPhone = String(data.phone).replace(/\D/g, "");
  let createdCandidate: CandidateAccount | null = null;

  try {
    const { hashPassword } = await import("@/lib/auth/password");
    const candidatePass = data.candidatePassword || "voterdesk";
    const workerPass = data.workerPassword || "karyakarta";
    const hashedPassword = await hashPassword(candidatePass);

    // 1. Create or update Candidate Admin user
    const candUser = await prisma.user.upsert({
      where: { phone: cleanPhone },
      update: {
        name: data.name,
        password: hashedPassword,
        role: "CANDIDATE_ADMIN",
      },
      create: {
        name: data.name,
        phone: cleanPhone,
        password: hashedPassword,
        role: "CANDIDATE_ADMIN",
      },
    });

    // 2. Create Candidate Campaign linked to Candidate Admin user
    const dbRecord = await prisma.candidate.create({
      data: {
        name: data.name,
        phone: cleanPhone,
        party: data.party || "Independent",
        electionName: data.electionName || "Municipal Election 2026",
        wardConstituency: data.wardConstituency || "Ward 01",
        status: data.status || "ACTIVE",
        posterUrl: data.posterUrl || null,
        symbolName: data.symbolName || null,
        voterLimit: data.voterLimit || 50000,
        workerPassword: workerPass,
        userId: candUser.id,
      },
    });

    // 3. Auto-create initial booths
    const boothsData = [];
    for (let i = 1; i <= Math.min(boothTotal, 50); i++) {
      boothsData.push({
        boothNumber: String(i),
        name: `Polling Station Room ${i}`,
        area: `${data.wardConstituency || "Ward"}, Sector ${Math.ceil(i / 2)}`,
        candidateId: dbRecord.id,
        totalVoters: 0,
      });
    }

    if (boothsData.length > 0) {
      await prisma.booth.createMany({
        data: boothsData,
        skipDuplicates: true,
      });
    }

    // 4. Batch import voters if provided
    let importedVotersCount = 0;
    if (data.voters && Array.isArray(data.voters) && data.voters.length > 0) {
      const { batchImportVoters } = await import("@/lib/db/voters");
      const mappedVoters = data.voters.map((v, idx) => ({
        ...v,
        candidateId: dbRecord.id,
        serialNo: v.serialNo || idx + 1,
        booth: String(v.booth || "1"),
        epic: v.epic || `RJX${String(v.booth || "1").padStart(2, "0")}${String(idx + 1).padStart(5, "0")}`,
      }));
      const res = await batchImportVoters(dbRecord.id, mappedVoters);
      importedVotersCount = res.importedCount;
    }

    createdCandidate = mapDbCandidateToAccount({
      ...dbRecord,
      booths: boothsData,
      _count: { voters: importedVotersCount },
    });
  } catch (err) {
    console.warn("Neon DB createCandidate notice, creating in store:", err);
  }

  // Also sync to memory store
  const storeCandidate = store.addCandidate({
    name: data.name,
    phone: cleanPhone,
    party: data.party || "Independent",
    electionName: data.electionName || "Municipal Election 2026",
    wardConstituency: data.wardConstituency || "Ward 01",
    boothCount: boothTotal,
    status: data.status || "ACTIVE",
    posterUrl: data.posterUrl,
    symbolName: data.symbolName,
  });

  return createdCandidate || storeCandidate;
}

/**
 * Updates a candidate campaign in Neon PostgreSQL.
 */
export async function updateCandidate(
  id: string,
  updates: Partial<{
    name: string;
    phone: string;
    party: string;
    electionName: string;
    wardConstituency: string;
    status: "ACTIVE" | "EXPIRED" | "SUSPENDED";
    posterUrl: string;
    symbolName: string;
    voterLimit: number;
  }>
): Promise<CandidateAccount | null> {
  let updatedRecord: CandidateAccount | null = null;

  try {
    const dataToUpdate: any = {};
    if (updates.name !== undefined) dataToUpdate.name = updates.name;
    if (updates.phone !== undefined) dataToUpdate.phone = updates.phone;
    if (updates.party !== undefined) dataToUpdate.party = updates.party;
    if (updates.electionName !== undefined) dataToUpdate.electionName = updates.electionName;
    if (updates.wardConstituency !== undefined) dataToUpdate.wardConstituency = updates.wardConstituency;
    if (updates.status !== undefined) dataToUpdate.status = updates.status;
    if (updates.posterUrl !== undefined) dataToUpdate.posterUrl = updates.posterUrl;
    if (updates.symbolName !== undefined) dataToUpdate.symbolName = updates.symbolName;
    if (updates.voterLimit !== undefined) dataToUpdate.voterLimit = updates.voterLimit;

    const dbRecord = await prisma.candidate.update({
      where: { id },
      data: dataToUpdate,
      include: {
        booths: true,
        _count: { select: { voters: true } },
      },
    });

    updatedRecord = mapDbCandidateToAccount(dbRecord);
  } catch (err) {
    console.warn(`Neon DB updateCandidate(${id}) notice:`, err);
  }

  // Update in memory store
  const storeCand = store.getCandidates().find((c) => c.id === id);
  if (storeCand) {
    Object.assign(storeCand, updates);
  }

  return updatedRecord || storeCand || null;
}

/**
 * Computes campaign stats from Neon PostgreSQL with live aggregation.
 */
export async function getCampaignStats(candidateId: string) {
  try {
    const total = await prisma.voter.count({ where: { candidateId } });
    const inFavor = await prisma.voter.count({ where: { candidateId, status: "In-Favor" } });
    const contacted = await prisma.voter.count({
      where: { candidateId, status: { in: ["Contacted", "In-Favor", "Slip-Given"] } },
    });
    const pending = await prisma.voter.count({ where: { candidateId, status: "Pending" } });
    const slipGiven = await prisma.voter.count({ where: { candidateId, status: "Slip-Given" } });
    const votedCount = await prisma.voter.count({ where: { candidateId, voted: "हाँ" } });

    // Booth-wise aggregation
    const boothGroups = await prisma.voter.groupBy({
      by: ["booth"],
      where: { candidateId },
      _count: { id: true },
    });

    const boothBreakdown = boothGroups.map((g) => ({
      booth: `Booth ${g.booth}`,
      boothNo: g.booth,
      total: g._count.id,
      contacted: 0, // detailed booth contacted can be computed or retrieved
      percentage: 0,
    }));

    return {
      total,
      contacted,
      pending,
      inFavor,
      slipGiven,
      votedCount,
      boothBreakdown,
      activeWorkers: store.getLiveWorkerCount(candidateId),
      source: "database",
    };
  } catch (err) {
    console.warn(`Neon DB getCampaignStats notice, falling back to store:`, err);
    return {
      ...store.getStats(candidateId),
      source: "memory_store",
    };
  }
}
