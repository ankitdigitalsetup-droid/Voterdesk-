import { NextResponse } from "next/server";
import { getSessionFromRequest, SessionPayload } from "./session";

export type UserRole = "SUPER_ADMIN" | "CANDIDATE_ADMIN" | "KARYAKARTA";

export interface AuthContext {
  session: SessionPayload;
}

export type AuthResult =
  | { success: true; session: SessionPayload }
  | { success: false; response: NextResponse };

/**
 * Authenticates request and optionally checks for required roles.
 * Returns either the active session or an immediate JSON error response.
 */
export function requireAuth(req: Request, allowedRoles?: UserRole[]): AuthResult {
  const session = getSessionFromRequest(req);

  if (!session) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Unauthorized",
          message: "Authentication is required to access this resource.",
        },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Forbidden",
          message: `Access denied. Requires one of roles: [${allowedRoles.join(", ")}]. Current role: ${session.role}.`,
        },
        { status: 403 }
      ),
    };
  }

  return { success: true, session };
}

/**
 * Verifies if user has permission to view or manage a candidate's data.
 */
export function canAccessCandidate(session: SessionPayload, targetCandidateId: string): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (!targetCandidateId) return true;
  return session.candidateId === targetCandidateId;
}

/**
 * Verifies if a user (especially a Karyakarta) has permission for a specific booth.
 */
export function canAccessBooth(session: SessionPayload, boothNumber: string): boolean {
  if (session.role === "SUPER_ADMIN" || session.role === "CANDIDATE_ADMIN") return true;
  if (!boothNumber || boothNumber === "ALL") return true;
  if (!session.assignedBooths || session.assignedBooths.length === 0) return true;
  return session.assignedBooths.includes(String(boothNumber).trim());
}

/**
 * Filters a voter list based on Karyakarta's assigned booths.
 */
export function filterVotersForRole<T extends { booth: string }>(session: SessionPayload, voters: T[]): T[] {
  if (session.role === "SUPER_ADMIN" || session.role === "CANDIDATE_ADMIN") {
    return voters;
  }
  if (!session.assignedBooths || session.assignedBooths.length === 0) {
    return voters;
  }
  return voters.filter((v) => session.assignedBooths?.includes(String(v.booth).trim()));
}
