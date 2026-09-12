// Database interface for VoterDesk
// Connects to PrismaClient when configured, or provides safe fallback

export type DatabaseClient = any;

let globalDb: DatabaseClient = null;

export async function getDatabase(): Promise<DatabaseClient> {
  if (globalDb) return globalDb;

  try {
    // Dynamic import to avoid build-time errors before prisma generate is run
    // @ts-ignore
    const { PrismaClient } = await import("@prisma/client");
    globalDb = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
    return globalDb;
  } catch {
    // Falls back gracefully to memory store in lib/data-store.ts
    return null;
  }
}

export default getDatabase;
