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
  posterUrl?: string;
}

export interface CandidateCredential {
  id: string;
  name: string;
  phone: string;
  password: string;
  role: Role;
  candidateId: string;
  assignedBooths: string[];
  boothNumber: string;
  roleTitle: string;
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
  serialNo?: number | string; // Serial number in voter roll (क्र सं.)
  status: "Pending" | "Contacted" | "In-Favor" | "Doubtful" | "Opposed" | "Slip-Given";
  worker: string;
  phone?: string; // मोबाइल नो
  address?: string; // एड्रेस
  voted?: boolean | string; // वोट डाला (हाँ/नहीं / Yes/No)
  isSupporter?: boolean | string; // सपोर्टर है (हाँ/नहीं / Yes/No)
  isOutside?: boolean | string; // बाहर है (हाँ/नहीं / Yes/No)
  boothAddress?: string; // Booth Address (मतदान केंद्र पता)
  notes?: string;
  candidateId: string;
  slipMessage?: string; // स्लिप मैसेज (Custom message per voter)
  survey?: {
    supporter?: string; // समर्थक (हाँ/नहीं/संशयित)
    casteCategory?: string; // वर्ग
    casteSub?: string; // जाति चुनें
    casteCustom?: string; // जाति लिखें
    whatsapp?: string; // व्हाट्सएप नं
    education?: string; // शिक्षा
    livelihood?: string; // आजीविका
    livelihoodDetail?: string; // आजीविका विवरण
    outsideState?: string; // बाहरी पता - राज्य
    outsideDistrict?: string; // बाहरी पता - जिला
    outsideAddress?: string; // बाहरी पता - पता
    officeBearer?: string; // पदाधिकारी
    detail1?: string; // अन्य विवरण 1
    detail2?: string; // अन्य विवरण 2
  };
}

export interface WorkerLocation {
  workerId: string;
  name: string;
  phone: string;
  roleTitle: string;
  assignedBooths: string[];
  candidateId: string;
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
  lastUpdated: number;
  isOnline: boolean;
  battery?: number;
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
  location?: WorkerLocation;
}
