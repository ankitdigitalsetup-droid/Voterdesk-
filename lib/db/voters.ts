import { prisma } from "@/lib/db";
import { store } from "@/lib/data-store";
import { VoterRecord } from "@/lib/types";

/**
 * Maps a Prisma Voter record to the frontend VoterRecord interface.
 */
function mapDbVoterToRecord(v: any): VoterRecord {
  return {
    id: v.id,
    name: v.name,
    epic: v.epic,
    guardian: v.guardian || "",
    age: v.age || "35",
    gender: v.gender || "Male",
    house: v.house || "",
    booth: v.booth,
    serialNo: v.serialNo || "",
    phone: v.phone || "",
    address: v.address || "",
    boothAddress: v.boothAddress || "",
    voted: v.voted || "नहीं",
    isSupporter: v.isSupporter || "हाँ",
    isOutside: v.isOutside || "नहीं",
    status: (v.status as VoterRecord["status"]) || "Pending",
    worker: v.workerName || "Unassigned",
    notes: v.notes || "",
    slipMessage: v.slipMessage || "",
    candidateId: v.candidateId,
  };
}

/**
 * Seeds the initial sample voters into Neon PostgreSQL if table is empty.
 */
export async function seedInitialVotersIfEmpty(candidateId = "cand_1"): Promise<void> {
  try {
    const count = await prisma.voter.count({ where: { candidateId } });
    if (count > 0) return;

    // Ensure candidate exists
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!candidate) {
      await prisma.candidate.create({
        data: {
          id: candidateId,
          name: "Abhay Kumar",
          phone: "9414114497",
          party: "Independent (निर्दलीय)",
          electionName: "Bhilwara Municipal Election 2026",
          wardConstituency: "Ward 34",
          status: "ACTIVE",
          voterLimit: 50000,
        },
      });
    }

    const defaultVoters = store.getVoters({ candidateId });
    if (defaultVoters.length === 0) return;

    console.log(`Seeding ${defaultVoters.length} initial voters into Neon PostgreSQL for ${candidateId}...`);

    await prisma.voter.createMany({
      data: defaultVoters.map((v) => ({
        id: v.id,
        name: v.name,
        epic: v.epic,
        guardian: v.guardian || null,
        age: String(v.age || "35"),
        gender: v.gender || "Male",
        house: v.house || null,
        booth: String(v.booth || "1"),
        serialNo: v.serialNo != null ? String(v.serialNo) : null,
        phone: v.phone || null,
        address: v.address || null,
        boothAddress: v.boothAddress || null,
        voted: v.voted != null ? String(v.voted) : "नहीं",
        isSupporter: v.isSupporter != null ? String(v.isSupporter) : "हाँ",
        isOutside: v.isOutside != null ? String(v.isOutside) : "नहीं",
        status: v.status || "Pending",
        workerName: v.worker || "Amit Joshi",
        notes: v.notes || null,
        slipMessage: v.slipMessage || null,
        candidateId,
      })),
      skipDuplicates: true,
    });

    console.log(`✅ Successfully seeded voters into Neon PostgreSQL!`);
  } catch (err) {
    console.warn("Voter initial seed notice:", err);
  }
}

/**
 * Retrieves voters with rich filtering, searching, and role-based booth scoping.
 */
export async function getVoters(params: {
  candidateId: string;
  booth?: string;
  status?: string;
  query?: string;
  assignedBooths?: string[];
}): Promise<{ voters: VoterRecord[]; total: number; source: "database" | "memory_store" }> {
  const { candidateId, booth, status, query, assignedBooths } = params;

  try {
    // 1. Try querying Neon PostgreSQL via Prisma
    const whereClause: any = {
      candidateId,
    };

    // Booth filtering & Karyakarta booth restriction
    if (assignedBooths && assignedBooths.length > 0) {
      if (booth && booth !== "ALL") {
        if (assignedBooths.includes(booth)) {
          whereClause.booth = booth;
        } else {
          return { voters: [], total: 0, source: "database" };
        }
      } else {
        whereClause.booth = { in: assignedBooths };
      }
    } else if (booth && booth !== "ALL") {
      whereClause.booth = booth;
    }

    // Status filtering
    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    // Search query (case-insensitive across name, epic, phone, house, guardian, address)
    if (query && query.trim()) {
      const q = query.trim();
      whereClause.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { epic: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { house: { contains: q } },
        { guardian: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
      ];
    }

    const dbVoters = await prisma.voter.findMany({
      where: whereClause,
      orderBy: [{ booth: "asc" }, { serialNo: "asc" }, { createdAt: "desc" }],
    });

    // If database has records, return them
    if (dbVoters.length > 0) {
      const voters = dbVoters.map(mapDbVoterToRecord);
      return { voters, total: voters.length, source: "database" };
    }

    // If DB is empty, trigger seed and check store
    await seedInitialVotersIfEmpty(candidateId);
  } catch (err) {
    console.warn("Neon DB getVoters failed, falling back to local store:", err);
  }

  // 2. Resilient fallback to memory store
  const storeVoters = store.getVoters({
    candidateId,
    booth: assignedBooths && assignedBooths.length > 0 ? (booth && assignedBooths.includes(booth) ? booth : assignedBooths[0]) : booth,
    status,
    query,
  });

  return { voters: storeVoters, total: storeVoters.length, source: "memory_store" };
}

/**
 * Creates a new voter in Neon PostgreSQL and syncs with memory store.
 */
export async function createVoter(
  data: Partial<VoterRecord> & { candidateId: string; name: string }
): Promise<VoterRecord> {
  const boothVal = String(data.booth || "1").trim();
  const epicVal =
    data.epic && String(data.epic).trim()
      ? String(data.epic).toUpperCase().trim()
      : `RJX${boothVal.padStart(2, "0")}${Math.floor(10000 + Math.random() * 90000)}`;

  let createdRecord: VoterRecord | null = null;

  try {
    const dbRecord = await prisma.voter.create({
      data: {
        name: data.name,
        epic: epicVal,
        guardian: data.guardian || null,
        age: String(data.age || "35"),
        gender: data.gender || "Male",
        house: data.house || null,
        booth: boothVal,
        serialNo: data.serialNo != null ? String(data.serialNo) : null,
        phone: data.phone || null,
        address: data.address || null,
        boothAddress: data.boothAddress || null,
        voted: data.voted != null ? String(data.voted) : "नहीं",
        isSupporter: data.isSupporter != null ? String(data.isSupporter) : "हाँ",
        isOutside: data.isOutside != null ? String(data.isOutside) : "नहीं",
        status: data.status || (data.isSupporter === "हाँ" ? "In-Favor" : "Pending"),
        workerName: data.worker || "Unassigned",
        notes: data.notes || null,
        slipMessage: data.slipMessage || null,
        candidateId: data.candidateId,
      },
    });

    createdRecord = mapDbVoterToRecord(dbRecord);
  } catch (err) {
    console.warn("Neon DB createVoter error, saving to local store:", err);
  }

  // Sync into memory store for zero-latency multi-mobile sync
  const storeVoter = store.addVoter({
    id: createdRecord?.id,
    name: data.name,
    epic: epicVal,
    guardian: data.guardian || "",
    age: String(data.age || "35"),
    gender: data.gender || "Male",
    house: data.house || "",
    booth: boothVal,
    serialNo: data.serialNo,
    phone: data.phone || "",
    address: data.address || "",
    boothAddress: data.boothAddress || "",
    voted: data.voted || "नहीं",
    isSupporter: data.isSupporter || "हाँ",
    isOutside: data.isOutside || "नहीं",
    status: data.status || (data.isSupporter === "हाँ" ? "In-Favor" : "Pending"),
    worker: data.worker || "Unassigned",
    notes: data.notes || "",
    candidateId: data.candidateId,
    slipMessage: data.slipMessage || "",
  });

  return createdRecord || storeVoter;
}

/**
 * Updates an existing voter in Neon PostgreSQL and syncs with memory store.
 */
export async function updateVoter(
  id: string,
  updates: Partial<VoterRecord>
): Promise<VoterRecord | null> {
  let updatedRecord: VoterRecord | null = null;

  try {
    const dataToUpdate: any = {};
    if (updates.name !== undefined) dataToUpdate.name = updates.name;
    if (updates.epic !== undefined) dataToUpdate.epic = updates.epic;
    if (updates.guardian !== undefined) dataToUpdate.guardian = updates.guardian;
    if (updates.age !== undefined) dataToUpdate.age = String(updates.age);
    if (updates.gender !== undefined) dataToUpdate.gender = updates.gender;
    if (updates.house !== undefined) dataToUpdate.house = updates.house;
    if (updates.booth !== undefined) dataToUpdate.booth = String(updates.booth);
    if (updates.serialNo !== undefined) dataToUpdate.serialNo = String(updates.serialNo);
    if (updates.phone !== undefined) dataToUpdate.phone = updates.phone;
    if (updates.address !== undefined) dataToUpdate.address = updates.address;
    if (updates.boothAddress !== undefined) dataToUpdate.boothAddress = updates.boothAddress;
    if (updates.voted !== undefined) dataToUpdate.voted = String(updates.voted);
    if (updates.isSupporter !== undefined) dataToUpdate.isSupporter = String(updates.isSupporter);
    if (updates.isOutside !== undefined) dataToUpdate.isOutside = String(updates.isOutside);
    if (updates.status !== undefined) dataToUpdate.status = updates.status;
    if (updates.worker !== undefined) dataToUpdate.workerName = updates.worker;
    if (updates.notes !== undefined) dataToUpdate.notes = updates.notes;
    if (updates.slipMessage !== undefined) dataToUpdate.slipMessage = updates.slipMessage;

    const dbVoter = await prisma.voter.update({
      where: { id },
      data: dataToUpdate,
    });

    updatedRecord = mapDbVoterToRecord(dbVoter);
  } catch (err) {
    console.warn(`Neon DB updateVoter(${id}) error, updating local store:`, err);
  }

  // Always update memory store and bump version for live sync
  const localUpdated = store.updateVoter(id, updates);
  return updatedRecord || localUpdated || null;
}

/**
 * Deletes a voter from Neon PostgreSQL and memory store.
 */
export async function deleteVoter(id: string): Promise<boolean> {
  let success = false;

  try {
    await prisma.voter.delete({ where: { id } });
    success = true;
  } catch (err) {
    console.warn(`Neon DB deleteVoter(${id}) notice:`, err);
  }

  const localSuccess = store.deleteVoter(id);
  return success || localSuccess;
}

/**
 * Bulk imports voters into Neon PostgreSQL with automatic chunking,
 * booth detection, EPIC formatting, and instant memory store sync.
 */
export async function batchImportVoters(
  candidateId: string,
  rawVoters: any[]
): Promise<{ importedCount: number; totalVoters: number; boothsCreated: number }> {
  if (!Array.isArray(rawVoters) || rawVoters.length === 0) {
    const currentTotal = await prisma.voter.count({ where: { candidateId } }).catch(() => 0);
    return { importedCount: 0, totalVoters: currentTotal, boothsCreated: 0 };
  }

  // Ensure candidate exists
  try {
    const cand = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (!cand) {
      await prisma.candidate.create({
        data: {
          id: candidateId,
          name: "Abhay Kumar",
          phone: "9414114497",
          party: "Independent (निर्दलीय)",
          electionName: "Bhilwara Municipal Election 2026",
          wardConstituency: "Ward 34",
          status: "ACTIVE",
          voterLimit: 50000,
        },
      });
    }
  } catch (candErr) {
    console.warn("Candidate check during import notice:", candErr);
  }

  // 1. Normalize items and collect distinct booths
  const distinctBooths = new Set<string>();
  const normalizedRecords: any[] = [];
  const storeItems: any[] = [];

  for (let idx = 0; idx < rawVoters.length; idx++) {
    const raw = rawVoters[idx];
    const name = String(raw.name || "").trim();
    if (!name) continue; // Skip entries without a valid name

    const boothVal = String(raw.booth || "1").trim();
    distinctBooths.add(boothVal);

    const epicVal =
      raw.epic && String(raw.epic).trim()
        ? String(raw.epic).toUpperCase().trim()
        : `RJX${boothVal.padStart(2, "0")}${Math.floor(10000 + Math.random() * 90000)}`;

    const serialVal =
      raw.serialNo != null && String(raw.serialNo).trim() !== ""
        ? String(raw.serialNo).trim()
        : String(idx + 1);

    const dbRecord = {
      name,
      epic: epicVal,
      guardian: raw.guardian ? String(raw.guardian).trim() : null,
      age: raw.age ? String(raw.age).trim() : "35",
      gender: raw.gender ? String(raw.gender).trim() : "Male",
      house: raw.house ? String(raw.house).trim() : null,
      booth: boothVal,
      serialNo: serialVal,
      phone: raw.phone ? String(raw.phone).trim() : null,
      address: raw.address ? String(raw.address).trim() : null,
      boothAddress: raw.boothAddress ? String(raw.boothAddress).trim() : null,
      voted: raw.voted ? String(raw.voted).trim() : "नहीं",
      isSupporter: raw.isSupporter ? String(raw.isSupporter).trim() : "हाँ",
      isOutside: raw.isOutside ? String(raw.isOutside).trim() : "नहीं",
      status: raw.status || (raw.isSupporter === "हाँ" ? "In-Favor" : "Pending"),
      workerName: raw.worker || raw.workerName || "Unassigned",
      notes: raw.notes ? String(raw.notes).trim() : null,
      slipMessage: raw.slipMessage ? String(raw.slipMessage).trim() : null,
      candidateId,
    };

    normalizedRecords.push(dbRecord);
    storeItems.push({
      ...dbRecord,
      worker: dbRecord.workerName,
    });
  }

  // 2. Auto-create any missing Booths in Neon PostgreSQL
  let boothsCreated = 0;
  try {
    const existingBooths = await prisma.booth.findMany({
      where: { candidateId },
      select: { boothNumber: true },
    });
    const existingSet = new Set(existingBooths.map((b) => b.boothNumber));

    const newBoothsToCreate = Array.from(distinctBooths)
      .filter((b) => !existingSet.has(b))
      .map((b) => ({
        boothNumber: b,
        name: `मतदान केंद्र बूथ नं. ${b}`,
        area: `वार्ड क्षेत्र, बूथ ${b}`,
        candidateId,
        totalVoters: 0,
      }));

    if (newBoothsToCreate.length > 0) {
      await prisma.booth.createMany({
        data: newBoothsToCreate,
        skipDuplicates: true,
      });
      boothsCreated = newBoothsToCreate.length;
    }
  } catch (boothErr) {
    console.warn("Booth auto-creation notice:", boothErr);
  }

  // 3. Batch insert voters into Neon PostgreSQL in chunks of 500
  let importedCount = 0;
  const CHUNK_SIZE = 500;
  for (let i = 0; i < normalizedRecords.length; i += CHUNK_SIZE) {
    const chunk = normalizedRecords.slice(i, i + CHUNK_SIZE);
    try {
      const res = await prisma.voter.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      importedCount += res.count;
    } catch (chunkErr) {
      console.warn(`Chunk insert (${i} to ${i + CHUNK_SIZE}) fallback:`, chunkErr);
      importedCount += chunk.length;
    }
  }

  // 4. Sync into in-memory store for instant multi-mobile broadcast
  const storeRes = store.importVoters(candidateId, storeItems);

  // 5. Get final total count
  let totalVoters = storeRes.total;
  try {
    totalVoters = await prisma.voter.count({ where: { candidateId } });
  } catch {
    // fallback
  }

  return {
    importedCount: importedCount > 0 ? importedCount : storeRes.imported,
    totalVoters,
    boothsCreated,
  };
}
