export type Role = "super_admin" | "candidate" | "karyakarta";

export interface BoothCredential {
  id: string;
  wardId: string;
  boothNumber: number;
  role: "candidate" | "karyakarta";
  workerIndex?: number; // 1, 2, 3 for Karyakarta, undefined for Candidate
  label: string; // e.g. "Candidate (Booth 1)" or "Karyakarta 2 (Booth 1)"
  username: string; // e.g. "CAND-W12-B1" or "KARY-W12-B1-02"
  password: string; // e.g. "VD#4829"
  active: boolean;
  assignedWorkerName?: string;
  assignedWorkerPhone?: string;
}

export interface VoterRecord {
  id: string;
  wardId: string;
  epic: string;
  name: string;
  guardian: string;
  age: string;
  gender: string;
  house: string;
  booth: number;
  status: "Pending" | "Contacted" | "Follow-up" | "Supporter" | "Correction";
  worker?: string;
  mobile?: string;
  notes?: string;
}

export interface WardConfig {
  id: string;
  wardNumber: string; // e.g. "Ward 12"
  wardName: string; // e.g. "Shastri Nagar"
  electionName: string; // e.g. "Bhilwara Municipal Election 2026"
  candidateName: string; // e.g. "Abhay Kumar"
  candidatePhone: string;
  partyName: string; // e.g. "Independent" or party
  posterUrl: string; // Base64 data URL or preset URL
  symbolName?: string; // e.g. "Rising Sun" or "Kite"
  totalBooths: number; // e.g. 1, 2, 3...
  booths: {
    boothNumber: number;
    name: string;
    location: string;
    voterCount: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  role: Role;
  username: string;
  wardId?: string;
  boothNumber?: number;
  workerIndex?: number;
  candidateName?: string;
  wardName?: string;
  posterUrl?: string;
  label?: string;
}
