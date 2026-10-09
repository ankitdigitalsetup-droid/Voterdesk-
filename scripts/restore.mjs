/**
 * ============================================================================
 * 🔄 VOTERDESK DATABASE RESTORE UTILITY (scripts/restore.mjs)
 * ============================================================================
 * Restores full database snapshot from a JSON backup file.
 *
 * Usage:
 *   node scripts/restore.mjs [path-to-backup-file.json]
 * If no path is provided, it restores the most recent backup in backups/.
 * ============================================================================
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function runRestore() {
  const startTime = Date.now();
  console.log("==========================================");
  console.log("🔄 Starting VoterDesk Database Restore...");
  console.log("==========================================");

  try {
    let backupFile = process.argv[2];

    if (!backupFile) {
      const backupDir = path.join(__dirname, "..", "backups");
      if (!fs.existsSync(backupDir)) {
        throw new Error("No backups directory found. Please specify a backup file path.");
      }
      const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.startsWith("voterdesk_backup_") && f.endsWith(".json"))
        .sort()
        .reverse();

      if (files.length === 0) {
        throw new Error("No backup files found in backups/ directory.");
      }

      backupFile = path.join(backupDir, files[0]);
    }

    if (!fs.existsSync(backupFile)) {
      throw new Error(`Specified backup file not found: ${backupFile}`);
    }

    console.log(`📖 Reading backup: ${backupFile}`);
    const raw = fs.readFileSync(backupFile, "utf-8");
    const payload = JSON.parse(raw);

    if (!payload.data) {
      throw new Error("Invalid backup format: missing 'data' field.");
    }

    const { users = [], candidates = [], booths = [], accessPasswords = [], voters = [], karyakartas = [] } = payload.data;

    console.log(`📦 Records to restore:`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Candidates: ${candidates.length}`);
    console.log(`   - Booths: ${booths.length}`);
    console.log(`   - Access Passwords: ${accessPasswords.length}`);
    console.log(`   - Voters: ${voters.length}`);
    console.log(`   - Karyakartas: ${karyakartas.length}`);

    // Restore in relational dependency order
    // 1. Users
    console.log("⏳ Restoring users...");
    for (const u of users) {
      await prisma.user.upsert({
        where: { phone: u.phone },
        update: { name: u.name, password: u.password, role: u.role },
        create: { id: u.id, name: u.name, phone: u.phone, password: u.password, role: u.role },
      });
    }

    // 2. Candidates
    console.log("⏳ Restoring candidates...");
    for (const c of candidates) {
      await prisma.candidate.upsert({
        where: { id: c.id },
        update: {
          name: c.name,
          phone: c.phone,
          party: c.party,
          electionName: c.electionName,
          wardConstituency: c.wardConstituency,
          status: c.status,
          voterLimit: c.voterLimit,
          posterUrl: c.posterUrl,
          symbolName: c.symbolName,
          nikay: c.nikay,
          passwordsJson: c.passwordsJson,
          userId: c.userId,
        },
        create: {
          id: c.id,
          name: c.name,
          phone: c.phone,
          party: c.party,
          electionName: c.electionName,
          wardConstituency: c.wardConstituency,
          status: c.status,
          voterLimit: c.voterLimit,
          posterUrl: c.posterUrl,
          symbolName: c.symbolName,
          nikay: c.nikay,
          passwordsJson: c.passwordsJson,
          userId: c.userId,
        },
      });
    }

    // 3. Booths
    console.log("⏳ Restoring booths...");
    for (const b of booths) {
      await prisma.booth.upsert({
        where: { candidateId_boothNumber: { candidateId: b.candidateId, boothNumber: b.boothNumber } },
        update: { name: b.name, area: b.area, totalVoters: b.totalVoters },
        create: { id: b.id, boothNumber: b.boothNumber, name: b.name, area: b.area, totalVoters: b.totalVoters, candidateId: b.candidateId },
      });
    }

    // 4. Access Passwords
    console.log("⏳ Restoring access passwords...");
    for (const p of accessPasswords) {
      await prisma.accessPassword.upsert({
        where: { password: p.password },
        update: { role: p.role, roleTitle: p.roleTitle, boothNumber: p.boothNumber, candidateId: p.candidateId },
        create: { id: p.id, password: p.password, role: p.role, roleTitle: p.roleTitle, boothNumber: p.boothNumber, candidateId: p.candidateId },
      });
    }

    // 5. Voters (in batches of 500)
    console.log("⏳ Restoring voters...");
    const CHUNK_SIZE = 500;
    for (let i = 0; i < voters.length; i += CHUNK_SIZE) {
      const chunk = voters.slice(i, i + CHUNK_SIZE);
      await prisma.voter.createMany({
        data: chunk.map((v) => ({
          id: v.id,
          name: v.name,
          epic: v.epic,
          guardian: v.guardian,
          age: v.age,
          gender: v.gender,
          house: v.house,
          booth: v.booth,
          serialNo: v.serialNo,
          phone: v.phone,
          address: v.address,
          boothAddress: v.boothAddress,
          voted: v.voted,
          isSupporter: v.isSupporter,
          isOutside: v.isOutside,
          status: v.status,
          workerName: v.workerName,
          notes: v.notes,
          slipMessage: v.slipMessage,
          candidateId: v.candidateId,
        })),
        skipDuplicates: true,
      });
    }

    // 6. Karyakartas
    console.log("⏳ Restoring karyakarta profiles...");
    for (const k of karyakartas) {
      await prisma.karyakartaProfile.upsert({
        where: { userId: k.userId },
        update: {
          candidateId: k.candidateId,
          roleTitle: k.roleTitle,
          assignedBooths: k.assignedBooths,
          status: k.status,
          lastLat: k.lastLat,
          lastLng: k.lastLng,
        },
        create: {
          id: k.id,
          userId: k.userId,
          candidateId: k.candidateId,
          roleTitle: k.roleTitle,
          assignedBooths: k.assignedBooths,
          status: k.status,
          lastLat: k.lastLat,
          lastLng: k.lastLng,
        },
      });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Database successfully restored in ${duration}s!`);
    console.log("==========================================\n");
  } catch (error) {
    console.error("❌ Database restore failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRestore();
