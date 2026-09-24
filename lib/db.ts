// Database client for VoterDesk
// Next.js Singleton PrismaClient with safe fallback

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function getDatabase(): Promise<PrismaClient | null> {
  try {
    return prisma;
  } catch (err) {
    console.error("Database connection error:", err);
    return null;
  }
}

export default prisma;
