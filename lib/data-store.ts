import {
  AccountStatus,
  AuditLogEntry,
  CandidateAccount,
  CandidateCredential,
  Role,
  TeamMember,
  UserAccount,
  VoterRecord,
  WorkerLocation,
} from "./types";
import { matchesVoter, singleFieldMatches } from "./transliterate";
import {
  generateSessionToken,
  generateUnique8DigitPassword,
  hashPassword,
  SESSION_MAX_AGE,
  verifyPassword,
} from "./auth-server";

export interface StoredUser extends UserAccount {
  passwordHash: string;
}

export interface SessionData {
  token: string;
  userId: string;
  role: Role;
  candidateId?: string;
  createdAt: number;
  expiresAt: number;
}

// In-Memory & Persistent global store for high-speed multi-mobile synchronization
class DataStore {
  private version: number = Date.now();
  private heartbeats: Map<string, { name: string; time: number; booth?: string }> = new Map();
  private workerLocations: Map<string, WorkerLocation> = new Map();
  private sessions: Map<string, SessionData> = new Map();
  private auditLogs: AuditLogEntry[] = [];

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
      const filePath = path.join(os.tmpdir(), "voterdesk_store_v2.json");
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.voters) && parsed.voters.length > 0) {
          this.voters = parsed.voters;
          if (parsed.version) this.version = parsed.version;
          if (Array.isArray(parsed.candidates)) this.candidates = parsed.candidates;
          if (Array.isArray(parsed.team)) this.team = parsed.team;
          if (Array.isArray(parsed.users)) this.users = parsed.users;
          if (Array.isArray(parsed.auditLogs)) this.auditLogs = parsed.auditLogs;
        }
      }
    } catch {
      // Fallback silently if file read fails
    }

    // Ensure Super Admin exists with secure bcrypt hash
    this.ensureSuperAdmin();
  }

  private saveToDisk() {
    if (typeof window !== "undefined") return;
    try {
      const fs = require("fs");
      const os = require("os");
      const path = require("path");
      const filePath = path.join(os.tmpdir(), "voterdesk_store_v2.json");
      fs.writeFileSync(
        filePath,
        JSON.stringify({
          version: this.version,
          voters: this.voters,
          candidates: this.candidates,
          users: this.users,
          team: this.team,
          auditLogs: this.auditLogs,
        })
      );
    } catch {
      // Ignore if filesystem is restricted
    }
  }

  private ensureSuperAdmin() {
    const superPhone = process.env.SUPER_ADMIN_PHONE || "9079342510";
    const superHash =
      process.env.SUPER_ADMIN_PASSWORD_HASH ||
      "$2b$10$FrtWcfyk.wtI4EMU/U2r6OzOhsjmaJFEFTAOCOZUcVS3vtvaOY3VO";

    const idx = this.users.findIndex((u) => u.phone === superPhone || u.role === "SUPER_ADMIN");
    if (idx === -1) {
      this.users.unshift({
        id: "usr_super_admin",
        name: "Super Admin",
        phone: superPhone,
        passwordHash: superHash,
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        mustChangePassword: false,
      });
    } else {
      this.users[idx].phone = superPhone;
      this.users[idx].passwordHash = superHash;
      this.users[idx].role = "SUPER_ADMIN";
      this.users[idx].status = "ACTIVE";
    }
  }

  // Purely hashed users list - no raw passwords stored anywhere
  private users: StoredUser[] = [
    {
      id: "usr_super_admin",
      name: "Super Admin",
      phone: process.env.SUPER_ADMIN_PHONE || "9079342510",
      passwordHash:
        process.env.SUPER_ADMIN_PASSWORD_HASH ||
        "$2b$10$FrtWcfyk.wtI4EMU/U2r6OzOhsjmaJFEFTAOCOZUcVS3vtvaOY3VO",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      mustChangePassword: false,
    },
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
      assignedBooths: ["1", "12", "13"],
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
      name: "मंगल चन्द",
      epic: "RJX1001001",
      guardian: "पांचू राम",
      age: "48",
      gender: "Male",
      house: "12",
      address: "वार्ड 34, स्टेशन रोड",
      booth: "1",
      serialNo: 2,
      voted: "हाँ",
      isSupporter: "हाँ",
      isOutside: "नहीं",
      boothAddress: "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
      status: "In-Favor",
      worker: "Amit Joshi",
      phone: "9829011111",
      candidateId: "cand_1",
      notes: "पक्का समर्थक"
    },
    {
      id: "v_2",
      name: "ज़रीना",
      epic: "RJX1001002",
      guardian: "मुनवर अली",
      age: "42",
      gender: "Female",
      house: "14",
      address: "वार्ड 34, गांधी नगर",
      booth: "1",
      serialNo: 3,
      voted: "नहीं",
      isSupporter: "हाँ",
      isOutside: "नहीं",
      boothAddress: "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
      status: "In-Favor",
      worker: "Amit Joshi",
      phone: "9829022222",
      candidateId: "cand_1"
    },
    {
      id: "v_3",
      name: "तनवीर कुरेशी",
      epic: "RJX1001003",
      guardian: "अब्दुल रशीद",
      age: "36",
      gender: "Male",
      house: "16",
      booth: "1",
      serialNo: 6,
      status: "Contacted",
      worker: "Amit Joshi",
      phone: "9829033333",
      candidateId: "cand_1"
    },
    {
      id: "v_4",
      name: "जुबेर खान",
      epic: "RJX1001004",
      guardian: "अनवर खान",
      age: "31",
      gender: "Male",
      house: "19",
      booth: "1",
      serialNo: 10,
      status: "Contacted",
      worker: "Amit Joshi",
      phone: "9829044444",
      candidateId: "cand_1"
    },
    {
      id: "v_5",
      name: "कमला",
      epic: "RJX1001005",
      guardian: "हरि",
      age: "55",
      gender: "Female",
      house: "22",
      booth: "1",
      serialNo: 11,
      status: "Slip-Given",
      worker: "Amit Joshi",
      candidateId: "cand_1"
    },
    {
      id: "v_6",
      name: "जमीला बानो",
      epic: "RJX1001006",
      guardian: "जब्बार खान",
      age: "49",
      gender: "Female",
      house: "25",
      booth: "1",
      serialNo: 13,
      status: "In-Favor",
      worker: "Amit Joshi",
      candidateId: "cand_1"
    },
    {
      id: "v_7",
      name: "हलीमी",
      epic: "RJX1001007",
      guardian: "सत्तार",
      age: "52",
      gender: "Female",
      house: "27",
      booth: "1",
      serialNo: 14,
      status: "Contacted",
      worker: "Amit Joshi",
      candidateId: "cand_1"
    },
    {
      id: "v_8",
      name: "साबूदीन खान",
      epic: "RJX1001008",
      guardian: "सतार",
      age: "45",
      gender: "Male",
      house: "29",
      booth: "1",
      serialNo: 15,
      status: "Pending",
      worker: "Amit Joshi",
      candidateId: "cand_1"
    },
    {
      id: "v_9",
      name: "सूरमा",
      epic: "RJX1001009",
      guardian: "साबूदीन",
      age: "41",
      gender: "Female",
      house: "29",
      booth: "1",
      serialNo: 16,
      status: "Pending",
      worker: "Amit Joshi",
      candidateId: "cand_1"
    },
    {
      id: "v_10",
      name: "समसुदीन",
      epic: "RJX1001010",
      guardian: "सत्तार",
      age: "38",
      gender: "Male",
      house: "31",
      booth: "1",
      serialNo: 17,
      status: "In-Favor",
      worker: "Amit Joshi",
      candidateId: "cand_1"
    },
    {
      id: "v_11",
      name: "सलमा",
      epic: "RJX1001011",
      guardian: "समसुदीन",
      age: "34",
      gender: "Female",
      house: "31",
      booth: "1",
      serialNo: 18,
      status: "In-Favor",
      worker: "Amit Joshi",
      candidateId: "cand_1"
    },
    {
      id: "v_12",
      name: "बन्ना",
      epic: "RJX1001012",
      guardian: "सत्तार",
      age: "36",
      gender: "Male",
      house: "34",
      booth: "1",
      serialNo: 19,
      status: "Contacted",
      worker: "Amit Joshi",
      candidateId: "cand_1"
    },
    {
      id: "v_13",
      name: "खातून बानो",
      epic: "RJX1001013",
      guardian: "गफ्फार अली",
      age: "60",
      gender: "Female",
      house: "38",
      booth: "1",
      serialNo: 20,
      status: "Slip-Given",
      worker: "Amit Joshi",
      candidateId: "cand_1"
    },
    {
      id: "v_14",
      name: "मोहम्मद अनवर अली",
      epic: "RJX1001014",
      guardian: "मुनाज अली",
      age: "43",
      gender: "Male",
      house: "41",
      booth: "1",
      serialNo: 21,
      status: "Pending",
      worker: "Amit Joshi",
      candidateId: "cand_1"
    },
    {
      id: "v_15",
      name: "रज्जाक",
      epic: "RJX1001015",
      guardian: "गफ्फार अली",
      age: "47",
      gender: "Male",
      house: "44",
      booth: "1",
      serialNo: 22,
      status: "In-Favor",
      worker: "Amit Joshi",
      candidateId: "cand_1"
    },
    {
      id: "v_16",
      name: "मेथी",
      epic: "RJX1001016",
      guardian: "घीसा",
      age: "58",
      gender: "Female",
      house: "47",
      booth: "1",
      serialNo: 23,
      status: "Contacted",
      worker: "Amit Joshi",
      candidateId: "cand_1"
    },
    {
      id: "v_17",
      name: "जब्बार",
      epic: "RJX1001017",
      guardian: "घीसा",
      age: "55",
      gender: "Male",
      house: "47",
      booth: "1",
      serialNo: 24,
      status: "In-Favor",
      worker: "Amit Joshi",
      candidateId: "cand_1"
    },
    {
      id: "v_18",
      name: "रेखा",
      epic: "RJX1001018",
      guardian: "जब्बार",
      age: "48",
      gender: "Female",
      house: "50",
      booth: "1",
      serialNo: 25,
      status: "In-Favor",
      worker: "Amit Joshi",
      candidateId: "cand_1"
    },
    {
      id: "v_19",
      name: "राकेश कुमार शर्मा",
      epic: "RJX1001019",
      guardian: "सोहन लाल शर्मा",
      age: "42",
      gender: "Male",
      house: "52",
      address: "वार्ड 34, शांति नगर",
      booth: "1",
      serialNo: 26,
      voted: "नहीं",
      isSupporter: "हाँ",
      isOutside: "नहीं",
      boothAddress: "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
      status: "Contacted",
      worker: "Amit Joshi",
      phone: "9829066666",
      candidateId: "cand_1"
    },
    {
      id: "v_20",
      name: "राकेश सैनी",
      epic: "RJX1001020",
      guardian: "रामनिवास सैनी",
      age: "36",
      gender: "Male",
      house: "55",
      address: "वार्ड 34, तिलक नगर",
      booth: "1",
      serialNo: 27,
      voted: "हाँ",
      isSupporter: "हाँ",
      isOutside: "नहीं",
      boothAddress: "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
      status: "In-Favor",
      worker: "Amit Joshi",
      phone: "9829077777",
      candidateId: "cand_1"
    },
    {
      id: "v_21",
      name: "Ramesh Kumar Sharma",
      epic: "RJX1032847",
      guardian: "Sohan Lal Sharma",
      age: "46",
      gender: "Male",
      house: "42-A",
      address: "वार्ड 34, पटेल नगर",
      booth: "12",
      serialNo: 1,
      voted: "नहीं",
      isSupporter: "हाँ",
      isOutside: "नहीं",
      boothAddress: "महात्मा गांधी राजकीय विद्यालय, भीलवाड़ा",
      status: "Contacted",
      worker: "Amit Joshi",
      phone: "9829011111",
      candidateId: "cand_1",
      notes: "Pakka supporter. Requested voter slip early."
    },
    {
      id: "v_22",
      name: "Sunita Devi",
      epic: "RJX1075231",
      guardian: "Mahesh Kumar",
      age: "39",
      gender: "Female",
      house: "18",
      address: "वार्ड 34, पटेल नगर",
      booth: "12",
      serialNo: 2,
      voted: "हाँ",
      isSupporter: "हाँ",
      isOutside: "नहीं",
      boothAddress: "महात्मा गांधी राजकीय विद्यालय, भीलवाड़ा",
      status: "In-Favor",
      worker: "Amit Joshi",
      phone: "9829022222",
      candidateId: "cand_1",
      notes: "Will vote with entire family (4 voters)."
    },
    {
      id: "v_23",
      name: "गौरव शर्मा",
      epic: "RJX1001025",
      guardian: "संतोष शर्मा",
      age: "28",
      gender: "Male",
      house: "64",
      address: "वार्ड 34, शास्त्री नगर",
      booth: "1",
      serialNo: 28,
      voted: "हाँ",
      isSupporter: "हाँ",
      isOutside: "हाँ",
      boothAddress: "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
      status: "In-Favor",
      worker: "Amit Joshi",
      phone: "9829088888",
      candidateId: "cand_1",
      notes: "युवा कार्यकर्ता, पक्का समर्थक"
    }
  ];

  // -------------------------------------------------------------
  // AUTHENTICATION, SESSIONS & PASSWORD POLICY (NO RAW PASSWORDS)
  // -------------------------------------------------------------
  public getAllPasswordHashes(): string[] {
    return this.users.map((u) => u.passwordHash).filter(Boolean);
  }

  public sanitizeUser(u: StoredUser): UserAccount {
    return {
      id: u.id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      candidateId: u.candidateId,
      assignedBooths: u.assignedBooths || [],
      status: u.status || "ACTIVE",
      mustChangePassword: !!u.mustChangePassword,
      passwordChangedAt: u.passwordChangedAt,
      passwordResetBy: u.passwordResetBy,
      passwordResetAt: u.passwordResetAt,
    };
  }

  public authenticate(phoneOrLoginId: string, password?: string): { user?: UserAccount; error?: string; status?: AccountStatus } {
    if (!phoneOrLoginId || !password) {
      return { error: "कृपया मोबाइल नंबर/लॉगिन आईडी और पासवर्ड दोनों दर्ज करें।" };
    }

    const cleanInput = phoneOrLoginId.trim().replace(/\D/g, "");
    const rawInput = phoneOrLoginId.trim().toLowerCase();

    const user = this.users.find((u) => {
      const uClean = (u.phone || "").replace(/\D/g, "");
      const uRaw = (u.phone || "").trim().toLowerCase();
      const idMatch = (u.id || "").trim().toLowerCase() === rawInput;
      return (cleanInput && uClean === cleanInput) || uRaw === rawInput || idMatch;
    });

    if (!user) {
      return { error: "अमान्य मोबाइल नंबर/लॉगिन आईडी या पासवर्ड।" };
    }

    if (user.status !== "ACTIVE") {
      return {
        error: `यह खाता वर्तमान में ${user.status === "SUSPENDED" ? "निलंबित (Suspended)" : "निष्क्रिय (Disabled)"} है। कृपया सुपर एडमिन से संपर्क करें।`,
        status: user.status,
      };
    }

    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return { error: "अमान्य मोबाइल नंबर/लॉगिन आईडी या पासवर्ड।" };
    }

    return { user: this.sanitizeUser(user) };
  }

  public getUser(id: string): UserAccount | undefined {
    const user = this.users.find((u) => u.id === id);
    return user ? this.sanitizeUser(user) : undefined;
  }

  public getUserByIdRaw(id: string): StoredUser | undefined {
    return this.users.find((u) => u.id === id);
  }

  // Session Management (HTTP-only secure token tracking)
  public createSession(userId: string): SessionData | null {
    const user = this.users.find((u) => u.id === userId);
    if (!user || user.status !== "ACTIVE") return null;

    const token = generateSessionToken();
    const session: SessionData = {
      token,
      userId: user.id,
      role: user.role,
      candidateId: user.candidateId,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
    };

    this.sessions.set(token, session);
    return session;
  }

  public getSession(token: string): { user: UserAccount; session: SessionData } | null {
    if (!token) return null;
    const session = this.sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }

    const user = this.users.find((u) => u.id === session.userId);
    if (!user || user.status !== "ACTIVE") {
      this.sessions.delete(token);
      return null;
    }

    return { user: this.sanitizeUser(user), session };
  }

  public revokeUserSessions(userId: string): void {
    for (const [token, s] of this.sessions.entries()) {
      if (s.userId === userId) {
        this.sessions.delete(token);
      }
    }
  }

  public deleteSession(token: string): void {
    this.sessions.delete(token);
  }

  // Account Status Modification
  public updateUserStatus(
    userId: string,
    status: AccountStatus,
    performedBy: string,
    performedByName: string
  ): UserAccount {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error("उपयोगकर्ता खाता नहीं मिला।");

    const oldStatus = user.status;
    user.status = status;

    // Also update candidate account status if candidate admin
    if (user.candidateId) {
      const cand = this.candidates.find((c) => c.id === user.candidateId);
      if (cand) {
        cand.status = status;
      }
    }

    // Suspending or disabling immediately revokes all active sessions
    if (status !== "ACTIVE") {
      this.revokeUserSessions(userId);
    }

    this.logActivity({
      action: "UPDATE_STATUS",
      targetUserId: user.id,
      targetUserName: user.name,
      targetUserRole: user.role,
      performedBy,
      performedByName,
      details: `स्थिति बदली गई: ${oldStatus} -> ${status}`,
    });

    this.touchVersion();
    return this.sanitizeUser(user);
  }

  // First-Login / Mandatory Password Change
  public changeUserPassword(userId: string, oldPassword: string, newPassword: string): UserAccount {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error("उपयोगकर्ता खाता नहीं मिला।");

    if (!verifyPassword(oldPassword, user.passwordHash)) {
      throw new Error("वर्तमान / अस्थायी पासवर्ड सही नहीं है।");
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error("नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।");
    }

    user.passwordHash = hashPassword(newPassword);
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date().toISOString();

    this.logActivity({
      action: "CHANGE_PASSWORD",
      targetUserId: user.id,
      targetUserName: user.name,
      targetUserRole: user.role,
      performedBy: user.id,
      performedByName: user.name,
      details: "पासवर्ड सफलतापूर्वक बदला गया।",
    });

    this.touchVersion();
    return this.sanitizeUser(user);
  }

  // Super Admin: Reset Password (generates new unique 8-digit password)
  public resetUserPassword(
    userId: string,
    performedBy: string,
    performedByName: string
  ): { tempPassword: string; user: UserAccount } {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error("उपयोगकर्ता खाता नहीं मिला।");

    const tempPassword = generateUnique8DigitPassword(this.getAllPasswordHashes());
    user.passwordHash = hashPassword(tempPassword);
    user.mustChangePassword = true;
    user.passwordResetBy = performedBy;
    user.passwordResetAt = new Date().toISOString();

    // Revoke all existing sessions
    this.revokeUserSessions(userId);

    this.logActivity({
      action: "RESET_PASSWORD",
      targetUserId: user.id,
      targetUserName: user.name,
      targetUserRole: user.role,
      performedBy,
      performedByName,
      details: `सुपर एडमिन द्वारा पासवर्ड रीसेट किया गया। नया अस्थायी 8-अंकीय पासवर्ड जारी।`,
    });

    this.touchVersion();
    return { tempPassword, user: this.sanitizeUser(user) };
  }

  // Super Admin: Update Candidate Campaign Status (also updates all users for this candidate)
  public updateCandidateStatus(
    candidateId: string,
    status: AccountStatus,
    performedBy: string,
    performedByName: string
  ): CandidateAccount {
    const cand = this.candidates.find((c) => c.id === candidateId);
    if (!cand) throw new Error("प्रत्याशी खाता नहीं मिला।");

    cand.status = status;

    // Update all user accounts tied to this candidate
    const candUsers = this.users.filter((u) => u.candidateId === candidateId);
    for (const u of candUsers) {
      u.status = status;
      if (status !== "ACTIVE") {
        this.revokeUserSessions(u.id);
      }
    }

    this.logActivity({
      action: "UPDATE_STATUS",
      targetUserId: cand.id,
      targetUserName: cand.name,
      targetUserRole: "CANDIDATE_ADMIN",
      performedBy,
      performedByName,
      details: `प्रत्याशी अभियान स्थिति अपडेट: ${status} (सभी संबद्ध उपयोगकर्ताओं के सत्र रीसेट किए गए)`,
    });

    this.touchVersion();
    return cand;
  }

  // Super Admin: Reset Candidate Admin Password directly
  public resetCandidatePassword(
    candidateId: string,
    performedBy: string,
    performedByName: string
  ): { tempPassword: string; user: UserAccount } {
    const cand = this.candidates.find((c) => c.id === candidateId);
    if (!cand) throw new Error("प्रत्याशी खाता नहीं मिला।");

    let candUser = this.users.find(
      (u) => u.candidateId === candidateId && u.role === "CANDIDATE_ADMIN"
    );

    const tempPassword = generateUnique8DigitPassword(this.getAllPasswordHashes());

    if (!candUser) {
      candUser = {
        id: "usr_" + cand.id,
        name: cand.name,
        phone: cand.phone,
        passwordHash: hashPassword(tempPassword),
        role: "CANDIDATE_ADMIN",
        candidateId: cand.id,
        status: cand.status || "ACTIVE",
        mustChangePassword: true,
        passwordResetBy: performedBy,
        passwordResetAt: new Date().toISOString(),
      };
      this.users.push(candUser);
    } else {
      candUser.passwordHash = hashPassword(tempPassword);
      candUser.mustChangePassword = true;
      candUser.passwordResetBy = performedBy;
      candUser.passwordResetAt = new Date().toISOString();
      this.revokeUserSessions(candUser.id);
    }

    this.logActivity({
      action: "RESET_PASSWORD",
      targetUserId: candUser.id,
      targetUserName: candUser.name,
      targetUserRole: "CANDIDATE_ADMIN",
      performedBy,
      performedByName,
      details: `प्रत्याशी एडमिन पासवर्ड रीसेट किया गया (${cand.name})। नया 8-अंकीय अस्थायी पासवर्ड जारी।`,
    });

    this.touchVersion();
    return { tempPassword, user: this.sanitizeUser(candUser) };
  }

  // Audit Logs
  public logActivity(entry: Omit<AuditLogEntry, "id" | "timestamp">) {
    this.auditLogs.unshift({
      ...entry,
      id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
    });
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500);
    }
  }

  public getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  // Candidates
  public getCandidates(): CandidateAccount[] {
    return this.candidates;
  }

  public getCandidate(id: string): CandidateAccount | undefined {
    return this.candidates.find((c) => c.id === id);
  }

  // Super Admin: Create Candidate Admin Account with unique 8-digit password
  public createCandidateWithAdmin(
    data: {
      name: string;
      phone: string;
      party?: string;
      electionName?: string;
      wardConstituency?: string;
      boothCount?: number;
      status?: AccountStatus;
      posterUrl?: string;
    },
    performedBy: string,
    performedByName: string
  ): { candidate: CandidateAccount; tempPassword: string; user: UserAccount } {
    const cleanPhone = data.phone.trim().replace(/\D/g, "");
    if (!cleanPhone) throw new Error("मान्य मोबाइल नंबर आवश्यक है।");

    // Check if phone already registered
    const existing = this.users.find((u) => u.phone.replace(/\D/g, "") === cleanPhone);
    if (existing) {
      throw new Error(`मोबाइल नंबर ${data.phone} पहले से पंजीकृत है (${existing.name} - ${existing.role})।`);
    }

    const candId = "cand_" + Date.now();
    const tempPassword = generateUnique8DigitPassword(this.getAllPasswordHashes());
    const initialStatus = data.status || "ACTIVE";

    const newCand: CandidateAccount = {
      id: candId,
      name: data.name.trim(),
      phone: data.phone.trim(),
      party: data.party?.trim() || "Independent (निर्दलीय)",
      electionName: data.electionName?.trim() || "Municipal Election 2026",
      wardConstituency: data.wardConstituency?.trim() || "Ward 01",
      boothCount: Number(data.boothCount) || 1,
      status: initialStatus,
      voterCount: 0,
      createdAt: new Date().toISOString().split("T")[0],
      posterUrl: data.posterUrl,
    };
    this.candidates.unshift(newCand);

    const newUser: StoredUser = {
      id: "usr_" + candId,
      name: data.name.trim(),
      phone: data.phone.trim(),
      passwordHash: hashPassword(tempPassword),
      role: "CANDIDATE_ADMIN",
      candidateId: candId,
      status: initialStatus,
      mustChangePassword: true,
    };
    this.users.push(newUser);

    this.logActivity({
      action: "CREATE_USER",
      targetUserId: newUser.id,
      targetUserName: newUser.name,
      targetUserRole: "CANDIDATE_ADMIN",
      performedBy,
      performedByName,
      details: `प्रत्याशी एडमिन खाता बनाया गया: ${newCand.name} (${newCand.wardConstituency})`,
    });

    this.touchVersion();
    return {
      candidate: newCand,
      tempPassword,
      user: this.sanitizeUser(newUser),
    };
  }

  // Super Admin: Create Karyakarta Account with unique 8-digit password
  public createKaryakartaWithUser(
    data: {
      name: string;
      phone: string;
      candidateId: string;
      roleTitle: string;
      assignedBooths: string[];
      status?: AccountStatus;
    },
    performedBy: string,
    performedByName: string
  ): { teamMember: TeamMember; tempPassword: string; user: UserAccount } {
    const cleanPhone = data.phone.trim().replace(/\D/g, "");
    if (!cleanPhone) throw new Error("मान्य मोबाइल नंबर आवश्यक है।");

    const existing = this.users.find((u) => u.phone.replace(/\D/g, "") === cleanPhone);
    if (existing) {
      throw new Error(`मोबाइल नंबर ${data.phone} पहले से पंजीकृत है (${existing.name} - ${existing.role})।`);
    }

    const tempPassword = generateUnique8DigitPassword(this.getAllPasswordHashes());
    const initialStatus = data.status || "ACTIVE";
    const userId = "usr_work_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);

    const newUser: StoredUser = {
      id: userId,
      name: data.name.trim(),
      phone: data.phone.trim(),
      passwordHash: hashPassword(tempPassword),
      role: "KARYAKARTA",
      candidateId: data.candidateId,
      assignedBooths: data.assignedBooths && data.assignedBooths.length > 0 ? data.assignedBooths : ["1"],
      status: initialStatus,
      mustChangePassword: true,
    };
    this.users.push(newUser);

    const newTeamMember: TeamMember = {
      id: "team_" + userId,
      name: data.name.trim(),
      phone: data.phone.trim(),
      roleTitle: data.roleTitle || "Field Worker",
      assignedBooths: newUser.assignedBooths || ["1"],
      status: initialStatus === "ACTIVE" ? "Active" : "Inactive",
      candidateId: data.candidateId,
      contactedCount: 0,
    };
    this.team.push(newTeamMember);

    this.logActivity({
      action: "CREATE_USER",
      targetUserId: newUser.id,
      targetUserName: newUser.name,
      targetUserRole: "KARYAKARTA",
      performedBy,
      performedByName,
      details: `कार्यकर्ता खाता बनाया गया: ${newTeamMember.name} (बूथ: ${newTeamMember.assignedBooths.join(", ")})`,
    });

    this.touchVersion();
    return {
      teamMember: newTeamMember,
      tempPassword,
      user: this.sanitizeUser(newUser),
    };
  }

  // Get credentials list for candidate - WITHOUT RAW PASSWORDS
  public getCandidateUsers(candidateId: string): CandidateCredential[] {
    const matching = this.users.filter((u) => u.candidateId === candidateId);
    return matching.map((u) => {
      const booth = u.assignedBooths && u.assignedBooths.length > 0 ? u.assignedBooths[0] : "1";
      const isCand = u.role === "CANDIDATE_ADMIN";
      return {
        id: u.id,
        name: u.name,
        phone: u.phone,
        role: u.role,
        candidateId: u.candidateId || candidateId,
        assignedBooths: u.assignedBooths || [booth],
        boothNumber: booth,
        roleTitle: isCand ? "प्रत्याशी / कैंडिडेट" : "बूथ कार्यकर्ता",
        status: u.status || "ACTIVE",
        mustChangePassword: !!u.mustChangePassword,
      };
    });
  }

  // Super Admin: Create Candidate & Karyakartas with secure 8-digit passwords
  public createCandidateBatchWithPasswords(data: {
    candidate: Omit<CandidateAccount, "id" | "createdAt" | "voterCount"> & { password?: string };
    voters?: Omit<VoterRecord, "id">[];
    credentials?: Array<{
      name: string;
      phone: string;
      role: "SUPER_ADMIN" | "CANDIDATE_ADMIN" | "KARYAKARTA";
      boothNumber: string;
      roleTitle: string;
    }>;
  }) {
    const id = "cand_" + Date.now();
    const initialStatus = data.candidate.status || "ACTIVE";
    const newCand: CandidateAccount = {
      ...data.candidate,
      id,
      status: initialStatus,
      voterCount: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    this.candidates.unshift(newCand);

    const generatedCreds: CandidateCredential[] = [];

    // 1. Primary Candidate Admin Account
    const candPhoneClean = (data.candidate.phone || "").replace(/\D/g, "");
    const candTempPassword = generateUnique8DigitPassword(this.getAllPasswordHashes());
    const candUserId = "usr_" + id;

    // Only add if phone not already registered
    const existingCandUser = this.users.find((u) => u.phone.replace(/\D/g, "") === candPhoneClean);
    if (!existingCandUser) {
      const candUser: StoredUser = {
        id: candUserId,
        name: data.candidate.name,
        phone: data.candidate.phone,
        passwordHash: hashPassword(candTempPassword),
        role: "CANDIDATE_ADMIN",
        candidateId: id,
        status: initialStatus,
        mustChangePassword: true,
      };
      this.users.push(candUser);
      generatedCreds.push({
        id: candUserId,
        name: data.candidate.name,
        phone: data.candidate.phone,
        role: "CANDIDATE_ADMIN",
        candidateId: id,
        assignedBooths: ["1"],
        boothNumber: "1",
        roleTitle: "प्रत्याशी / Candidate Admin",
        status: initialStatus,
        mustChangePassword: true,
        temporaryPassword: candTempPassword,
      });
    }

    // 2. Karyakarta Accounts (if provided)
    if (Array.isArray(data.credentials)) {
      for (const cred of data.credentials) {
        if (cred.role === "CANDIDATE_ADMIN") continue; // Already created above

        const kPhoneClean = (cred.phone || "").replace(/\D/g, "");
        if (this.users.some((u) => u.phone.replace(/\D/g, "") === kPhoneClean)) {
          continue; // Skip duplicate phone
        }

        const kTempPassword = generateUnique8DigitPassword(this.getAllPasswordHashes());
        const kUserId = "usr_" + id + "_" + cred.boothNumber + "_" + Math.random().toString(36).substring(2, 7);

        const newUser: StoredUser = {
          id: kUserId,
          name: cred.name,
          phone: cred.phone,
          passwordHash: hashPassword(kTempPassword),
          role: "KARYAKARTA",
          candidateId: id,
          assignedBooths: [cred.boothNumber],
          status: initialStatus,
          mustChangePassword: true,
        };
        this.users.push(newUser);

        this.team.push({
          id: "team_" + kUserId,
          name: cred.name,
          phone: cred.phone,
          roleTitle: cred.roleTitle || `बूथ ${cred.boothNumber} कार्यकर्ता`,
          assignedBooths: [cred.boothNumber],
          status: initialStatus === "ACTIVE" ? "Active" : "Inactive",
          candidateId: id,
          contactedCount: 0,
        });

        generatedCreds.push({
          id: kUserId,
          name: cred.name,
          phone: cred.phone,
          role: "KARYAKARTA",
          candidateId: id,
          assignedBooths: [cred.boothNumber],
          boothNumber: cred.boothNumber,
          roleTitle: cred.roleTitle || `बूथ ${cred.boothNumber} कार्यकर्ता`,
          status: initialStatus,
          mustChangePassword: true,
          temporaryPassword: kTempPassword,
        });
      }
    }

    // Import voters if provided
    let imported = 0;
    if (data.voters && data.voters.length > 0) {
      const result = this.importVoters(id, data.voters);
      imported = result.imported;
    }

    this.logActivity({
      action: "CREATE_USER",
      performedBy: "usr_super_admin",
      performedByName: "Super Admin",
      details: `प्रत्याशी एवं टीम बनाई गई: ${newCand.name} (${generatedCreds.length} क्रेडेंशियल)`,
    });

    this.touchVersion();
    return {
      candidate: newCand,
      importedVoters: imported,
      credentialsCount: generatedCreds.length,
      credentials: generatedCreds,
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

  addVoter(voter: Omit<VoterRecord, "id">) {
    let serialNo = voter.serialNo;
    if (!serialNo) {
      const boothVoters = this.voters.filter((v) => v.candidateId === voter.candidateId && v.booth === voter.booth);
      serialNo = boothVoters.length + 1;
    }
    const newVoter: VoterRecord = {
      ...voter,
      serialNo,
      id: "v_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
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

    // Also register karyakarta user with secure 8-digit temporary password
    const tempPassword = generateUnique8DigitPassword(this.getAllPasswordHashes());
    this.users.push({
      id: "usr_" + id,
      name: member.name,
      phone: member.phone,
      passwordHash: hashPassword(tempPassword),
      role: "KARYAKARTA",
      candidateId: member.candidateId,
      assignedBooths: member.assignedBooths,
      status: "ACTIVE",
      mustChangePassword: true,
    });

    this.touchVersion();
    return { member: newMember, tempPassword };
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
