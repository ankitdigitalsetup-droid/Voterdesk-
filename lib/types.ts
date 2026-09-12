export type Role = "SUPER_ADMIN" | "CANDIDATE_ADMIN" | "KARYAKARTA";

export interface UserAccount {
  id: string;
  name: string;
  phone: string;
  role: Role;
  candidateId?: string;
  assignedBooths?: string[]; // for Karyakarta
}

export interface CandidateAccount {
  id: string;
  name: string;
  phone: string;
  party: string;
  electionName: string;
  wardConstituency: string;
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED";
  voterCount: number;
  boothCount: number;
  createdAt: string;
}

export interface VoterRecord {
  id: string;
  name: string;
  epic: string;
  guardian: string;
  age: string;
  gender: string;
  house: string;
  booth: string;
  status: "Pending" | "Contacted" | "In-Favor" | "Doubtful" | "Opposed" | "Slip-Given";
  worker: string;
  phone?: string;
  notes?: string;
  candidateId: string;
}

export interface TeamMember {
  id: string;
  name: string;
  phone: string;
  roleTitle: string;
  assignedBooths: string[];
  status: "Active" | "Inactive";
  candidateId: string;
  contactedCount: number;
}
