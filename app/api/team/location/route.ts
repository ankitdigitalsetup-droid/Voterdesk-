import { NextResponse } from "next/server";
import { store } from "@/lib/data-store";
import { updateWorkerLocation } from "@/lib/db/team";
import { isSuperAdminEntity } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidateId") || "cand_1";
    // 🛡️ SUPER ADMIN PRIVACY GUARD: Exclude any Super Admin records
    const locations = store.getWorkerLocations(candidateId).filter((l) => !isSuperAdminEntity(l));
    return NextResponse.json({
      success: true,
      locations,
      total: locations.length,
      onlineCount: locations.filter((l) => l.isOnline).length,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to fetch worker locations", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workerName, workerId, phone, roleTitle, assignedBooths, candidateId, lat, lng, accuracy, address } = body;

    // 🛡️ SUPER ADMIN PRIVACY SHIELD: Discard and do not track Super Admin coordinates
    if (isSuperAdminEntity({ workerName, workerId, phone, roleTitle })) {
      return NextResponse.json({
        success: true,
        message: "Super Admin location is strictly confidential and protected",
        location: null,
        allLocations: store.getWorkerLocations(candidateId || "cand_1").filter((l) => !isSuperAdminEntity(l)),
        timestamp: Date.now(),
      });
    }

    if (!workerName || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "workerName, lat, and lng are required" }, { status: 400 });
    }

    const updated = await updateWorkerLocation({
      workerName,
      workerId,
      phone,
      roleTitle,
      assignedBooths,
      candidateId: candidateId || "cand_1",
      lat: Number(lat),
      lng: Number(lng),
      accuracy: accuracy ? Number(accuracy) : 5,
      address,
    });

    const allLocations = store.getWorkerLocations(candidateId || "cand_1").filter((l) => !isSuperAdminEntity(l));

    return NextResponse.json({
      success: true,
      location: updated,
      allLocations,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to update worker location", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
