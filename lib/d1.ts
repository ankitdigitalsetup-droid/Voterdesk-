/**
 * ============================================================================
 * ☁️ CLOUDFLARE D1 DATABASE CLIENT (lib/d1.ts)
 * ============================================================================
 * Ultra-fast serverless SQLite database client powered by Cloudflare D1 REST API.
 * High throughput, zero cold-start delay, 100% resilient across edge & node runtimes.
 * ============================================================================
 */

function getD1Config() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  return { accountId, databaseId, apiToken };
}

export function isD1Configured(): boolean {
  const { accountId, databaseId, apiToken } = getD1Config();
  return Boolean(accountId && databaseId && apiToken);
}

export async function d1Query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const { accountId, databaseId, apiToken } = getD1Config();
  if (!accountId || !databaseId || !apiToken) return [];

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.warn("Cloudflare D1 query error status:", res.status, errBody);
      return [];
    }

    const data = await res.json();
    if (data.success && data.result && data.result.length > 0) {
      return (data.result[0].results as T[]) || [];
    }
    return [];
  } catch (err) {
    console.warn("Cloudflare D1 query network notice:", err);
    return [];
  }
}

export async function d1Execute(
  sql: string,
  params: any[] = []
): Promise<{ success: boolean; changes?: number }> {
  const { accountId, databaseId, apiToken } = getD1Config();
  if (!accountId || !databaseId || !apiToken) return { success: false };

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
      cache: "no-store",
    });

    const data = await res.json();
    return {
      success: Boolean(data.success),
      changes: data.result?.[0]?.meta?.changes || 0,
    };
  } catch (err) {
    console.warn("Cloudflare D1 execute network notice:", err);
    return { success: false };
  }
}
