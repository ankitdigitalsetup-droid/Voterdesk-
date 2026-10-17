import { prisma } from "@/lib/db";
import { store } from "@/lib/data-store";
import { CandidateAccount, BoothAccessPassword } from "@/lib/types";
import { d1Query, d1Execute, isD1Configured } from "@/lib/d1";
import { extractRowEpic } from "@/lib/excel-helper";

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
    nikay: c.nikay || undefined,
    passwordsJson: c.passwordsJson || undefined,
    electionType: c.electionType || (c.electionName?.includes("पंचायत") || c.electionName?.toLowerCase().includes("panchayat") ? "PANCHAYAT" : "NIKAY"),
    slipMessage: c.slipMessage || (c.name ? `Vote for ${c.name}` : undefined),
  };
}

/**
 * Retrieves all candidates from Cloudflare D1 or Neon PostgreSQL with fallback to memory store.
 */
export async function getCandidates(candidateId?: string): Promise<CandidateAccount[]> {
  // 1. Try Cloudflare D1 Database (Ultra-fast serverless SQLite)
  if (isD1Configured()) {
    try {
      let d1Sql = `SELECT c.*, (SELECT count(*) FROM "Voter" v WHERE v.candidateId = c.id OR (c.id = 'cand_1' AND v.candidateId = 'cmuq2l4zx0002jz04vr6hy570')) as voterCount FROM "Candidate" c WHERE (c.status IS NULL OR c.status != 'DELETED')`;
      const params: any[] = [];
      if (candidateId) {
        d1Sql += ` AND (c.id = ? OR (c.id = 'cand_1' AND ? = 'cmuq2l4zx0002jz04vr6hy570'))`;
        params.push(candidateId, candidateId);
      }
      d1Sql += ` ORDER BY c.createdAt DESC`;
      const d1Candidates = await d1Query<any>(d1Sql, params);

      // If cuid candidate exists, filter duplicate cand_1 alias for general listing
      const hasCuid = d1Candidates.some((c) => c.id === "cmuq2l4zx0002jz04vr6hy570");
      const filteredD1 = hasCuid && !candidateId ? d1Candidates.filter((c) => c.id !== "cand_1") : d1Candidates;

      // Return D1 result directly (even if empty) so deleted campaigns never reappear
      return filteredD1.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        party: c.party || "Independent",
        electionName: c.electionName || "Municipal Election 2026",
        wardConstituency: c.wardConstituency || "Ward 34",
        status: (c.status as CandidateAccount["status"]) || "ACTIVE",
        voterCount: Number(c.voterCount) || 0,
        boothCount: Number(c.boothCount) || 1,
        createdAt: c.createdAt ? String(c.createdAt).split("T")[0] : "2026-10-01",
        posterUrl: c.posterUrl || "/default-candidate-poster.jpg",
        symbolName: c.symbolName || undefined,
        nikay: c.nikay || undefined,
        passwordsJson: c.passwordsJson || undefined,
        electionType: "NIKAY",
        slipMessage: c.name ? `वोट दें ${c.name} को` : undefined,
      }));
    } catch (d1Err) {
      console.warn("Cloudflare D1 getCandidates notice:", d1Err);
    }
  }

  // 2. Try Neon PostgreSQL
  try {
    const whereClause: any = { status: { not: "DELETED" } };
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

  // 3. Fallback to store
  const storeCandidates = store.getCandidates();
  if (candidateId) {
    const isTarget = (cid: string) =>
      cid === candidateId ||
      ((candidateId === "cand_1" || candidateId === "cmuq2l4zx0002jz04vr6hy570") &&
        (cid === "cand_1" || cid === "cmuq2l4zx0002jz04vr6hy570"));
    return storeCandidates.filter((c) => isTarget(c.id));
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
 * Creates a new candidate campaign in Cloudflare D1 with sync to Neon & store.
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
  nikay?: string;
  passwords?: BoothAccessPassword[];
  passwordsJson?: string;
  slipMessage?: string;
  voters?: any[];
}): Promise<CandidateAccount> {
  const boothTotal = Number(data.boothCount) || 10;
  const rawPhone = String(data.phone).replace(/\D/g, "");
  const cleanPhone = rawPhone.length === 10 ? rawPhone : `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const candidateId = "cand_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

  const { hashPassword } = await import("@/lib/auth/password");
  const candidatePass = data.candidatePassword || "voterdesk";
  const hashedPassword = await hashPassword(candidatePass);

  // Generate / prepare 100% unique passwords adhering to the 40 limit rule
  let finalPasswords: BoothAccessPassword[] = [];
  if (data.passwords && Array.isArray(data.passwords) && data.passwords.length > 0) {
    finalPasswords = data.passwords.map((p, idx) => ({
      ...p,
      serialNumber: p.serialNumber || idx + 1,
      candidateId,
    }));
  } else {
    const { generateCandidateBoothPasswords } = await import("@/lib/password-helper");
    // Collect all existing passwords across D1 and memory store to prevent any collision
    const existingList = isD1Configured() ? await d1Query<{ password: string }>(`SELECT password FROM "AccessPassword"`) : [];
    const existingSet = new Set<string>([
      ...existingList.map((p) => p.password),
      ...store.getAllAccessPasswords().map((p) => p.password),
    ]);
    finalPasswords = generateCandidateBoothPasswords(boothTotal, candidateId, existingSet);
  }

  const serializedPasswords = JSON.stringify(finalPasswords);

  // 1. Primary: Cloudflare D1 Database Insertion
  if (isD1Configured()) {
    try {
      // 1.1 Insert or update User in D1
      await d1Execute(
        `INSERT OR REPLACE INTO "User" (id, name, phone, password, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [`usr_${cleanPhone}`, data.name, cleanPhone, hashedPassword, "CANDIDATE_ADMIN"]
      );

      // 1.2 Insert Candidate in D1
      await d1Execute(
        `INSERT INTO "Candidate" (id, name, phone, party, electionName, wardConstituency, status, voterLimit, posterUrl, symbolName, nikay, passwordsJson, createdAt, updatedAt, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)`,
        [
          candidateId,
          data.name,
          cleanPhone,
          data.party || "Independent",
          data.electionName || "Municipal Election 2026",
          data.wardConstituency || "Ward 01",
          data.status || "ACTIVE",
          data.voterLimit || 50000,
          data.posterUrl || null,
          data.symbolName || null,
          data.nikay || null,
          serializedPasswords,
          `usr_${cleanPhone}`,
        ]
      );

      // 1.3 Insert Booths in D1
      for (let i = 1; i <= Math.min(boothTotal, 50); i++) {
        await d1Execute(
          `INSERT INTO "Booth" (id, boothNumber, name, area, totalVoters, candidateId, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            `bth_${candidateId}_${i}`,
            String(i),
            `Polling Station Room ${i}`,
            `${data.wardConstituency || "Ward"} Sector ${Math.ceil(i / 2)}`,
            0,
            candidateId,
          ]
        );
      }

      // 1.4 Insert Access Passwords in D1
      for (const p of finalPasswords) {
        await d1Execute(
          `INSERT INTO "AccessPassword" (id, password, role, roleTitle, boothNumber, candidateId, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            p.id || `pwd_${candidateId}_${p.serialNumber || Math.random().toString(36).substring(2, 6)}`,
            p.password,
            p.role,
            p.roleTitle,
            String(p.boothNumber || "1"),
            candidateId,
          ]
        );
      }

      // 1.5 Batch import voters in D1 if provided
      if (data.voters && Array.isArray(data.voters) && data.voters.length > 0) {
        const { batchImportVoters } = await import("@/lib/db/voters");
        const mappedVoters = data.voters.map((v, idx) => ({
          ...v,
          candidateId,
          serialNo: v.serialNo || idx + 1,
          booth: String(v.booth || "1"),
          epic: v.epic && String(v.epic).trim() && !String(v.epic).trim().startsWith("—")
            ? String(v.epic).toUpperCase().trim()
            : extractRowEpic(v as any, undefined, v.booth || "1", v.serialNo || idx + 1),
        }));
        await batchImportVoters(candidateId, mappedVoters);
      }
    } catch (d1Err) {
      console.warn("Cloudflare D1 createCandidate error:", d1Err);
    }
  }

  // 2. Secondary: Sync to Neon PostgreSQL (non-blocking)
  try {
    const candUser = await prisma.user.upsert({
      where: { phone: cleanPhone },
      update: {
        name: data.name,
        password: hashedPassword,
        ...(cleanPhone !== "9999999999" && cleanPhone !== "9664074969" ? { role: "CANDIDATE_ADMIN" } : {}),
      },
      create: {
        name: data.name,
        phone: cleanPhone,
        password: hashedPassword,
        role: cleanPhone === "9999999999" || cleanPhone === "9664074969" ? "SUPER_ADMIN" : "CANDIDATE_ADMIN",
      },
    });

    await prisma.candidate.create({
      data: {
        id: candidateId,
        name: data.name,
        phone: cleanPhone,
        party: data.party || "Independent",
        electionName: data.electionName || "Municipal Election 2026",
        wardConstituency: data.wardConstituency || "Ward 01",
        status: data.status || "ACTIVE",
        posterUrl: data.posterUrl || null,
        symbolName: data.symbolName || null,
        nikay: data.nikay || null,
        passwordsJson: serializedPasswords,
        voterLimit: data.voterLimit || 50000,
        userId: candUser.id,
      },
    });

    const accessPwdData = finalPasswords.map((p) => ({
      password: p.password,
      role: p.role,
      roleTitle: p.roleTitle,
      boothNumber: String(p.boothNumber || "1"),
      candidateId,
    }));
    await prisma.accessPassword.createMany({
      data: accessPwdData,
      skipDuplicates: true,
    });
  } catch (neonErr) {
    console.warn("Neon DB createCandidate sync notice (ignored, D1 is primary):", neonErr);
  }

  // 3. Sync to Memory Store
  const newAccount: CandidateAccount = {
    id: candidateId,
    name: data.name,
    phone: cleanPhone,
    party: data.party || "Independent",
    electionName: data.electionName || "Municipal Election 2026",
    wardConstituency: data.wardConstituency || "Ward 01",
    boothCount: boothTotal,
    status: data.status || "ACTIVE",
    posterUrl: data.posterUrl,
    symbolName: data.symbolName,
    nikay: data.nikay,
    slipMessage: data.slipMessage || (data.name ? `Vote for ${data.name.trim()}` : undefined),
    passwordsJson: serializedPasswords,
    voterCount: data.voters ? data.voters.length : 0,
    createdAt: new Date().toISOString().split("T")[0],
    electionType: "NIKAY",
  };

  store.addCandidate({ ...newAccount, id: candidateId });
  store.addAccessPasswords(finalPasswords);

  // 4. Automatically save to local text file in candidate_passwords_txt/
  try {
    const { saveCandidatePasswordsToFile } = await import("@/lib/password-file-saver");
    saveCandidatePasswordsToFile(newAccount, finalPasswords);
  } catch (err) {
    console.warn("Auto-save passwords text file notice:", err);
  }

  return newAccount;
}

/**
 * Retrieves access passwords for a candidate.
 */
export async function getCandidatePasswords(candidateId: string): Promise<BoothAccessPassword[]> {
  // 1. Try Cloudflare D1 Database
  if (isD1Configured()) {
    try {
      const d1Pwds = await d1Query<BoothAccessPassword>(
        `SELECT * FROM "AccessPassword" WHERE candidateId = ? OR (candidateId = 'cand_1' AND ? = 'cmuq2l4zx0002jz04vr6hy570')`,
        [candidateId, candidateId]
      );
      if (d1Pwds.length > 0) {
        const mapped = d1Pwds.map((p, idx) => ({
          id: p.id,
          serialNumber: idx + 1,
          password: p.password,
          role: p.role as "CANDIDATE_ADMIN" | "KARYAKARTA",
          roleTitle: p.roleTitle as "ADMIN" | "MEMBER",
          boothNumber: p.boothNumber,
          candidateId: p.candidateId,
        }));

        // Automatically archive to candidate_passwords_txt/ text file
        try {
          const { saveCandidatePasswordsToFile } = await import("@/lib/password-file-saver");
          const cands = await d1Query<any>(
            `SELECT * FROM "Candidate" WHERE id = ? OR (id = 'cand_1' AND ? = 'cmuq2l4zx0002jz04vr6hy570') LIMIT 1`,
            [candidateId, candidateId]
          );
          if (cands.length > 0) {
            saveCandidatePasswordsToFile(cands[0], mapped);
          }
        } catch {}

        return mapped;
      }

      // Try reading cached passwordsJson from D1 candidate record
      const d1Cand = await d1Query<any>(
        `SELECT passwordsJson FROM "Candidate" WHERE id = ? OR (id = 'cand_1' AND ? = 'cmuq2l4zx0002jz04vr6hy570')`,
        [candidateId, candidateId]
      );
      if (d1Cand.length > 0 && d1Cand[0].passwordsJson) {
        try {
          const parsed = JSON.parse(d1Cand[0].passwordsJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch {}
      }
      return [];
    } catch (d1Err) {
      console.warn("Cloudflare D1 getCandidatePasswords notice:", d1Err);
    }
  }

  // 2. Try Neon PostgreSQL
  try {
    const dbList = await prisma.accessPassword.findMany({
      where: { candidateId },
      orderBy: { createdAt: "asc" },
    });

    if (dbList.length > 0) {
      return dbList.map((p, idx) => ({
        id: p.id,
        serialNumber: idx + 1,
        password: p.password,
        role: p.role as "CANDIDATE_ADMIN" | "KARYAKARTA",
        roleTitle: p.roleTitle as "ADMIN" | "MEMBER",
        boothNumber: p.boothNumber,
        candidateId: p.candidateId,
      }));
    }

    // Try reading cached passwordsJson from candidate record
    const cand = await prisma.candidate.findUnique({
      where: { id: candidateId },
      select: { passwordsJson: true },
    });
    if (cand?.passwordsJson) {
      try {
        const parsed = JSON.parse(cand.passwordsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // ignore parse error
      }
    }
  } catch (err) {
    console.warn("Neon DB getCandidatePasswords notice, falling back to store:", err);
  }

  return store.getCandidatePasswords(candidateId);
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
    nikay: string;
    voterLimit: number;
    slipMessage: string;
    electionType: "NIKAY" | "PANCHAYAT";
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
    if (updates.nikay !== undefined) dataToUpdate.nikay = updates.nikay;
    if (updates.slipMessage !== undefined) dataToUpdate.slipMessage = updates.slipMessage;

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

  // Update in Cloudflare D1 Database
  if (isD1Configured()) {
    try {
      const setClauses: string[] = [];
      const params: any[] = [];
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          setClauses.push(`"${key}" = ?`);
          params.push(value);
        }
      }
      if (setClauses.length > 0) {
        params.push(id, id);
        await d1Execute(
          `UPDATE "Candidate" SET ${setClauses.join(", ")} WHERE id = ? OR (id = 'cand_1' AND ? = 'cmuq2l4zx0002jz04vr6hy570')`,
          params
        );
      }
    } catch (d1Err) {
      console.warn("Cloudflare D1 updateCandidate notice:", d1Err);
    }
  }

  // Update in memory store
  const storeCand = store.updateCandidate(id, updates);
  store.touchVersion();

  return updatedRecord || storeCand || null;
}

/**
 * Permanently deletes a candidate campaign and all its cascades (booths, voters, passwords).
 */
export async function deleteCandidate(id: string): Promise<boolean> {
  let deleted = false;
  try {
    await prisma.candidate.delete({
      where: { id },
    });
    deleted = true;
  } catch (err) {
    console.warn(`Neon DB deleteCandidate(${id}) notice:`, err);
  }

  // Delete from Cloudflare D1 Database
  if (isD1Configured()) {
    try {
      await d1Execute(`DELETE FROM "Candidate" WHERE id = ? OR (id = 'cand_1' AND ? = 'cmuq2l4zx0002jz04vr6hy570')`, [id, id]);
      await d1Execute(`DELETE FROM "Voter" WHERE candidateId = ? OR (candidateId = 'cand_1' AND ? = 'cmuq2l4zx0002jz04vr6hy570')`, [id, id]);
      await d1Execute(`DELETE FROM "AccessPassword" WHERE candidateId = ? OR (candidateId = 'cand_1' AND ? = 'cmuq2l4zx0002jz04vr6hy570')`, [id, id]);
      await d1Execute(`DELETE FROM "Booth" WHERE candidateId = ? OR (candidateId = 'cand_1' AND ? = 'cmuq2l4zx0002jz04vr6hy570')`, [id, id]);
      deleted = true;
    } catch (d1Err) {
      console.warn("Cloudflare D1 deleteCandidate notice:", d1Err);
    }
  }

  const storeDeleted = store.deleteCandidate(id);
  if (storeDeleted) deleted = true;

  store.touchVersion();
  return deleted;
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
