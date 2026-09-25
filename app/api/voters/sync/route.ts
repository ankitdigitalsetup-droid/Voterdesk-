import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";
import { getVoters, updateVoter, createVoter } from "@/lib/db/voters";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidateId") || "cand_1";
    const clientVersion = searchParams.get("version");
    const worker = searchParams.get("worker") || "";
    const booth = searchParams.get("booth") || "";
    const force = searchParams.get("force") === "true";

    // Track active worker heartbeat
    if (worker) {
      store.recordHeartbeat(worker, booth);
    }

    const serverVersion = store.getVersion();
    const activeWorkers = store.getLiveWorkerCount(candidateId);

    // If client is already up-to-date and not forced, return lightweight response
    if (!force && clientVersion && Number(clientVersion) >= serverVersion) {
      return NextResponse.json({
        success: true,
        hasUpdates: false,
        version: serverVersion,
        activeWorkers,
      });
    }

    // Return fresh voter records from database (with in-memory fallback)
    const result = await getVoters({ candidateId });

    return NextResponse.json({
      success: true,
      hasUpdates: true,
      version: serverVersion,
      voters: result.voters,
      total: result.total,
      source: result.source,
      activeWorkers,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Sync failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { candidateId, voterId, updates, newVoter, worker, booth, location } = body;

    const cId = candidateId || "cand_1";

    if (worker) {
      store.recordHeartbeat(worker, booth);
      if (location && location.lat && location.lng) {
        store.recordWorkerLocation({
          workerName: worker,
          candidateId: cId,
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          assignedBooths: booth ? [booth] : undefined,
        });
      }
    }

    // 1. Batch voter patch (offline queue sync from mobile)
    if (Array.isArray(updates)) {
      for (const item of updates) {
        if (item && item.id) {
          const { id, ...rest } = item;
          await updateVoter(id, rest);
        }
      }
    }
    // 2. Single voter patch (persisted to Neon DB)
    else if (voterId && updates) {
      await updateVoter(voterId, updates);
    }
    // 3. Add single new voter (persisted to Neon DB)
    else if (newVoter) {
      await createVoter({
        ...newVoter,
        candidateId: cId,
      });
    }

    const newVersion = store.getVersion();
    const activeWorkers = store.getLiveWorkerCount(cId);
    const result = await getVoters({ candidateId: cId });

    return NextResponse.json({
      success: true,
      version: newVersion,
      activeWorkers,
      total: result.total,
      voters: result.voters,
      source: result.source,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Sync push failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
