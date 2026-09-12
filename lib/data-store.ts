import { CandidateAccount, TeamMember, UserAccount, VoterRecord } from "./types";

// In-Memory global store for high-speed response & instant demo capability
class DataStore {
  private users: (UserAccount & { password: string })[] = [
    {
      id: "usr_super_1",
      name: "Master Super Admin",
      phone: "9999999999",
      password: "superadmin",
      role: "SUPER_ADMIN",
    },
    {
      id: "usr_cand_1",
      name: "Abhay Kumar",
      phone: "9414114497",
      password: "voterdesk",
      role: "CANDIDATE_ADMIN",
      candidateId: "cand_1",
    },
    {
      id: "usr_work_1",
      name: "Amit Joshi",
      phone: "9829012345",
      password: "karyakarta",
      role: "KARYAKARTA",
      candidateId: "cand_1",
      assignedBooths: ["12", "13"],
    },
    {
      id: "usr_work_2",
      name: "Neha Saini",
      phone: "9829054321",
      password: "karyakarta",
      role: "KARYAKARTA",
      candidateId: "cand_1",
      assignedBooths: ["15"],
    }
  ];

  private candidates: CandidateAccount[] = [
    {
      id: "cand_1",
      name: "Abhay Kumar",
      phone: "9414114497",
      party: "Independent (निर्दलीय)",
      electionName: "Bhilwara Municipal Election 2026",
      wardConstituency: "Ward 34",
      status: "ACTIVE",
      voterCount: 28460,
      boothCount: 18,
      createdAt: "2026-08-01",
    },
    {
      id: "cand_2",
      name: "Rajesh Meena",
      phone: "9829011223",
      party: "Lok Vikas Party",
      electionName: "Kota North Municipal 2026",
      wardConstituency: "Ward 12",
      status: "ACTIVE",
      voterCount: 14200,
      boothCount: 9,
      createdAt: "2026-08-15",
    },
    {
      id: "cand_3",
      name: "Sunita Sharma",
      phone: "9829077889",
      party: "Janata Ekta",
      electionName: "Jaipur Nagar Nigam 2026",
      wardConstituency: "Ward 07",
      status: "ACTIVE",
      voterCount: 31200,
      boothCount: 21,
      createdAt: "2026-08-20",
    }
  ];

  private team: TeamMember[] = [
    {
      id: "team_1",
      name: "Amit Joshi",
      phone: "+91 98290 12345",
      roleTitle: "Booth Supervisor",
      assignedBooths: ["12", "13"],
      status: "Active",
      candidateId: "cand_1",
      contactedCount: 84,
    },
    {
      id: "team_2",
      name: "Neha Saini",
      phone: "+91 98290 54321",
      roleTitle: "Field Worker",
      assignedBooths: ["15"],
      status: "Active",
      candidateId: "cand_1",
      contactedCount: 58,
    },
    {
      id: "team_3",
      name: "Rahul Meena",
      phone: "+91 98290 99887",
      roleTitle: "Field Worker",
      assignedBooths: ["14"],
      status: "Active",
      candidateId: "cand_1",
      contactedCount: 67,
    },
    {
      id: "team_4",
      name: "Pooja Rathore",
      phone: "+91 98290 44556",
      roleTitle: "Data Operator",
      assignedBooths: ["18"],
      status: "Active",
      candidateId: "cand_1",
      contactedCount: 41,
    }
  ];

  private voters: VoterRecord[] = [
    {
      id: "v_1",
      name: "Ramesh Kumar Sharma",
      epic: "RJX1032847",
      guardian: "Sohan Lal Sharma",
      age: "46",
      gender: "Male",
      house: "42-A",
      booth: "12",
      status: "Contacted",
      worker: "Amit Joshi",
      phone: "9829011111",
      candidateId: "cand_1",
      notes: "Pakka supporter. Requested voter slip early."
    },
    {
      id: "v_2",
      name: "Sunita Devi",
      epic: "RJX1075231",
      guardian: "Mahesh Kumar",
      age: "39",
      gender: "Female",
      house: "18",
      booth: "12",
      status: "In-Favor",
      worker: "Amit Joshi",
      phone: "9829022222",
      candidateId: "cand_1",
      notes: "Will vote with entire family (4 voters)."
    },
    {
      id: "v_3",
      name: "Mohammad Arif",
      epic: "RJX1186309",
      guardian: "Abdul Karim",
      age: "52",
      gender: "Male",
      house: "77-B",
      booth: "14",
      status: "Pending",
      worker: "Rahul Meena",
      candidateId: "cand_1",
    },
    {
      id: "v_4",
      name: "Kavita Joshi",
      epic: "RJX1208452",
      guardian: "Gopal Joshi",
      age: "31",
      gender: "Female",
      house: "103",
      booth: "15",
      status: "Contacted",
      worker: "Neha Saini",
      candidateId: "cand_1",
    },
    {
      id: "v_5",
      name: "Deepak Verma",
      epic: "RJX1253098",
      guardian: "Rajendra Verma",
      age: "28",
      gender: "Male",
      house: "09-C",
      booth: "15",
      status: "Pending",
      worker: "Neha Saini",
      candidateId: "cand_1",
    },
    {
      id: "v_6",
      name: "Sanjay Gehlot",
      epic: "RJX1342111",
      guardian: "Ramnarayan Gehlot",
      age: "37",
      gender: "Male",
      house: "12-B",
      booth: "12",
      status: "Slip-Given",
      worker: "Amit Joshi",
      phone: "9829033333",
      candidateId: "cand_1",
    },
    {
      id: "v_7",
      name: "Manju Choudhary",
      epic: "RJX1490232",
      guardian: "Kailash Choudhary",
      age: "42",
      gender: "Female",
      house: "55",
      booth: "13",
      status: "In-Favor",
      worker: "Amit Joshi",
      candidateId: "cand_1",
    },
    {
      id: "v_8",
      name: "Vikram Singh Rathore",
      epic: "RJX1589441",
      guardian: "Bhawani Singh",
      age: "51",
      gender: "Male",
      house: "01-Raj",
      booth: "18",
      status: "Pending",
      worker: "Pooja Rathore",
      candidateId: "cand_1",
    }
  ];

  // Auth
  authenticate(phone: string, password?: string) {
    const cleanPhone = phone.replace(/\D/g, "");
    return this.users.find(
      (u) =>
        u.phone.replace(/\D/g, "") === cleanPhone &&
        (!password || u.password === password)
    );
  }

  getUser(id: string) {
    return this.users.find((u) => u.id === id);
  }

  // Candidates
  getCandidates() {
    return this.candidates;
  }

  getCandidate(id: string) {
    return this.candidates.find((c) => c.id === id);
  }

  addCandidate(cand: Omit<CandidateAccount, "id" | "createdAt" | "voterCount"> & { password?: string }) {
    const id = "cand_" + Date.now();
    const newCand: CandidateAccount = {
      ...cand,
      id,
      voterCount: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    this.candidates.unshift(newCand);

    // Also create candidate user
    this.users.push({
      id: "usr_" + id,
      name: cand.name,
      phone: cand.phone,
      password: cand.password || "voterdesk",
      role: "CANDIDATE_ADMIN",
      candidateId: id,
    });

    return newCand;
  }

  // Voters
  getVoters(params: { candidateId?: string; booth?: string; status?: string; query?: string }) {
    let list = this.voters;
    if (params.candidateId) {
      list = list.filter((v) => v.candidateId === params.candidateId);
    }
    if (params.booth && params.booth !== "ALL") {
      list = list.filter((v) => v.booth === params.booth);
    }
    if (params.status && params.status !== "ALL") {
      list = list.filter((v) => v.status.toLowerCase() === params.status?.toLowerCase());
    }
    if (params.query) {
      const q = params.query.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.epic.toLowerCase().includes(q) ||
          (v.guardian && v.guardian.toLowerCase().includes(q)) ||
          v.house.toLowerCase().includes(q) ||
          v.booth.toLowerCase().includes(q)
      );
    }
    return list;
  }

  addVoter(voter: Omit<VoterRecord, "id">) {
    const newVoter: VoterRecord = {
      ...voter,
      id: "v_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    };
    this.voters.unshift(newVoter);

    // Update candidate count
    const cand = this.candidates.find((c) => c.id === voter.candidateId);
    if (cand) cand.voterCount += 1;

    return newVoter;
  }

  importVoters(candidateId: string, items: Omit<VoterRecord, "id" | "candidateId">[]) {
    let imported = 0;
    const added: VoterRecord[] = [];
    for (const item of items) {
      // Avoid exact duplicate EPIC
      const existing = this.voters.find((v) => v.candidateId === candidateId && v.epic.trim().toUpperCase() === item.epic.trim().toUpperCase());
      if (!existing && item.name && item.epic) {
        const v: VoterRecord = {
          ...item,
          id: "v_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          candidateId,
          status: item.status || "Pending",
          worker: item.worker || "Unassigned",
        };
        this.voters.push(v);
        added.push(v);
        imported++;
      }
    }

    const cand = this.candidates.find((c) => c.id === candidateId);
    if (cand) cand.voterCount += imported;

    return { imported, total: this.voters.filter((v) => v.candidateId === candidateId).length };
  }

  updateVoter(id: string, updates: Partial<VoterRecord>) {
    const idx = this.voters.findIndex((v) => v.id === id);
    if (idx !== -1) {
      this.voters[idx] = { ...this.voters[idx], ...updates };
      return this.voters[idx];
    }
    return null;
  }

  deleteVoter(id: string) {
    const idx = this.voters.findIndex((v) => v.id === id);
    if (idx !== -1) {
      const removed = this.voters.splice(idx, 1)[0];
      const cand = this.candidates.find((c) => c.id === removed.candidateId);
      if (cand && cand.voterCount > 0) cand.voterCount -= 1;
      return true;
    }
    return false;
  }

  // Team
  getTeam(candidateId: string) {
    return this.team.filter((t) => t.candidateId === candidateId);
  }

  addTeamMember(member: Omit<TeamMember, "id" | "contactedCount"> & { password?: string }) {
    const id = "team_" + Date.now();
    const newMember: TeamMember = {
      ...member,
      id,
      contactedCount: 0,
    };
    this.team.push(newMember);

    // Also register karyakarta user
    this.users.push({
      id: "usr_" + id,
      name: member.name,
      phone: member.phone,
      password: member.password || "karyakarta",
      role: "KARYAKARTA",
      candidateId: member.candidateId,
      assignedBooths: member.assignedBooths,
    });

    return newMember;
  }

  // Stats
  getStats(candidateId: string) {
    const candVoters = this.voters.filter((v) => v.candidateId === candidateId);
    const total = candVoters.length;
    const contacted = candVoters.filter((v) => v.status === "Contacted" || v.status === "In-Favor" || v.status === "Slip-Given").length;
    const pending = candVoters.filter((v) => v.status === "Pending").length;
    const inFavor = candVoters.filter((v) => v.status === "In-Favor").length;
    const slipGiven = candVoters.filter((v) => v.status === "Slip-Given").length;

    // Booth-wise counts
    const boothMap: Record<string, { total: number; contacted: number }> = {};
    for (const v of candVoters) {
      if (!boothMap[v.booth]) {
        boothMap[v.booth] = { total: 0, contacted: 0 };
      }
      boothMap[v.booth].total += 1;
      if (v.status !== "Pending") {
        boothMap[v.booth].contacted += 1;
      }
    }

    return {
      total,
      contacted,
      pending,
      inFavor,
      slipGiven,
      boothBreakdown: Object.entries(boothMap).map(([booth, data]) => ({
        booth: `Booth ${booth}`,
        boothNo: booth,
        total: data.total,
        contacted: data.contacted,
        percentage: data.total > 0 ? Math.round((data.contacted / data.total) * 100) : 0,
      })),
    };
  }
}

// Global singleton instance
const globalForStore = globalThis as unknown as { store: DataStore | undefined };
export const store = globalForStore.store ?? new DataStore();
if (process.env.NODE_ENV !== "production") globalForStore.store = store;
export default store;
