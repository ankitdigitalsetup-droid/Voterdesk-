/**
 * ============================================================================
 * 💾 VOTERDESK DATABASE BACKUP UTILITY (scripts/backup.mjs)
 * ============================================================================
 * Exports full database snapshot (Users, Candidates, Booths, Passwords,
 * Voters, Karyakartas) to a timestamped JSON file.
 *
 * Usage:
 *   node scripts/backup.mjs
 * ============================================================================
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function runBackup() {
  const startTime = Date.now();
  console.log("==========================================");
  console.log("📦 Starting VoterDesk Database Backup...");
  console.log("==========================================");

  try {
    const backupDir = path.join(__dirname, "..", "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log("⏳ Fetching records from database...");

    const [users, candidates, booths, accessPasswords, voters, karyakartas] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          phone: true,
          password: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.candidate.findMany(),
      prisma.booth.findMany(),
      prisma.accessPassword.findMany(),
      prisma.voter.findMany(),
      prisma.karyakartaProfile.findMany(),
    ]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `voterdesk_backup_${timestamp}.json`;
    const backupFilePath = path.join(backupDir, backupFileName);

    const backupPayload = {
      version: "1.0.0",
      createdAt: new Date().toISOString(),
      metadata: {
        totalUsers: users.length,
        totalCandidates: candidates.length,
        totalBooths: booths.length,
        totalAccessPasswords: accessPasswords.length,
        totalVoters: voters.length,
        totalKaryakartas: karyakartas.length,
      },
      data: {
        users,
        candidates,
        booths,
        accessPasswords,
        voters,
        karyakartas,
      },
    };

    fs.writeFileSync(backupFilePath, JSON.stringify(backupPayload, null, 2), "utf-8");

    const fileSizeMB = (fs.statSync(backupFilePath).size / (1024 * 1024)).toFixed(2);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Backup successfully generated!`);
    console.log(`📁 File: ${backupFilePath}`);
    console.log(`📊 Size: ${fileSizeMB} MB`);
    console.log(`⏱️ Duration: ${duration}s`);
    console.log(`📈 Summary:`);
    console.log(`   - Candidates: ${candidates.length}`);
    console.log(`   - Booths: ${booths.length}`);
    console.log(`   - Voters: ${voters.length}`);
    console.log(`   - Access Passwords: ${accessPasswords.length}`);
    console.log(`   - Team Workers: ${karyakartas.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log("==========================================\n");
  } catch (error) {
    console.error("❌ Database backup failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBackup();
