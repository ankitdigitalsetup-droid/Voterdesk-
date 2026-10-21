import { d1Query, d1Execute, isD1Configured } from "@/lib/d1";
import { prisma } from "@/lib/db";
import { store } from "@/lib/data-store";

export interface AuditLogEntry {
  id: string;
  action: string; // "CAMPAIGN_LIVE" | "CAMPAIGN_PAUSE" | "CAMPAIGN_DELETE" | "CAMPAIGN_EDIT" | "CAMPAIGN_CREATE" | "PASSWORD_CHANGE" | "SYSTEM_FIX"
  entityType: string; // "CAMPAIGN" | "USER" | "SYSTEM" | "DATABASE" | "VOTERS"
  entityId?: string;
  entityName?: string;
  details: string;
  performedBy?: string;
  createdAt: string;
}

/**
 * Retrieves the latest system audit logs with multi-database fallback (D1 -> Neon -> Store).
 */
export async function getAuditLogs(limit: number = 50): Promise<AuditLogEntry[]> {
  // 1. Try Cloudflare D1
  if (isD1Configured()) {
    try {
      const rows = await d1Query<any>(
        `SELECT * FROM SystemAuditLog ORDER BY createdAt DESC LIMIT ?`,
        [limit]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          action: r.action,
          entityType: r.entityType,
          entityId: r.entityId || undefined,
          entityName: r.entityName || undefined,
          details: r.details,
          performedBy: r.performedBy || "Super Admin",
          createdAt: r.createdAt ? String(r.createdAt) : new Date().toISOString(),
        }));
      }
    } catch (d1Err) {
      console.warn("Cloudflare D1 getAuditLogs notice:", d1Err);
    }
  }

  // 2. Try Neon PostgreSQL
  try {
    const dbLogs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, action, "entityType", "entityId", "entityName", details, "performedBy", "createdAt"
       FROM "SystemAuditLog"
       ORDER BY "createdAt" DESC
       LIMIT $1`,
      limit
    );
    if (Array.isArray(dbLogs) && dbLogs.length > 0) {
      return dbLogs.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId || undefined,
        entityName: r.entityName || undefined,
        details: r.details,
        performedBy: r.performedBy || "Super Admin",
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.warn("Neon DB getAuditLogs notice:", err);
  }

  // 3. In-memory store fallback
  return store.getAuditLogs ? store.getAuditLogs(limit) : [];
}

/**
 * Creates and persists a new audit log record across D1, Neon, and Store.
 */
export async function createAuditLog(entry: {
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details: string;
  performedBy?: string;
}): Promise<AuditLogEntry> {
  const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const dateStr = now.toISOString().replace("T", " ").substring(0, 19);

  const fullEntry: AuditLogEntry = {
    id,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    entityName: entry.entityName,
    details: entry.details,
    performedBy: entry.performedBy || "Super Admin",
    createdAt: dateStr,
  };

  // 1. Cloudflare D1
  if (isD1Configured()) {
    try {
      await d1Execute(
        `INSERT INTO SystemAuditLog (id, action, entityType, entityId, entityName, details, performedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          fullEntry.id,
          fullEntry.action,
          fullEntry.entityType,
          fullEntry.entityId || null,
          fullEntry.entityName || null,
          fullEntry.details,
          fullEntry.performedBy,
        ]
      );
    } catch (d1Err) {
      console.warn("Cloudflare D1 createAuditLog notice:", d1Err);
    }
  }

  // 2. Neon PostgreSQL
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SystemAuditLog" (id, action, "entityType", "entityId", "entityName", details, "performedBy", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      fullEntry.id,
      fullEntry.action,
      fullEntry.entityType,
      fullEntry.entityId || null,
      fullEntry.entityName || null,
      fullEntry.details,
      fullEntry.performedBy
    );
  } catch (err) {
    console.warn("Neon DB createAuditLog notice:", err);
  }

  // 3. In-memory store
  if (store.addAuditLog) {
    store.addAuditLog(fullEntry);
  }

  return fullEntry;
}
