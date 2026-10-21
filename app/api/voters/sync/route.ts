import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { store } from "@/lib/data-store";
import { getVoters, updateVoter, createVoter } from "@/lib/db/voters";
import { getCandidateById } from "@/lib/db/candidates";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const candidateId =
      session && session.role !== "SUPER_ADMIN" && session.candidateId
        ? session.candidateId
        : searchParams.get("candidateId") || "cand_1";
    const clientVersion = searchParams.get("version");
    const worker = searchParams.get("worker") || (session ? session.name : "");
    const booth = searchParams.get("booth") || "";
    const force = searchParams.get("force") === "true";

    // Retrieve candidate summary using robust multi-database lookup (Cloudflare D1 -> Neon -> Store)
    let candidateSummary: any = null;
    if (candidateId && candidateId !== "null" && candidateId !== "undefined") {
      try {
        const cand = await getCandidateById(candidateId);
        if (cand) {
          candidateSummary = {
            id: cand.id,
            name: cand.name,
            party: cand.party,
            symbolName: cand.symbolName,
            posterUrl: cand.posterUrl,
            slipMessage: cand.slipMessage || (cand.name ? `Vote for ${cand.name}` : undefined),
            status: cand.status || "ACTIVE",
          };

          // Only block if Super Admin explicitly and intentionally paused this campaign
          const upperStatus = String(cand.status || "").toUpperCase();
          if (upperStatus === "SUSPENDED" || upperStatus === "PAUSED") {
            return NextResponse.json(
              {
                success: false,
                paused: true,
                campaignStatus: "PAUSED",
                error: "यह चुनाव अभियान अभी रोक (PAUSED) दिया गया है। आप लॉगआउट किए जा रहे हैं।",
              },
              { status: 403 }
            );
          }
        }
      } catch (cErr) {
        // Fallback: On temporary DB hiccups, NEVER pause or delete! Always let sync continue.
      }
    }

    // Track active worker heartbeat
    if (worker) {
      store.recordHeartbeat(worker, booth);
    }

    const serverVersion = store.getVersion();
    const activeWorkers = store.getLiveWorkerCount(candidateId);

    // If client is already up-to-date and not forced, return lightweight response with latest candidate
    if (!force && clientVersion && Number(clientVersion) >= serverVersion) {
      return NextResponse.json({
        success: true,
        hasUpdates: false,
        version: serverVersion,
        activeWorkers,
        candidate: candidateSummary,
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
      candidate: candidateSummary,
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
    const session = getSessionFromRequest(req);
    const body = await req.json();
    const { candidateId, voterId, updates, newVoter, worker, booth, location } = body;

    const cId =
      session && session.role !== "SUPER_ADMIN" && session.candidateId
        ? session.candidateId
        : candidateId || "cand_1";

    const workerName = worker || (session ? session.name : "");

    if (workerName) {
      store.recordHeartbeat(workerName, booth);
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
