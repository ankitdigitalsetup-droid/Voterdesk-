/**
 * ============================================================================
 * 📦 VOTERDESK GLOBAL DATA STORE & UTILITIES (lib/data-store.ts)
 * ============================================================================
 * Welcome Developer! Yeh file VoterDesk application ka central data layer hai.
 * Yahan voter records, candidate credentials, karyakarta team, heartbeats,
 * aur live GPS locations ka state management aur synchronization hota hai.
 *
 * 📌 KEY FUNCTIONS & CLASSES:
 * 1. `compareVotersBySerial`: Natural numerical sorting (Booth -> Serial No -> Name).
 * 2. `isVoterDeleted`: Robust detection for deleted / विलोपित voters.
 * 3. `DataStore`: Global singleton memory store with disk backup & sync versioning.
 * ============================================================================
 */

import { CandidateAccount, CandidateCredential, TeamMember, UserAccount, VoterRecord, WorkerLocation, BoothAccessPassword, isSuperAdminEntity } from "./types";
import { matchesVoter, singleFieldMatches } from "./transliterate";
import { DEFAULT_CANDIDATES, DEFAULT_PASSWORDS, DEFAULT_USERS, DEFAULT_TEAM, DEFAULT_SAMPLE_VOTERS } from "./default-campaigns";
import { extractRowEpic } from "./excel-helper";

/**
 * 1. NATURAL NUMERICAL COMPARATOR (क्रम संख्या सॉर्टिंग)
 * - Orders strictly by booth (1, 2, 3...) and serialNo (1, 2, 3, 4, ... 10, ... 100, ... 1000).
 * - Never orders lexicographically as strings (1, 10, 100, 1000).
 * - Solves the common JavaScript string sorting bug on serial numbers.
 */
export function compareVotersBySerial(a: VoterRecord, b: VoterRecord, desc = false): number {
  const boothA = parseInt(String(a.booth || "").replace(/\D/g, ""), 10);
  const boothB = parseInt(String(b.booth || "").replace(/\D/g, ""), 10);
  const validBoothA = isNaN(boothA) ? 0 : boothA;
  const validBoothB = isNaN(boothB) ? 0 : boothB;
  if (validBoothA !== validBoothB) {
    return validBoothA - validBoothB;
  }

  const numA = parseInt(String(a.serialNo || "").replace(/\D/g, ""), 10);
  const numB = parseInt(String(b.serialNo || "").replace(/\D/g, ""), 10);
  const validA = isNaN(numA) ? 99999999 : numA;
  const validB = isNaN(numB) ? 99999999 : numB;

  if (validA !== validB) {
    return desc ? validB - validA : validA - validB;
  }

  return (a.name || "").localeCompare(b.name || "");
}

/**
 * Detects whether a voter record has "Deleted" / "विलोपित" status.
 * Checks voterStatus property, extraData, and any raw fields matching "status", "deleted", "विलोपित", etc.
 */
export function isVoterDeleted(v: VoterRecord | any): boolean {
  if (!v) return false;

  // 1. Direct voterStatus property
  if (v.voterStatus) {
    const s = String(v.voterStatus).trim().toLowerCase();
    if (s.includes("delete") || s.includes("विलोपित") || s.includes("हटा") || s.includes("निरस्त") || s.includes("inactive") || s === "d" || s === "del") {
      return true;
    }
    if (s.includes("active") || s.includes("सक्रिय") || s === "a") {
      return false;
    }
  }

  // 2. Direct status property if set to deleted
  if (v.status) {
    const st = String(v.status).trim().toLowerCase();
    if (st === "deleted" || st === "delete" || st === "विलोपित" || st === "हटाया" || st === "हटाया गया" || st === "inactive" || st === "निरस्त") {
      return true;
    }
  }

  // 3. Notes property (may contain serialized extraData or deletion notes)
  if (v.notes) {
    const nStr = String(v.notes).trim();
    if (nStr.startsWith("{")) {
      try {
        const parsed = JSON.parse(nStr);
        if (parsed && typeof parsed === "object") {
          if (parsed.voterStatus) {
            const ps = String(parsed.voterStatus).trim().toLowerCase();
            if (ps.includes("delete") || ps.includes("विलोपित") || ps.includes("हटा") || ps.includes("निरस्त") || ps.includes("inactive") || ps === "d" || ps === "del") {
              return true;
            }
          }
          if (parsed.extraData && typeof parsed.extraData === "object") {
            for (const [ek, ev] of Object.entries(parsed.extraData)) {
              const ekLow = ek.toLowerCase();
              const evStr = String(ev || "").trim().toLowerCase();
              if (ekLow.includes("status") || ekLow.includes("स्थिति") || ekLow.includes("active") || ekLow.includes("delete") || ekLow.includes("विलोपित") || ekLow.includes("हटा") || ekLow.includes("निरस्त")) {
                if (evStr.includes("delete") || evStr.includes("विलोपित") || evStr.includes("हटा") || evStr.includes("निरस्त") || evStr.includes("inactive") || evStr === "d" || evStr === "del") {
                  return true;
                }
              }
            }
          }
        }
      } catch {}
    }
    const nLow = nStr.toLowerCase();
    if (nLow === "deleted" || nLow === "विलोपित" || nLow.includes("विलोपित मतदाता") || nLow.includes("deleted voter")) {
      return true;
    }
  }

  // 4. Extra data or any dynamic column
  if (v.extraData && typeof v.extraData === "object") {
    for (const [k, val] of Object.entries(v.extraData)) {
      const kLow = k.toLowerCase();
      const vStr = String(val || "").trim().toLowerCase();
      if (!vStr) continue;

      if (kLow.includes("status") || kLow.includes("स्थिति") || kLow.includes("active") || kLow.includes("delete") || kLow.includes("विलोपित") || kLow.includes("हटा") || kLow.includes("निरस्त") || kLow.includes("state") || kLow.includes("हालत") || kLow.includes("दशा")) {
        if (vStr.includes("delete") || vStr.includes("विलोपित") || vStr.includes("हटा") || vStr.includes("निरस्त") || vStr.includes("inactive") || vStr === "d" || vStr === "del") {
          return true;
        }
      } else {
        if (vStr === "deleted" || vStr === "विलोपित" || vStr === "हटाया" || vStr === "हटाया गया" || vStr === "निरस्त" || vStr === "inactive") {
          return true;
        }
      }
    }
  }

  // 5. Fallback check on top-level record keys (from raw row parsing)
  for (const [k, val] of Object.entries(v as Record<string, any>)) {
    if (
      k === "status" ||
      k === "worker" ||
      k === "notes" ||
      k === "slipMessage" ||
      k === "survey" ||
      k === "extraData" ||
      k === "name" ||
      k === "guardian" ||
      k === "address" ||
      k === "boothAddress" ||
      k === "house" ||
      k === "id" ||
      k === "candidateId"
    ) {
      continue;
    }
    const kLow = k.toLowerCase();
    const vStr = String(val || "").trim().toLowerCase();
    if (!vStr) continue;

    if (kLow.includes("status") || kLow.includes("स्थिति") || kLow.includes("active") || kLow.includes("delete") || kLow.includes("विलोपित") || kLow.includes("हटा") || kLow.includes("निरस्त") || kLow.includes("state") || kLow.includes("हालत") || kLow.includes("दशा")) {
      if (vStr.includes("delete") || vStr.includes("विलोपित") || vStr.includes("हटा") || vStr.includes("निरस्त") || vStr.includes("inactive") || vStr === "d" || vStr === "del") {
        return true;
      }
    } else {
      if (vStr === "deleted" || vStr === "विलोपित" || vStr === "हटाया" || vStr === "हटाया गया" || vStr === "निरस्त" || vStr === "inactive") {
        return true;
      }
    }
  }

  return false;
}

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
        if (parsed) {
          if (parsed.version) this.version = parsed.version;
          if (Array.isArray(parsed.candidates) && parsed.candidates.length > 0) this.candidates = parsed.candidates;
          if (Array.isArray(parsed.team) && parsed.team.length > 0) this.team = parsed.team;
          if (Array.isArray(parsed.users) && parsed.users.length > 0) this.users = parsed.users;
          if (Array.isArray(parsed.voters) && parsed.voters.length > 0) this.voters = parsed.voters;
          if (Array.isArray(parsed.accessPasswords) && parsed.accessPasswords.length > 0) this.accessPasswords = parsed.accessPasswords;
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
          accessPasswords: this.accessPasswords,
        })
      );
    } catch {
      // Ignore if filesystem is restricted
    }
  }

  private users: (UserAccount & { password: string })[] = [...DEFAULT_USERS];

  private candidates: CandidateAccount[] = [...DEFAULT_CANDIDATES];

  private team: TeamMember[] = [...DEFAULT_TEAM];

  private voters: VoterRecord[] = [...DEFAULT_SAMPLE_VOTERS];

  private accessPasswords: BoothAccessPassword[] = [...DEFAULT_PASSWORDS];

  private auditLogs: any[] = [];

  private deletedCandidateIds: Set<string> = new Set();

  addAuditLog(entry: any) {
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 200) this.auditLogs.pop();
    this.touchVersion();
  }

  getAuditLogs(limit: number = 50): any[] {
    return this.auditLogs.slice(0, limit);
  }

  getAllAccessPasswords(): BoothAccessPassword[] {
    return this.accessPasswords.filter((p) => !this.deletedCandidateIds.has(p.candidateId));
  }

  // Auth: Password determines whether the user is ADMIN or MEMBER
  authenticate(phone: string, password?: string, name?: string) {
    const cleanPhone = phone.replace(/\D/g, "");
    const trimmedPass = (password || "").trim();
    const enteredName = (name || "").trim();

    // 1. Direct match in users list
    const found = this.users.find(
      (u) =>
        u.phone.replace(/\D/g, "") === cleanPhone &&
        (!u.password || !trimmedPass || u.password === trimmedPass)
    );
    if (found) {
      if (found.role !== "SUPER_ADMIN" && found.candidateId) {
        const cand = this.candidates.find((c) => c.id === found.candidateId);
        if (cand && (cand.status === "SUSPENDED" || (cand.status as string) === "PAUSED")) {
          return undefined; // Block paused campaign
        }
      }
      if (enteredName && found.role !== "SUPER_ADMIN") {
        found.name = enteredName;
      }
      return found;
    }

    // 2. Check 9-digit + 1 special char Booth Access Passwords
    if (trimmedPass) {
      const matchedPwd = this.accessPasswords.find((p) => p.password === trimmedPass);
      if (matchedPwd) {
        if (this.deletedCandidateIds.has(matchedPwd.candidateId)) {
          return undefined; // Block deleted campaign password
        }
        const cand = this.candidates.find((c) => c.id === matchedPwd.candidateId && !this.deletedCandidateIds.has(c.id));
        if (cand && (cand.status === "SUSPENDED" || (cand.status as string) === "PAUSED")) {
          return undefined; // Block if campaign does not exist or is paused
        }
        if (matchedPwd.role === "CANDIDATE_ADMIN") {
          const candAdminName = enteredName || cand?.name || "Candidate Admin";
          const newAdmin: UserAccount & { password: string } = {
            id: "usr_" + cleanPhone,
            name: candAdminName,
            phone: cleanPhone,
            password: trimmedPass,
            role: "CANDIDATE_ADMIN",
            candidateId: matchedPwd.candidateId,
            assignedBooths: [matchedPwd.boothNumber],
          };
          this.users = this.users.filter((u) => u.phone !== cleanPhone);
          this.users.push(newAdmin);
          return newAdmin;
        } else {
          // MEMBER (Karyakarta)
          const workerName = enteredName || "कार्यकर्ता";
          const newWorker: UserAccount & { password: string } = {
            id: "usr_" + cleanPhone,
            name: workerName,
            phone: cleanPhone,
            password: trimmedPass,
            role: "KARYAKARTA",
            candidateId: matchedPwd.candidateId,
            assignedBooths: [matchedPwd.boothNumber],
          };
          this.users = this.users.filter((u) => u.phone !== cleanPhone);
          this.users.push(newWorker);
          this.addTeamMember({
            name: workerName,
            phone: cleanPhone,
            roleTitle: "MEMBER",
            assignedBooths: [matchedPwd.boothNumber],
            candidateId: matchedPwd.candidateId,
            status: "Active",
          });
          this.recordHeartbeat(workerName, matchedPwd.boothNumber);
          return newWorker;
        }
      }

      // Legacy fallback: check candidate.workerPassword or candidate.password
      const cand = this.candidates.find(
        (c: any) => c.workerPassword === trimmedPass || c.password === trimmedPass
      );
      if (cand) {
        if (cand.status === "SUSPENDED" || (cand.status as string) === "PAUSED") {
          return undefined; // Block paused campaign
        }
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
        this.users = this.users.filter((u) => u.phone !== cleanPhone);
        this.users.push(newWorker);
        this.addTeamMember({
          name: workerName,
          phone: cleanPhone,
          roleTitle: "MEMBER",
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

  addAccessPasswords(passwords: BoothAccessPassword[]) {
    for (const p of passwords) {
      if (!this.accessPasswords.some((x) => x.password === p.password)) {
        this.accessPasswords.push(p);
      }
    }
  }

  getCandidatePasswords(candidateId: string): BoothAccessPassword[] {
    if (this.deletedCandidateIds.has(candidateId)) return [];

    const isTarget = (cid: string) =>
      cid === candidateId ||
      ((candidateId === "cand_1" || candidateId === "cmuq2l4zx0002jz04vr6hy570") &&
        (cid === "cand_1" || cid === "cmuq2l4zx0002jz04vr6hy570"));

    const fromList = this.accessPasswords.filter((p) => isTarget(p.candidateId));
    if (fromList.length > 0) {
      return fromList.map((p, idx) => ({ ...p, serialNumber: idx + 1 }));
    }
    // Check candidate passwordsJson
    const cand = this.getCandidate(candidateId);
    if (cand?.passwordsJson) {
      try {
        const parsed = JSON.parse(cand.passwordsJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p, idx) => ({ ...p, serialNumber: idx + 1 }));
        }
      } catch {}
    }
    if ((candidateId === "cand_1" || candidateId === "cmuq2l4zx0002jz04vr6hy570") && !this.deletedCandidateIds.has("cand_1")) {
      return DEFAULT_PASSWORDS;
    }
    return [];
  }

  getUser(id: string) {
    return this.users.find((u) => u.id === id);
  }

  // Candidates
  getCandidates() {
    return this.candidates.filter((c) => !this.deletedCandidateIds.has(c.id));
  }

  getCandidate(id: string) {
    if (this.deletedCandidateIds.has(id)) return undefined;
    return (
      this.candidates.find((c) => c.id === id && !this.deletedCandidateIds.has(c.id)) ||
      ((id === "cand_1" || id === "cmuq2l4zx0002jz04vr6hy570")
        ? this.candidates.find((c) => (c.id === "cand_1" || c.id === "cmuq2l4zx0002jz04vr6hy570") && !this.deletedCandidateIds.has(c.id))
        : undefined)
    );
  }

  addCandidate(cand: Omit<CandidateAccount, "id" | "createdAt" | "voterCount"> & { password?: string; id?: string }) {
    const id = cand.id || ("cand_" + Date.now());
    this.deletedCandidateIds.delete(id);
    const newCand: CandidateAccount = {
      ...cand,
      id,
      voterCount: 0,
      createdAt: new Date().toISOString().split("T")[0],
      slipMessage: cand.slipMessage || (cand.name ? `Vote for ${cand.name}` : undefined),
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

  updateCandidate(id: string, updates: Partial<CandidateAccount>): CandidateAccount | null {
    if (this.deletedCandidateIds.has(id)) return null;
    const isTarget = (cid: string) =>
      cid === id ||
      ((id === "cand_1" || id === "cmuq2l4zx0002jz04vr6hy570") &&
        (cid === "cand_1" || cid === "cmuq2l4zx0002jz04vr6hy570"));
    const cand = this.candidates.find((c) => isTarget(c.id));
    if (cand) {
      Object.assign(cand, updates);
      this.touchVersion();
      this.saveToDisk();
      return cand;
    } else if (updates.name) {
      const newC = { id, voterCount: 0, boothCount: 1, createdAt: new Date().toISOString().split("T")[0], ...updates } as CandidateAccount;
      this.candidates.unshift(newC);
      this.touchVersion();
      this.saveToDisk();
      return newC;
    }
    return null;
  }

  deleteCandidate(id: string): boolean {
    this.deletedCandidateIds.add(id);
    if (id === "cand_1") this.deletedCandidateIds.add("cmuq2l4zx0002jz04vr6hy570");
    if (id === "cmuq2l4zx0002jz04vr6hy570") this.deletedCandidateIds.add("cand_1");

    const isMatch = (targetId: string) =>
      targetId === id ||
      (id === "cand_1" && targetId === "cmuq2l4zx0002jz04vr6hy570") ||
      (id === "cmuq2l4zx0002jz04vr6hy570" && targetId === "cand_1");

    const initialLen = this.candidates.length;
    this.candidates = this.candidates.filter((c) => !isMatch(c.id));
    this.accessPasswords = this.accessPasswords.filter((p) => !isMatch(p.candidateId));
    this.voters = this.voters.filter((v) => !isMatch(v.candidateId));
    this.team = this.team.filter((t) => !isMatch(t.candidateId));
    this.users = this.users.filter((u) => !isMatch(u.candidateId || ""));
    this.touchVersion();
    this.saveToDisk();
    return this.candidates.length < initialLen;
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
    candidate: Omit<CandidateAccount, "id" | "createdAt" | "voterCount"> & {
      password?: string;
      workerPassword?: string;
      nikay?: string;
      symbolName?: string;
      passwordsJson?: string;
    };
    voters?: Omit<VoterRecord, "id">[];
    passwords?: BoothAccessPassword[];
    credentials?: Array<{
      name: string;
      phone: string;
      password: string;
      role: "SUPER_ADMIN" | "CANDIDATE_ADMIN" | "KARYAKARTA";
      boothNumber: string;
      roleTitle: string;
    }>;
  }) {
    const id = "cand_" + Date.now();
    const candidatePasswords = data.passwords || [];
    const passwordsJsonStr =
      data.candidate.passwordsJson || (candidatePasswords.length > 0 ? JSON.stringify(candidatePasswords) : undefined);

    const newCand: CandidateAccount & { workerPassword?: string; password?: string } = {
      ...data.candidate,
      id,
      nikay: data.candidate.nikay || "3000039",
      passwordsJson: passwordsJsonStr,
      voterCount: 0,
      createdAt: new Date().toISOString().split("T")[0],
      slipMessage: data.candidate.slipMessage || (data.candidate.name ? `Vote for ${data.candidate.name}` : undefined),
    };
    this.candidates.unshift(newCand);

    // Register Booth Access Passwords if provided (1 booth = 4 passwords, 2 booths = 8 passwords)
    if (candidatePasswords.length > 0) {
      const boundPasswords = candidatePasswords.map((p) => ({
        ...p,
        candidateId: id,
      }));
      this.addAccessPasswords(boundPasswords);
    }

    // Register any legacy credentials if provided
    if (data.credentials && data.credentials.length > 0) {
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
      credentialsCount: candidatePasswords.length > 0 ? candidatePasswords.length : (data.credentials?.length || 0),
      passwords: candidatePasswords,
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
    let list = this.voters.filter((v) => !isVoterDeleted(v));
    if (params.candidateId) {
      const cId = params.candidateId;
      const isTarget = (vCid?: string) =>
        vCid === cId ||
        ((cId === "cand_1" || cId === "cmuq2l4zx0002jz04vr6hy570") &&
          (vCid === "cand_1" || vCid === "cmuq2l4zx0002jz04vr6hy570"));
      list = list.filter((v) => isTarget(v.candidateId));
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
    return [...list].sort((a, b) => compareVotersBySerial(a, b));
  }

  getVoter(id: string) {
    const v = this.voters.find((v) => v.id === id);
    return v && !isVoterDeleted(v) ? v : undefined;
  }

  addVoter(voter: Omit<VoterRecord, "id"> & { id?: string }) {
    if (isVoterDeleted(voter as any)) {
      return undefined;
    }
    let serialNo = voter.serialNo;
    if (!serialNo) {
      const boothVoters = this.voters.filter((v) => v.candidateId === voter.candidateId && v.booth === voter.booth && !isVoterDeleted(v));
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

  importVoters(candidateId: string, items: Omit<VoterRecord, "id" | "candidateId">[], options?: { replaceExisting?: boolean }) {
    if (options?.replaceExisting) {
      this.voters = this.voters.filter(
        (v) => v.candidateId !== candidateId && (candidateId !== "cmuq2l4zx0002jz04vr6hy570" || v.candidateId !== "cand_1")
      );
    }
    let imported = 0;
    const added: VoterRecord[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (isVoterDeleted(item as any)) continue; // Drop deleted voter completely
      const epicVal = item.epic && item.epic.trim() && !item.epic.trim().startsWith("—")
        ? item.epic.trim().toUpperCase()
        : extractRowEpic((item as any).extraData ? { ...(item as any).extraData, ...item } : (item as any), undefined, item.booth || "1", item.serialNo || i + 1);

      // Avoid exact duplicate EPIC (only when EPIC is provided)
      const existing = epicVal
        ? this.voters.find((v) => v.candidateId === candidateId && v.epic && v.epic.trim().toUpperCase() === epicVal)
        : null;
      if (!existing && item.name) {
        const isSupp = item.isSupporter === "हाँ" || item.isSupporter === "Yes" || item.isSupporter === true;
        const v: VoterRecord = {
          ...item,
          epic: epicVal,
          serialNo: item.serialNo || (this.voters.filter((x) => x.candidateId === candidateId && x.booth === item.booth && !isVoterDeleted(x)).length + 1),
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

    const cand = this.candidates.find((c) => c.id === candidateId || (candidateId === "cmuq2l4zx0002jz04vr6hy570" && c.id === "cand_1"));
    if (cand) {
      cand.voterCount = options?.replaceExisting ? imported : (cand.voterCount || 0) + imported;
    }

    this.touchVersion();
    return { imported, total: this.voters.filter((v) => v.candidateId === candidateId && !isVoterDeleted(v)).length };
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

  clearCandidateVoters(candidateId: string) {
    this.voters = this.voters.filter(
      (v) => v.candidateId !== candidateId && (candidateId !== "cmuq2l4zx0002jz04vr6hy570" || v.candidateId !== "cand_1")
    );
    const cand = this.candidates.find((c) => c.id === candidateId || (candidateId === "cmuq2l4zx0002jz04vr6hy570" && c.id === "cand_1"));
    if (cand) cand.voterCount = 0;
    this.touchVersion();
  }

  setVotersList(candidateId: string, newVoters: VoterRecord[]) {
    const cleanVoters = newVoters.filter((v) => !isVoterDeleted(v));
    const sorted = [...cleanVoters].sort((a, b) => compareVotersBySerial(a, b));
    const otherVoters = this.voters.filter((v) => v.candidateId !== candidateId);
    this.voters = [...sorted, ...otherVoters];
    const cand = this.candidates.find((c) => c.id === candidateId);
    if (cand) cand.voterCount = cleanVoters.length;
  }

  // Team (Super Admin is strictly excluded from candidate teams)
  getTeam(candidateId: string) {
    return this.team.filter((t) => t.candidateId === candidateId && !isSuperAdminEntity(t));
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
    const candVoters = this.voters.filter((v) => v.candidateId === candidateId && !isVoterDeleted(v));
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
    // 🛡️ SUPER ADMIN PRIVACY SHIELD: NEVER record, store or broadcast Super Admin GPS coordinates
    if (isSuperAdminEntity(data)) {
      return {
        workerId: data.workerId || "usr_super_1",
        name: "Confidential",
        phone: "",
        roleTitle: "Super Admin",
        assignedBooths: [],
        candidateId: data.candidateId || "cand_1",
        lat: 0,
        lng: 0,
        accuracy: 0,
        address: "Confidential",
        lastUpdated: Date.now(),
        isOnline: false,
      };
    }

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

    // 1. Include all registered team members, strictly excluding Super Admin
    const candTeam = this.team.filter((t) => t.candidateId === cId && !isSuperAdminEntity(t));
    for (const member of candTeam) {
      const key = member.name.trim().toLowerCase();
      const loc = this.workerLocations.get(key) || this.workerLocations.get(member.id);
      if (loc && !isSuperAdminEntity(loc)) {
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

    // 2. Also include any worker from workerLocations map, strictly excluding Super Admin
    for (const [, loc] of this.workerLocations.entries()) {
      if (loc.candidateId === cId && !resultsMap.has(loc.workerId) && !isSuperAdminEntity(loc)) {
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
