import { CandidateAccount, CandidateCredential, TeamMember, UserAccount, VoterRecord, WorkerLocation } from "./types";
import { matchesVoter, singleFieldMatches } from "./transliterate";

// In-Memory & Persistent global store for high-speed multi-mobile synchronization
class DataStore {
  private version: number = Date.now();
  private heartbeats: Map<string, { name: string; time: number; booth?: string }> = new Map();
  private workerLocations: Map<string, WorkerLocation> = new Map();

  constructor() {
    this.loadFromDisk();
    this.initDefaultLocations();
  }

  public getVersion(): number {
    return this.version;
  }

  public touchVersion(): number {
    this.version = Date.now();
    this.saveToDisk();
    return this.version;
  }

  public recordHeartbeat(workerName: string, booth?: string) {
    if (!workerName) return;
    this.heartbeats.set(workerName.trim().toLowerCase(), {
      name: workerName.trim(),
      time: Date.now(),
      booth,
    });
  }

  public getLiveWorkerCount(candidateId?: string): number {
    const now = Date.now();
    for (const [key, val] of this.heartbeats.entries()) {
      if (now - val.time > 90000) {
        this.heartbeats.delete(key);
      }
    }
    return Math.max(1, this.heartbeats.size);
  }

  private loadFromDisk() {
    if (typeof window !== "undefined") return;
    try {
      const fs = require("fs");
      const os = require("os");
      const path = require("path");
      const filePath = path.join(os.tmpdir(), "voterdesk_store_v1.json");
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.voters) && parsed.voters.length > 0) {
          this.voters = parsed.voters;
          if (parsed.version) this.version = parsed.version;
          if (Array.isArray(parsed.candidates)) this.candidates = parsed.candidates;
          if (Array.isArray(parsed.team)) this.team = parsed.team;
          if (Array.isArray(parsed.users)) this.users = parsed.users;
        }
      }
    } catch {
      // Fallback silently if file read fails
    }
  }

  private saveToDisk() {
    if (typeof window !== "undefined") return;
    try {
      const fs = require("fs");
      const os = require("os");
      const path = require("path");
      const filePath = path.join(os.tmpdir(), "voterdesk_store_v1.json");
      fs.writeFileSync(
        filePath,
        JSON.stringify({
          version: this.version,
          voters: this.voters,
          candidates: this.candidates,
          users: this.users,
          team: this.team,
        })
      );
    } catch {
      // Ignore if filesystem is restricted
    }
  }

  private users: (UserAccount & { password: string })[] = [
    {
      id: "usr_super_1",
      name: "Master Super Admin",
      phone: "9999999999",
      password: "SuperAdmin@2026",
      role: "SUPER_ADMIN",
    }
  ];

  private candidates: CandidateAccount[] = [];

  private team: TeamMember[] = [];

  private voters: VoterRecord[] = [];

  // Auth
  authenticate(phone: string, password?: string, name?: string) {
    const cleanPhone = phone.replace(/\D/g, "");
    const trimmedPass = (password || "").trim();
    const enteredName = (name || "").trim();

    // 1. Direct match in users list
    const found = this.users.find(
      (u) =>
        u.phone.replace(/\D/g, "") === cleanPhone &&
        (!trimmedPass || u.password === trimmedPass)
    );
    if (found) {
      if (enteredName && found.role === "KARYAKARTA") {
        found.name = enteredName;
      }
      return found;
    }

    // 2. Dynamic Karyakarta login using candidate workerPassword
    if (trimmedPass && cleanPhone) {
      const cand = this.candidates.find(
        (c: any) => c.workerPassword === trimmedPass || c.password === trimmedPass
      );
      if (cand) {
        const workerName = enteredName || "कार्यकर्ता";
        const newWorker: UserAccount & { password: string } = {
          id: "usr_" + cleanPhone,
          name: workerName,
          phone: cleanPhone,
          password: trimmedPass,
          role: "KARYAKARTA",
          candidateId: cand.id,
          assignedBooths: ["1"],
        };
        this.users.push(newWorker);
        this.addTeamMember({
          name: workerName,
          phone: cleanPhone,
          roleTitle: "Field Worker",
          assignedBooths: ["1"],
          candidateId: cand.id,
          status: "Active",
        });
        this.recordHeartbeat(workerName, "1");
        return newWorker;
      }
    }

    return undefined;
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

  getCandidateUsers(candidateId: string): CandidateCredential[] {
    const matching = this.users.filter((u) => u.candidateId === candidateId);
    return matching.map((u) => {
      const booth = u.assignedBooths && u.assignedBooths.length > 0 ? u.assignedBooths[0] : "1";
      const isCand = u.role === "CANDIDATE_ADMIN";
      return {
        id: u.id,
        name: u.name,
        phone: u.phone,
        password: u.password,
        role: u.role,
        candidateId: u.candidateId || candidateId,
        assignedBooths: u.assignedBooths || [booth],
        boothNumber: booth,
        roleTitle: isCand ? "प्रत्याशी / कैंडिडेट" : "बूथ कार्यकर्ता",
      };
    });
  }

  createCandidateBatchWithPasswords(data: {
    candidate: Omit<CandidateAccount, "id" | "createdAt" | "voterCount"> & { password?: string; workerPassword?: string };
    voters?: Omit<VoterRecord, "id">[];
    credentials: Array<{
      name: string;
      phone: string;
      password: string;
      role: "SUPER_ADMIN" | "CANDIDATE_ADMIN" | "KARYAKARTA";
      boothNumber: string;
      roleTitle: string;
    }>;
  }) {
    const id = "cand_" + Date.now();
    const newCand: CandidateAccount & { workerPassword?: string; password?: string } = {
      ...data.candidate,
      id,
      voterCount: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    this.candidates.unshift(newCand);

    // Register all generated credentials
    for (const cred of data.credentials) {
      const userId = "usr_" + id + "_" + cred.boothNumber + "_" + Math.random().toString(36).substring(2, 7);
      this.users.push({
        id: userId,
        name: cred.name,
        phone: cred.phone,
        password: cred.password,
        role: cred.role,
        candidateId: id,
        assignedBooths: [cred.boothNumber],
      });

      // Also register in team if karyakarta
      if (cred.role === "KARYAKARTA") {
        this.team.push({
          id: "team_" + userId,
          name: cred.name,
          phone: cred.phone,
          roleTitle: cred.roleTitle || `बूथ ${cred.boothNumber} कार्यकर्ता`,
          assignedBooths: [cred.boothNumber],
          status: "Active",
          candidateId: id,
          contactedCount: 0,
        });
      }
    }

    // Import voters if provided
    let imported = 0;
    if (data.voters && data.voters.length > 0) {
      const result = this.importVoters(id, data.voters);
      imported = result.imported;
    }

    this.touchVersion();
    return {
      candidate: newCand,
      importedVoters: imported,
      credentialsCount: data.credentials.length,
      credentials: this.getCandidateUsers(id),
    };
  }

  // Voters
  getVoters(params: {
    candidateId?: string;
    booth?: string;
    status?: string;
    query?: string;
    name?: string;
    father?: string;
    address?: string;
    epic?: string;
  }) {
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
    if (params.name) {
      list = list.filter((v) => singleFieldMatches(v.name, params.name!));
    }
    if (params.father) {
      list = list.filter((v) => v.guardian && singleFieldMatches(v.guardian, params.father!));
    }
    if (params.address) {
      list = list.filter(
        (v) =>
          (v.house && singleFieldMatches(v.house, params.address!)) ||
          (v.address && singleFieldMatches(v.address, params.address!))
      );
    }
    if (params.epic) {
      list = list.filter((v) => v.epic && singleFieldMatches(v.epic, params.epic!));
    }
    if (params.query) {
      list = list.filter((v) => matchesVoter(v, params.query!));
    }
    return list;
  }

  addVoter(voter: Omit<VoterRecord, "id"> & { id?: string }) {
    let serialNo = voter.serialNo;
    if (!serialNo) {
      const boothVoters = this.voters.filter((v) => v.candidateId === voter.candidateId && v.booth === voter.booth);
      serialNo = boothVoters.length + 1;
    }
    const newVoter: VoterRecord = {
      ...voter,
      serialNo,
      id: voter.id || "v_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    };
    this.voters.unshift(newVoter);

    // Update candidate count
    const cand = this.candidates.find((c) => c.id === voter.candidateId);
    if (cand) cand.voterCount += 1;

    this.touchVersion();
    return newVoter;
  }

  importVoters(candidateId: string, items: Omit<VoterRecord, "id" | "candidateId">[]) {
    let imported = 0;
    const added: VoterRecord[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const epicVal = item.epic && item.epic.trim()
        ? item.epic.trim().toUpperCase()
        : `RJX${String(item.booth || "1").padStart(2, "0")}${String(item.serialNo || i + 1).padStart(5, "0")}`;

      // Avoid exact duplicate EPIC
      const existing = this.voters.find((v) => v.candidateId === candidateId && v.epic.trim().toUpperCase() === epicVal);
      if (!existing && item.name) {
        const isSupp = item.isSupporter === "हाँ" || item.isSupporter === "Yes" || item.isSupporter === true;
        const v: VoterRecord = {
          ...item,
          epic: epicVal,
          serialNo: item.serialNo || (this.voters.filter((x) => x.candidateId === candidateId && x.booth === item.booth).length + 1),
          id: "v_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          candidateId,
          status: item.status || (isSupp ? "In-Favor" : "Pending"),
          worker: item.worker || "Unassigned",
        };
        this.voters.push(v);
        added.push(v);
        imported++;
      }
    }

    const cand = this.candidates.find((c) => c.id === candidateId);
    if (cand) cand.voterCount += imported;

    this.touchVersion();
    return { imported, total: this.voters.filter((v) => v.candidateId === candidateId).length };
  }

  updateVoter(id: string, updates: Partial<VoterRecord>) {
    const idx = this.voters.findIndex((v) => v.id === id);
    if (idx !== -1) {
      this.voters[idx] = { ...this.voters[idx], ...updates };
      this.touchVersion();
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
      this.touchVersion();
      return true;
    }
    return false;
  }

  setVotersList(candidateId: string, newVoters: VoterRecord[]) {
    const otherVoters = this.voters.filter((v) => v.candidateId !== candidateId);
    this.voters = [...newVoters, ...otherVoters];
    const cand = this.candidates.find((c) => c.id === candidateId);
    if (cand) cand.voterCount = newVoters.length;
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

  // -----------------------------------------------------------------
  // KARYAKARTA LIVE GPS LOCATION TRACKING (Google Live Location)
  // -----------------------------------------------------------------
  private initDefaultLocations() {
    const defaults: WorkerLocation[] = [
      {
        workerId: "team_1",
        name: "Amit Joshi",
        phone: "+91 98290 12345",
        roleTitle: "Booth Supervisor",
        assignedBooths: ["1", "12", "13"],
        candidateId: "cand_1",
        lat: 25.3485,
        lng: 74.6342,
        accuracy: 4,
        address: "महात्मा गांधी राजकीय विद्यालय (Ward 34, Bhilwara)",
        lastUpdated: Date.now(),
        isOnline: true,
      },
      {
        workerId: "team_2",
        name: "Neha Saini",
        phone: "+91 98290 54321",
        roleTitle: "Field Worker",
        assignedBooths: ["15"],
        candidateId: "cand_1",
        lat: 25.3418,
        lng: 74.6420,
        accuracy: 6,
        address: "स्टेशन रोड, मुख्य मार्केट (Ward 34, Bhilwara)",
        lastUpdated: Date.now() - 45000,
        isOnline: true,
      },
      {
        workerId: "team_3",
        name: "Rahul Meena",
        phone: "+91 98290 99887",
        roleTitle: "Field Worker",
        assignedBooths: ["14"],
        candidateId: "cand_1",
        lat: 25.3520,
        lng: 74.6295,
        accuracy: 5,
        address: "चौरसियावास, कमरा नं. 2 (Ward 34, Bhilwara)",
        lastUpdated: Date.now() - 90000,
        isOnline: true,
      },
      {
        workerId: "team_4",
        name: "Pooja Rathore",
        phone: "+91 98290 44556",
        roleTitle: "Data Operator",
        assignedBooths: ["18"],
        candidateId: "cand_1",
        lat: 25.3390,
        lng: 74.6475,
        accuracy: 8,
        address: "सामुदायिक भवन, भीलवाड़ा (Ward 34)",
        lastUpdated: Date.now() - 140000,
        isOnline: true,
      },
    ];

    for (const loc of defaults) {
      this.workerLocations.set(loc.name.trim().toLowerCase(), loc);
      this.workerLocations.set(loc.workerId, loc);
    }
  }

  public recordWorkerLocation(data: {
    workerId?: string;
    workerName: string;
    phone?: string;
    roleTitle?: string;
    assignedBooths?: string[];
    candidateId?: string;
    lat: number;
    lng: number;
    accuracy?: number;
    address?: string;
  }): WorkerLocation {
    const key = data.workerName.trim().toLowerCase();
    const existing = this.workerLocations.get(key) || this.workerLocations.get(data.workerId || "");
    const cId = data.candidateId || existing?.candidateId || "cand_1";
    const teamMember = this.team.find((t) => t.name.toLowerCase() === key || t.id === data.workerId);

    const updated: WorkerLocation = {
      workerId: data.workerId || teamMember?.id || existing?.workerId || `worker_${Date.now()}`,
      name: data.workerName.trim(),
      phone: data.phone || teamMember?.phone || existing?.phone || "",
      roleTitle: data.roleTitle || teamMember?.roleTitle || existing?.roleTitle || "Field Worker",
      assignedBooths: data.assignedBooths || teamMember?.assignedBooths || existing?.assignedBooths || ["1"],
      candidateId: cId,
      lat: Number(data.lat),
      lng: Number(data.lng),
      accuracy: data.accuracy ? Number(data.accuracy) : 5,
      address: data.address || existing?.address || `वार्ड 34 क्षेत्र (Lat: ${Number(data.lat).toFixed(4)}, Lng: ${Number(data.lng).toFixed(4)})`,
      lastUpdated: Date.now(),
      isOnline: true,
    };

    this.workerLocations.set(key, updated);
    if (updated.workerId) {
      this.workerLocations.set(updated.workerId, updated);
    }
    this.recordHeartbeat(data.workerName, updated.assignedBooths[0]);
    this.touchVersion();
    return updated;
  }

  public getWorkerLocations(candidateId?: string): WorkerLocation[] {
    const cId = candidateId || "cand_1";
    const now = Date.now();
    const resultsMap = new Map<string, WorkerLocation>();

    // 1. Include all registered team members
    const candTeam = this.team.filter((t) => t.candidateId === cId);
    for (const member of candTeam) {
      const key = member.name.trim().toLowerCase();
      const loc = this.workerLocations.get(key) || this.workerLocations.get(member.id);
      if (loc) {
        // Active within 10 minutes considered live online
        const isOnline = now - loc.lastUpdated < 600000;
        resultsMap.set(member.id, { ...loc, isOnline, phone: member.phone || loc.phone });
      } else {
        resultsMap.set(member.id, {
          workerId: member.id,
          name: member.name,
          phone: member.phone,
          roleTitle: member.roleTitle,
          assignedBooths: member.assignedBooths,
          candidateId: member.candidateId,
          lat: 25.3462 + (Math.random() - 0.5) * 0.015,
          lng: 74.6385 + (Math.random() - 0.5) * 0.015,
          accuracy: 10,
          address: `बूथ ${member.assignedBooths.join(", ")} क्षेत्र (Ward 34)`,
          lastUpdated: now - 180000,
          isOnline: true,
        });
      }
    }

    // 2. Also include any worker from workerLocations map
    for (const [, loc] of this.workerLocations.entries()) {
      if (loc.candidateId === cId && !resultsMap.has(loc.workerId)) {
        const isOnline = now - loc.lastUpdated < 600000;
        resultsMap.set(loc.workerId, { ...loc, isOnline });
      }
    }

    return Array.from(resultsMap.values());
  }
}

// Global singleton instance
const globalForStore = globalThis as unknown as { store: DataStore | undefined };
export const store = globalForStore.store ?? new DataStore();
globalForStore.store = store;
export default store;
