import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";

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

    // Return fresh voter records
    const voters = store.getVoters({ candidateId });
    return NextResponse.json({
      success: true,
      hasUpdates: true,
      version: serverVersion,
      voters,
      total: voters.length,
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

    // 1. Single voter patch (e.g. voted, isSupporter, isOutside, phone)
    if (voterId && updates) {
      store.updateVoter(voterId, updates);
    }
    // 2. Add single new voter
    else if (newVoter) {
      store.addVoter({
        ...newVoter,
        candidateId: cId,
      });
    }

    const newVersion = store.getVersion();
    const activeWorkers = store.getLiveWorkerCount(cId);
    const voters = store.getVoters({ candidateId: cId });

    return NextResponse.json({
      success: true,
      version: newVersion,
      activeWorkers,
      total: voters.length,
      voters,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Sync push failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
