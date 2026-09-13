"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  Filter,
  Home,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  Vote,
  X,
  Download,
  AlertCircle,
  Phone,
  Share2,
  Trash2,
  Printer,
  Building2,
  Layers,
  Check,
  UserCheck,
  Globe
} from "lucide-react";
import { store } from "@/lib/data-store";
import { VoterRecord, CandidateAccount, TeamMember, UserAccount } from "@/lib/types";
import { parseExcelFile, detectFieldMapping, downloadSampleExcelTemplate, ParsedSheetData } from "@/lib/excel-helper";
import { translations, Lang } from "@/lib/translations";
import { matchesVoter } from "@/lib/transliterate";

export default function Page() {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [page, setPage] = useState<string>("boothmanager");
  const [menu, setMenu] = useState(false);
  const [lang, setLang] = useState<Lang>("hi");
  const t = translations[lang];
  const toggleLang = () => setLang((prev) => (prev === "hi" ? "en" : "hi"));

  // Active candidate context (default cand_1)
  const [activeCandidateId, setActiveCandidateId] = useState<string>("cand_1");
  const [candidates, setCandidates] = useState<CandidateAccount[]>([]);
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);

  // Refresh data from store
  const refreshData = () => {
    setCandidates([...store.getCandidates()]);
    setVoters([...store.getVoters({ candidateId: activeCandidateId })]);
    setTeam([...store.getTeam(activeCandidateId)]);
  };

  useEffect(() => {
    refreshData();
  }, [activeCandidateId]);

  // When user logs in, set candidate id and navigate DIRECTLY to voter roll!
  const handleLogin = (authenticatedUser: UserAccount) => {
    setUser(authenticatedUser);
    if (authenticatedUser.candidateId) {
      setActiveCandidateId(authenticatedUser.candidateId);
    }
    if (authenticatedUser.role === "SUPER_ADMIN") {
      setPage("superadmin");
    } else {
      // Both Candidate Admin and Karyakarta land directly on Booth Manager voter roll!
      setPage("boothmanager");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setPage("boothmanager");
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  if (!user) {
    return <Login onLogin={handleLogin} lang={lang} toggleLang={toggleLang} t={t} />;
  }

  // Super Admin Direct View
  if (user.role === "SUPER_ADMIN" && page === "superadmin") {
    return (
      <SuperAdminView
        user={user}
        candidates={candidates}
        onSelectCandidate={(candId) => {
          setActiveCandidateId(candId);
          setPage("boothmanager");
        }}
        onCandidateCreated={refreshData}
        onLogout={handleLogout}
        lang={lang}
        toggleLang={toggleLang}
        t={t}
      />
    );
  }

  // Direct Booth Manager Voter Roll View (Default upon login for Candidate Admin & Karyakarta!)
  if (page === "boothmanager" || user.role === "KARYAKARTA") {
    return (
      <BoothManagerView
        user={user}
        candidateId={activeCandidateId}
        candidate={candidates.find((c) => c.id === activeCandidateId) || candidates[0]}
        voters={voters}
        onVoterUpdated={refreshData}
        onLogout={handleLogout}
        onOpenAdminPanel={
          user.role === "SUPER_ADMIN" || user.role === "CANDIDATE_ADMIN"
            ? () => setPage("dashboard")
            : undefined
        }
        lang={lang}
        toggleLang={toggleLang}
        t={t}
      />
    );
  }

  // Candidate Admin Main View
  const currentCandidate = candidates.find((c) => c.id === activeCandidateId) || candidates[0];

  const candidateNav = [
    ["boothmanager", t.boothManager, Vote],
    ["dashboard", t.navDashboard, Home],
    ["voters", t.navVoters, Users],
    ["import", t.navImport, FileSpreadsheet],
    ["team", t.navTeam, UserRound],
    ["reports", t.navReports, BarChart3],
  ] as const;

  return (
    <div className="shell">
      <aside className={menu ? "side open" : "side"}>
        <div className="brand">
          <Logo />
          <div>
            <b>VoterDesk</b>
            <span>{t.candidateWorkspace}</span>
          </div>
          <button className="close" onClick={() => setMenu(false)}>
            <X />
          </button>
        </div>

        <p className="label">{t.campaignWorkspace}</p>
        <nav>
          {candidateNav.map(([id, text, Icon]) => (
            <button
              key={id}
              onClick={() => {
                setPage(id);
                setMenu(false);
              }}
              className={page === id ? "active" : ""}
            >
              <Icon />
              <span>{text}</span>
            </button>
          ))}
        </nav>

        <p className="label second">{t.switchViews}</p>
        <nav>
          {user.role === "SUPER_ADMIN" && (
            <button onClick={() => setPage("superadmin")}>
              <ShieldCheck />
              <span>{t.superAdminPortal}</span>
            </button>
          )}
          <button onClick={() => setPage("field")}>
            <UserCheck />
            <span>{t.karyakartaFieldView}</span>
          </button>
        </nav>

        <div className="profile">
          <i>{user.name.slice(0, 2).toUpperCase()}</i>
          <div>
            <b>{user.name}</b>
            <span>{user.role === "SUPER_ADMIN" ? "Super Admin" : "Candidate Admin"}</span>
          </div>
          <button onClick={handleLogout} title="Sign out">
            <LogOut />
          </button>
        </div>
      </aside>

      {menu && <button className="shade" onClick={() => setMenu(false)} />}

      <main className="main">
        <header className="appHeader">
          <div className="headerLeft">
            <button className="hamb" onClick={() => setMenu(true)} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <div className="campaignMeta">
              <span className="campaignSub">
                {currentCandidate ? `${currentCandidate.wardConstituency} • ${currentCandidate.electionName}` : t.activeElection}
              </span>
              <h2 className="campaignTitle">
                {currentCandidate ? currentCandidate.name : t.candidateWorkspace}
              </h2>
            </div>
          </div>

          <div className="tools">
            <span className={`roleBadge ${user.role === "SUPER_ADMIN" ? "super" : "cand"}`}>
              {user.role === "SUPER_ADMIN" ? "Super Admin" : "Candidate"}
            </span>
            <button
              className="lang"
              onClick={toggleLang}
              title="Switch Language"
              style={{
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontWeight: 700
              }}
            >
              <Globe size={14} />
              <span>{t.langToggle}</span>
            </button>
            <button className="bell" title="Notifications">
              <Bell size={18} />
              <i />
            </button>
            <span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span>
          </div>
        </header>

        <section className="content">
          {page === "dashboard" && <CandidateDashboard go={setPage} candidate={currentCandidate} voters={voters} t={t} />}
          {page === "voters" && <VotersTable candidateId={activeCandidateId} voters={voters} onUpdate={refreshData} t={t} />}
          {page === "import" && <RealExcelImporter candidateId={activeCandidateId} onImportSuccess={() => { refreshData(); setPage("voters"); }} t={t} />}
          {page === "team" && <TeamManagement candidateId={activeCandidateId} team={team} onUpdate={refreshData} t={t} />}
          {page === "reports" && <ReportsView voters={voters} t={t} />}
        </section>
      </main>
    </div>
  );
}

// -------------------------------------------------------------
// 1. LOGIN COMPONENT (WITH 3-ROLE QUICK TABS)
// -------------------------------------------------------------
function Login({
  onLogin,
  lang,
  toggleLang,
  t,
}: {
  onLogin: (u: UserAccount) => void;
  lang: Lang;
  toggleLang: () => void;
  t: (typeof translations)["hi"];
}) {
  const [roleTab, setRoleTab] = useState<"CANDIDATE_ADMIN" | "SUPER_ADMIN" | "KARYAKARTA">("CANDIDATE_ADMIN");
  const [phone, setPhone] = useState("94141 14497");
  const [password, setPassword] = useState("voterdesk");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectRole = (role: "CANDIDATE_ADMIN" | "SUPER_ADMIN" | "KARYAKARTA") => {
    setRoleTab(role);
    setError("");
    if (role === "SUPER_ADMIN") {
      setPhone("99999 99999");
      setPassword("superadmin");
    } else if (role === "CANDIDATE_ADMIN") {
      setPhone("94141 14497");
      setPassword("voterdesk");
    } else {
      setPhone("98290 12345");
      setPassword("karyakarta");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Try API route first
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLogin(data.user);
        return;
      }

      // Fallback to client-side store
      const localUser = store.authenticate(phone, password);
      if (localUser) {
        onLogin({
          id: localUser.id,
          name: localUser.name,
          phone: localUser.phone,
          role: localUser.role,
          candidateId: localUser.candidateId,
          assignedBooths: localUser.assignedBooths,
        });
        return;
      }

      setError(data.error || "Invalid mobile number or password. Check demo credentials.");
    } catch {
      // Fallback if fetch fails
      const localUser = store.authenticate(phone, password);
      if (localUser) {
        onLogin({
          id: localUser.id,
          name: localUser.name,
          phone: localUser.phone,
          role: localUser.role,
          candidateId: localUser.candidateId,
          assignedBooths: localUser.assignedBooths,
        });
      } else {
        setError("Login failed. Please check credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login">
      <section className="loginBox">
        <div className="loginBrand">
          <Logo />
          <div>
            <b>{t.loginBrandTitle}</b>
            <span>{t.loginBrandSub}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleLang}
          style={{
            alignSelf: "flex-end",
            marginBottom: "12px",
            border: "1px solid rgba(148, 163, 184, 0.6)",
            borderRadius: "999px",
            background: "#f8fafc",
            color: "#0f172a",
            padding: "7px 12px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Globe size={14} />
          <span>{t.langToggle}</span>
        </button>

        <div className="loginCopy">
          <em>{t.loginRoleLabel}</em>
          <h1>{t.loginTitle}</h1>
          <p>{t.loginSubtitle}</p>
        </div>

        {/* 3-Role Switcher Tabs */}
        <div className="roleTabs">
          <button
            type="button"
            className={`roleTab ${roleTab === "CANDIDATE_ADMIN" ? "active" : ""}`}
            onClick={() => selectRole("CANDIDATE_ADMIN")}
          >
            {t.loginRoleCandidate}
          </button>
          <button
            type="button"
            className={`roleTab ${roleTab === "SUPER_ADMIN" ? "active" : ""}`}
            onClick={() => selectRole("SUPER_ADMIN")}
          >
            {t.loginRoleSuper}
          </button>
          <button
            type="button"
            className={`roleTab ${roleTab === "KARYAKARTA" ? "active" : ""}`}
            onClick={() => selectRole("KARYAKARTA")}
          >
            {t.loginRoleKaryakarta}
          </button>
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "14px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn}>
          <label>{t.loginPhoneLabel}</label>
          <div className="phone">
            <span>+91</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" required />
          </div>

          <div className="passLabel">
            <label>{t.loginPasswordLabel}</label>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>{t.loginPasswordHint}</span>
          </div>
          <input
            className="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="primary wide" disabled={loading}>
            {loading ? t.loginSigningIn : `${t.loginPrimaryLabel} ${roleTab === "SUPER_ADMIN" ? t.loginRoleSuper : roleTab === "CANDIDATE_ADMIN" ? t.loginRoleCandidate : t.loginRoleKaryakarta}`}
          </button>
        </form>

        <p className="demo">
          <ShieldCheck /> {t.loginDemoTip}
        </p>
      </section>

      <section className="loginArt">
        <div className="grid" />
        <article>
          <Vote />
          <h2>{t.loginArtTitle}</h2>
          <div className="artStat">
            <span>{t.loginArtMeta}</span>
            <b>73,860</b>
          </div>
          <div className="progress">
            <i style={{ width: "68%" }} />
          </div>
          <small>{t.loginArtProgress}</small>
        </article>
      </section>
    </main>
  );
}

// -------------------------------------------------------------
// 2. SUPER ADMIN PORTAL (MANAGE ALL CANDIDATES & PLATFORM)
// -------------------------------------------------------------
function SuperAdminView({
  user,
  candidates,
  onSelectCandidate,
  onCandidateCreated,
  onLogout,
  lang,
  toggleLang,
  t,
}: {
  user: UserAccount;
  candidates: CandidateAccount[];
  onSelectCandidate: (id: string) => void;
  onCandidateCreated: () => void;
  onLogout: () => void;
  lang: Lang;
  toggleLang: () => void;
  t: (typeof translations)["hi"];
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCand, setNewCand] = useState({
    name: "",
    phone: "",
    party: "Independent (निर्दलीय)",
    electionName: "Municipal Election 2026",
    wardConstituency: "Ward 01",
    boothCount: "10",
    password: "voterdesk",
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCand.name || !newCand.phone) return;

    store.addCandidate({
      name: newCand.name,
      phone: newCand.phone,
      party: newCand.party,
      electionName: newCand.electionName,
      wardConstituency: newCand.wardConstituency,
      boothCount: Number(newCand.boothCount) || 10,
      status: "ACTIVE",
      password: newCand.password,
    });

    setShowAddModal(false);
    setNewCand({
      name: "",
      phone: "",
      party: "Independent (निर्दलीय)",
      electionName: "Municipal Election 2026",
      wardConstituency: "Ward 01",
      boothCount: "10",
      password: "voterdesk",
    });
    onCandidateCreated();
  };

  const totalVotersAcross = candidates.reduce((acc, c) => acc + (c.voterCount || 0), 0);
  const totalBoothsAcross = candidates.reduce((acc, c) => acc + (c.boothCount || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{ height: "64px", background: "#0b224e", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Logo />
          <div>
            <b style={{ fontSize: "17px" }}>VoterDesk Super Admin</b>
            <span style={{ display: "block", fontSize: "11px", color: "#a9c0e6" }}>System Owner Platform Console</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="roleBadge super desktopOnly">Master Administrator</span>
          <button
            style={{
              background: "rgba(255, 255, 255, 0.16)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}
            onClick={toggleLang}
          >
            <Globe size={13} />
            <span>{t.langToggle}</span>
          </button>
          <button
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "12px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}
            onClick={onLogout}
          >
            <LogOut size={15} /> <span className="desktopOnly">Logout</span>
          </button>
        </div>
      </header>

      <div style={{ maxWidth: "1350px", margin: "30px auto", padding: "0 24px" }}>
        <Title
          tag="SUPER ADMIN CONSOLE"
          title="Platform Overview & Candidates"
          sub="Create candidates, inspect election workspaces and manage candidate subscriptions."
        >
          <button className="primary" onClick={() => setShowAddModal(true)}>
            <Plus /> Register New Candidate
          </button>
        </Title>

        {/* Top Platform Stats */}
        <div className="stats three">
          <article>
            <i className="blue"><Building2 /></i>
            <span>Registered Candidates</span>
            <b>{candidates.length}</b>
            <small>Active election campaigns</small>
          </article>
          <article>
            <i className="green"><Users /></i>
            <span>Total Voters Indexed</span>
            <b>{totalVotersAcross.toLocaleString()}</b>
            <small>Across all constituencies</small>
          </article>
          <article>
            <i className="orange"><Layers /></i>
            <span>Total Polling Booths</span>
            <b>{totalBoothsAcross}</b>
            <small>Under active monitoring</small>
          </article>
        </div>

        {/* Candidate Campaigns Table */}
        <Panel title="Active Candidate Campaigns" sub="Click on 'Open Workspace' to inspect or manage any candidate's campaign directly.">
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Candidate Name</th>
                  <th>Contact Phone</th>
                  <th>Party / Affiliation</th>
                  <th>Election & Ward</th>
                  <th>Booths</th>
                  <th>Voters Managed</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((cand) => (
                  <tr key={cand.id}>
                    <td>
                      <b>{cand.name}</b>
                      <small>ID: {cand.id}</small>
                    </td>
                    <td>{cand.phone}</td>
                    <td>{cand.party}</td>
                    <td>
                      <b>{cand.electionName}</b>
                      <small>{cand.wardConstituency}</small>
                    </td>
                    <td>{cand.boothCount} Booths</td>
                    <td>
                      <b>{(cand.voterCount || 0).toLocaleString()}</b>
                    </td>
                    <td>
                      <span className="status in-favor">{cand.status}</span>
                    </td>
                    <td>
                      <button
                        className="primary"
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                        onClick={() => onSelectCandidate(cand.id)}
                      >
                        Open Workspace ›
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Add Candidate Modal */}
      {showAddModal && (
        <div className="modalOverlay" onClick={() => setShowAddModal(false)}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <h3>Register New Candidate Campaign</h3>
              <button onClick={() => setShowAddModal(false)}><X /></button>
            </div>
            <form onSubmit={handleCreate} className="modalBody">
              <div className="formGroup">
                <label>Candidate Full Name</label>
                <input
                  required
                  placeholder="e.g. Ramesh Chandra Sharma"
                  value={newCand.name}
                  onChange={(e) => setNewCand({ ...newCand, name: e.target.value })}
                />
              </div>

              <div className="inputGrid">
                <div className="formGroup">
                  <label>Mobile Number</label>
                  <input
                    required
                    placeholder="e.g. 9829012345"
                    value={newCand.phone}
                    onChange={(e) => setNewCand({ ...newCand, phone: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>Initial Password</label>
                  <input
                    required
                    type="password"
                    value={newCand.password}
                    onChange={(e) => setNewCand({ ...newCand, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="inputGrid">
                <div className="formGroup">
                  <label>Party / Affiliation</label>
                  <input
                    placeholder="e.g. Independent / निर्दलीय"
                    value={newCand.party}
                    onChange={(e) => setNewCand({ ...newCand, party: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>Total Booths in Ward</label>
                  <input
                    type="number"
                    placeholder="12"
                    value={newCand.boothCount}
                    onChange={(e) => setNewCand({ ...newCand, boothCount: e.target.value })}
                  />
                </div>
              </div>

              <div className="inputGrid">
                <div className="formGroup">
                  <label>Election Name</label>
                  <input
                    placeholder="Municipal Election 2026"
                    value={newCand.electionName}
                    onChange={(e) => setNewCand({ ...newCand, electionName: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>Ward / Constituency</label>
                  <input
                    placeholder="Ward 34"
                    value={newCand.wardConstituency}
                    onChange={(e) => setNewCand({ ...newCand, wardConstituency: e.target.value })}
                  />
                </div>
              </div>

              <div className="formFoot" style={{ marginTop: "24px" }}>
                <button type="button" className="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Create Candidate Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 3. BOOTH MANAGER DIRECT VIEW (MATCHING USER SCREENSHOT)
// -------------------------------------------------------------
function BoothManagerView({
  user,
  candidateId,
  candidate,
  voters,
  onVoterUpdated,
  onLogout,
  onOpenAdminPanel,
  lang,
  toggleLang,
  t,
}: {
  user: UserAccount;
  candidateId: string;
  candidate?: CandidateAccount;
  voters: VoterRecord[];
  onVoterUpdated: () => void;
  onLogout: () => void;
  onOpenAdminPanel?: () => void;
  lang: Lang;
  toggleLang: () => void;
  t: (typeof translations)["hi"];
}) {
  const [search, setSearch] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [partFilter, setPartFilter] = useState("ALL");
  const [selectedVoter, setSelectedVoter] = useState<VoterRecord | null>(null);

  // Modals state
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [updateTab, setUpdateTab] = useState<"add" | "upload">("add");

  // Slip send phone state
  const [recipientPhone, setRecipientPhone] = useState("");

  // New Voter Form state
  const [voterForm, setVoterForm] = useState({
    name: "",
    guardian: "",
    booth: "1",
    serialNo: "",
    epic: "",
    age: "35",
    gender: "Male",
    house: "",
    phone: "",
    status: "Pending" as VoterRecord["status"],
  });

  // Excel Upload state in modal
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Booths / Parts list
  const allParts = useMemo(() => {
    const set = new Set<string>();
    voters.forEach((v) => set.add(v.booth));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [voters]);

  // Filtered voters list
  const filteredVoters = useMemo(() => {
    return voters.filter((v) => {
      if (user.role === "KARYAKARTA" && user.assignedBooths && user.assignedBooths.length > 0) {
        if (!user.assignedBooths.includes(v.booth)) return false;
      }
      if (partFilter !== "ALL" && v.booth !== partFilter) return false;

      if (search.trim()) {
        return matchesVoter(v, search);
      }
      return true;
    });
  }, [voters, user, partFilter, search]);

  const activeVoterForSlip = selectedVoter || filteredVoters[0] || voters[0];

  useEffect(() => {
    if (activeVoterForSlip && activeVoterForSlip.phone) {
      setRecipientPhone(activeVoterForSlip.phone);
    } else {
      setRecipientPhone("");
    }
  }, [activeVoterForSlip]);

  const handleStatusChange = (voterId: string, newStatus: VoterRecord["status"]) => {
    store.updateVoter(voterId, { status: newStatus, worker: user.name });
    if (selectedVoter && selectedVoter.id === voterId) {
      setSelectedVoter((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    onVoterUpdated();
  };

  const handleSaveVoter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterForm.name.trim()) {
      alert("कृपया मतदाता का नाम दर्ज करें");
      return;
    }
    const epicVal = voterForm.epic.trim().toUpperCase() || "RJX" + Math.floor(1000000 + Math.random() * 9000000);
    const added = store.addVoter({
      name: voterForm.name.trim(),
      guardian: voterForm.guardian.trim(),
      booth: voterForm.booth.trim() || "1",
      serialNo: voterForm.serialNo ? Number(voterForm.serialNo) : undefined,
      epic: epicVal,
      age: voterForm.age || "35",
      gender: voterForm.gender || "Male",
      house: voterForm.house.trim(),
      phone: voterForm.phone.trim(),
      status: voterForm.status,
      worker: user.name,
      candidateId: candidateId || "cand_1",
    });

    onVoterUpdated();
    setShowUpdateModal(false);
    setSelectedVoter(added);
    setVoterForm({
      name: "",
      guardian: "",
      booth: "1",
      serialNo: "",
      epic: "",
      age: "35",
      gender: "Male",
      house: "",
      phone: "",
      status: "Pending",
    });
  };

  const handleModalExcelUpload = async (file: File) => {
    setUploading(true);
    setUploadMsg("");
    try {
      const parsed = await parseExcelFile(file);
      const mapping = detectFieldMapping(parsed.columns);
      const toImport = parsed.rows.map((row) => ({
        name: String(row[mapping.name] || "").trim(),
        epic: String(row[mapping.epic] || "").trim().toUpperCase(),
        guardian: String(row[mapping.guardian] || "").trim(),
        age: String(row[mapping.age] || ""),
        gender: String(row[mapping.gender] || "Male"),
        house: String(row[mapping.house] || ""),
        booth: String(row[mapping.booth] || "1"),
        serialNo: mapping.serialNo ? row[mapping.serialNo] : undefined,
        phone: String(row[mapping.phone] || ""),
        status: "Pending" as VoterRecord["status"],
        worker: "Unassigned",
      })).filter((v) => v.name && v.epic);

      if (toImport.length === 0) {
        throw new Error("फ़ाइल में कोई वैध मतदाता रिकॉर्ड नहीं मिले।");
      }

      const res = store.importVoters(candidateId || "cand_1", toImport);
      setUploadMsg(`सफलतापूर्वक ${res.imported} मतदाता रिकॉर्ड्स अपलोड किए गए!`);
      onVoterUpdated();
      setTimeout(() => {
        setShowUpdateModal(false);
        setUploadMsg("");
      }, 1500);
    } catch (err: unknown) {
      setUploadMsg(err instanceof Error ? err.message : "फ़ाइल अपलोड विफल रही।");
    } finally {
      setUploading(false);
    }
  };

  const generateWhatsAppSlipText = (v: VoterRecord) => {
    const candName = candidate ? candidate.name : "अभय कुमार";
    const candParty = candidate ? candidate.party : "निर्दलीय";
    return `🇮🇳 *मतदाता पर्ची (OFFICIAL VOTER SLIP)* 🇮🇳%0A` +
      `*उम्मीदवार:* ${candName} (${candParty})%0A` +
      `----------------------------------------%0A` +
      `👤 *मतदाता:* ${v.name}%0A` +
      `👨‍👧 *पिता/पति:* ${v.guardian || "—"}%0A` +
      `🔢 *भाग सं. (Part No):* ${v.booth} | *क्र सं. (Sr No):* ${v.serialNo || "—"}%0A` +
      `🆔 *पहचान पत्र (EPIC):* ${v.epic}%0A` +
      `🏠 *मकान नं.:* ${v.house || "—"}%0A` +
      `📍 *मतदान केंद्र:* ${t.pollingStationName}%0A` +
      `----------------------------------------%0A` +
      `🗳️ कृपया अपना अमूल्य मत देकर भारी मतों से विजयी बनाएं! 🙏`;
  };

  const handleSendWhatsApp = (v: VoterRecord) => {
    const cleanNumber = recipientPhone.replace(/\D/g, "");
    const text = generateWhatsAppSlipText(v);
    const url = cleanNumber
      ? `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, "_blank");
  };

  return (
    <div className="bmShell">
      {/* 1. Header (Matching Screenshot) */}
      <header className="bmHeader noPrint">
        <div className="bmHeaderLeft">
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={22} color="#ffffff" />
          </div>
          <div>
            <b className="bmHeaderTitle">{t.bmTitle}</b>
            <span className="bmHeaderSub">{t.bmSub}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Working Language Switcher Button */}
          <button
            type="button"
            onClick={toggleLang}
            style={{
              background: "rgba(255, 255, 255, 0.18)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.4)",
              borderRadius: "8px",
              padding: "5px 9px",
              fontSize: "12px",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
            }}
            title="Switch Language / भाषा बदलें"
          >
            <Globe size={13} />
            <span>{t.langToggle}</span>
          </button>

          {/* Admin Panel Button (for Candidate Admin / Super Admin) */}
          {onOpenAdminPanel && (
            <button
              type="button"
              onClick={onOpenAdminPanel}
              style={{
                background: "rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.4)",
                borderRadius: "8px",
                padding: "5px 9px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
              title={t.adminPanel}
            >
              <span>{t.adminPanel}</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Top Action Navigation Bar (Exact 6 colored buttons from screenshot) */}
      <div className="bmActionsBar noPrint">
        <button
          type="button"
          className="bmActionBtn bmBtnSlip"
          onClick={() => {
            setSelectedVoter(selectedVoter || filteredVoters[0] || voters[0]);
            setShowSlipModal(true);
          }}
        >
          <span>{lang === "hi" ? "स्लिप" : "Slip"}</span>
          <span>{lang === "hi" ? "मैसेज" : "Message"}</span>
        </button>

        <button
          type="button"
          className="bmActionBtn bmBtnUpdate"
          onClick={() => setShowUpdateModal(true)}
        >
          <span>{lang === "hi" ? "डेटा" : "Data"}</span>
          <span>{lang === "hi" ? "अपडेट" : "Update"}</span>
        </button>

        <button
          type="button"
          className="bmActionBtn bmBtnSearch"
          onClick={() => setShowSearchBar((prev) => !prev)}
        >
          <span>{t.btnSearch}</span>
        </button>

        <button
          type="button"
          className="bmActionBtn bmBtnLocation"
          onClick={() => setShowLocationModal(true)}
        >
          <span>{t.btnLocation}</span>
        </button>

        <button
          type="button"
          className="bmActionBtn bmBtnPrint"
          onClick={() => setShowPrintModal(true)}
        >
          <span>{t.btnPrint}</span>
        </button>

        <button
          type="button"
          className="bmActionBtn bmBtnLogout"
          onClick={onLogout}
        >
          <span>{lang === "hi" ? "लॉग" : "Log"}</span>
          <span>{lang === "hi" ? "आउट" : "Out"}</span>
        </button>
      </div>

      {/* 3. Search & Filter Bar (Toggled when Search clicked) */}
      {showSearchBar && (
        <div
          className="noPrint"
          style={{
            background: "#f1f5f9",
            padding: "10px 12px",
            borderBottom: "1px solid #cbd5e1",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, position: "relative" }}>
            <Search
              size={15}
              style={{ position: "absolute", left: "10px", top: "11px", color: "#64748b" }}
            />
            <input
              type="text"
              placeholder={lang === "hi" ? "अंग्रेजी या हिंदी में नाम खोजें (जैसे: Rakesh, Mangal, पांचू)..." : "Search in English or Hindi (e.g. Rakesh, Mangal, Panchu)..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: "36px",
                paddingLeft: "32px",
                paddingRight: "28px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                background: "#ffffff",
                outline: "none",
              }}
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "9px",
                  border: 0,
                  background: "transparent",
                  color: "#94a3b8",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {allParts.length > 1 && (
            <select
              value={partFilter}
              onChange={(e) => setPartFilter(e.target.value)}
              style={{
                height: "36px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                padding: "0 8px",
                background: "#ffffff",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              <option value="ALL">{lang === "hi" ? "सभी भाग" : "All Parts"}</option>
              {allParts.map((p) => (
                <option key={p} value={p}>
                  {lang === "hi" ? `भाग ${p}` : `Part ${p}`}
                </option>
              ))}
            </select>
          )}

          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#475467",
              background: "#e2e8f0",
              padding: "4px 8px",
              borderRadius: "6px",
              whiteSpace: "nowrap",
            }}
          >
            {filteredVoters.length} {lang === "hi" ? "मतदाता" : "voters"}
          </span>
        </div>
      )}

      {/* 4. Tabular Voter Roll (Exact Layout from Screenshot) */}
      <div className="bmTableContainer printableArea">
        <table className="bmTable">
          <thead>
            <tr>
              <th style={{ width: "36px" }}>{t.colIndex}</th>
              <th style={{ width: "52px" }}>{t.colPart}</th>
              <th style={{ width: "52px" }}>{t.colSerial}</th>
              <th className="thLeft" style={{ minWidth: "120px" }}>{t.colName}</th>
              <th className="thLeft" style={{ minWidth: "130px" }}>{t.colGuardian}</th>
            </tr>
          </thead>
          <tbody>
            {filteredVoters.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                  {t.noVotersMatch}
                </td>
              </tr>
            ) : (
              filteredVoters.map((v, idx) => {
                const isSelected = selectedVoter?.id === v.id;
                return (
                  <tr
                    key={v.id}
                    className={isSelected ? "selectedRow" : ""}
                    onClick={() => setSelectedVoter(isSelected ? null : v)}
                  >
                    <td className="colIndex">{idx + 1}</td>
                    <td className="colPart">{v.booth}</td>
                    <td className="colSerial">{v.serialNo !== undefined ? v.serialNo : idx + 1}</td>
                    <td className="colName">{v.name}</td>
                    <td className="colGuardian">{v.guardian || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. Selected Voter Quick Action Drawer / Bottom Sheet */}
      {selectedVoter && (
        <div
          className="noPrint"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#ffffff",
            borderTop: "2px solid #026aa7",
            boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.15)",
            padding: "12px 16px",
            zIndex: 50,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <b style={{ fontSize: "16px", color: "#0f172a" }}>{selectedVoter.name}</b>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    background: "#e0f2fe",
                    color: "#0369a1",
                    padding: "2px 7px",
                    borderRadius: "6px",
                  }}
                >
                  {lang === "hi" ? `भाग: ${selectedVoter.booth} • क्र: ${selectedVoter.serialNo || "—"}` : `Part: ${selectedVoter.booth} • Sr: ${selectedVoter.serialNo || "—"}`}
                </span>
                <span className={`status ${selectedVoter.status.toLowerCase()}`}>
                  {selectedVoter.status}
                </span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#475467" }}>
                {t.fatherHusband}: <b>{selectedVoter.guardian || "—"}</b> • {t.houseNo}: <b>{selectedVoter.house || "—"}</b> • EPIC: <b>{selectedVoter.epic}</b>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedVoter(null)}
              style={{
                border: 0,
                background: "#f1f5f9",
                borderRadius: "50%",
                width: "28px",
                height: "28px",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "#64748b",
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Quick Status Buttons */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "8px 0" }}>
            <button
              type="button"
              style={{
                background: selectedVoter.status === "In-Favor" ? "#15803d" : "#dcfce7",
                color: selectedVoter.status === "In-Favor" ? "#ffffff" : "#15803d",
                border: "1px solid #86efac",
                borderRadius: "6px",
                padding: "5px 9px",
                fontSize: "11px",
                fontWeight: 700,
              }}
              onClick={() => handleStatusChange(selectedVoter.id, "In-Favor")}
            >
              ✓ {t.btnInFavor}
            </button>

            <button
              type="button"
              style={{
                background: selectedVoter.status === "Contacted" ? "#0369a1" : "#e0f2fe",
                color: selectedVoter.status === "Contacted" ? "#ffffff" : "#0369a1",
                border: "1px solid #7dd3fc",
                borderRadius: "6px",
                padding: "5px 9px",
                fontSize: "11px",
                fontWeight: 700,
              }}
              onClick={() => handleStatusChange(selectedVoter.id, "Contacted")}
            >
              📞 {t.btnContacted}
            </button>

            <button
              type="button"
              style={{
                background: selectedVoter.status === "Slip-Given" ? "#4338ca" : "#e0e7ff",
                color: selectedVoter.status === "Slip-Given" ? "#ffffff" : "#4338ca",
                border: "1px solid #c7d2fe",
                borderRadius: "6px",
                padding: "5px 9px",
                fontSize: "11px",
                fontWeight: 700,
              }}
              onClick={() => handleStatusChange(selectedVoter.id, "Slip-Given")}
            >
              🎫 {t.btnSlipGiven}
            </button>

            <button
              type="button"
              style={{
                background: selectedVoter.status === "Doubtful" ? "#b45309" : "#fef3c7",
                color: selectedVoter.status === "Doubtful" ? "#ffffff" : "#b45309",
                border: "1px solid #fde68a",
                borderRadius: "6px",
                padding: "5px 9px",
                fontSize: "11px",
                fontWeight: 700,
              }}
              onClick={() => handleStatusChange(selectedVoter.id, "Doubtful")}
            >
              ❓ {t.stDoubtful}
            </button>
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              type="button"
              style={{
                flex: 1,
                background: "#25d366",
                color: "#ffffff",
                border: 0,
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                cursor: "pointer",
              }}
              onClick={() => {
                setShowSlipModal(true);
              }}
            >
              <Share2 size={14} />
              <span>{t.sendSlipOnWhatsApp}</span>
            </button>

            <button
              type="button"
              style={{
                background: "#f1f5f9",
                color: "#1e293b",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => {
                setVoterForm({
                  name: selectedVoter.name,
                  guardian: selectedVoter.guardian || "",
                  booth: selectedVoter.booth,
                  serialNo: selectedVoter.serialNo ? String(selectedVoter.serialNo) : "",
                  epic: selectedVoter.epic,
                  age: selectedVoter.age,
                  gender: selectedVoter.gender,
                  house: selectedVoter.house,
                  phone: selectedVoter.phone || "",
                  status: selectedVoter.status,
                });
                setShowUpdateModal(true);
              }}
            >
              ✏️ {lang === "hi" ? "एडिट" : "Edit"}
            </button>
          </div>
        </div>
      )}

      {/* 6. Modal: Slip Message (स्लिप मैसेज / WhatsApp Slip) */}
      {showSlipModal && activeVoterForSlip && (
        <div className="modalOverlay noPrint">
          <div className="modalBox">
            <div className="modalHead">
              <h3>{t.officialVoterSlip}</h3>
              <button onClick={() => setShowSlipModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modalBody">
              {/* Official Slip Preview Card */}
              <div
                style={{
                  border: "2px solid #026aa7",
                  borderRadius: "12px",
                  padding: "16px",
                  background: "#f8fafc",
                  marginBottom: "16px",
                }}
              >
                <div style={{ textAlign: "center", borderBottom: "1px solid #cbd5e1", paddingBottom: "10px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "#026aa7", letterSpacing: "1px" }}>
                    OFFICIAL VOTER SLIP / मतदाता पर्ची
                  </span>
                  <h4 style={{ margin: "4px 0 2px", fontSize: "16px", color: "#0f172a" }}>
                    {candidate?.name || "अभय कुमार"}
                  </h4>
                  <small style={{ color: "#64748b", fontSize: "11px" }}>
                    {candidate?.party || "निर्दलीय"} • {candidate?.electionName || "Bhilwara Municipal 2026"}
                  </small>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12.5px" }}>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>{t.colName}</span>
                    <b style={{ color: "#0f172a" }}>{activeVoterForSlip.name}</b>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>{t.colGuardian}</span>
                    <b>{activeVoterForSlip.guardian || "—"}</b>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>{t.colPart}</span>
                    <b style={{ color: "#026aa7" }}>{activeVoterForSlip.booth}</b>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>{t.colSerial}</span>
                    <b style={{ color: "#026aa7" }}>{activeVoterForSlip.serialNo || "—"}</b>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>{t.epicNumber}</span>
                    <b>{activeVoterForSlip.epic}</b>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>{t.houseNo}</span>
                    <b>{activeVoterForSlip.house || "—"}</b>
                  </div>
                </div>

                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #cbd5e1", fontSize: "12px", color: "#475467" }}>
                  📍 <b>{t.pollingStation}:</b> {t.pollingStationName}
                </div>
              </div>

              {/* Recipient Phone Input */}
              <div className="formGroup">
                <label>{t.updateMobile}</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="tel"
                    placeholder="98290XXXXX"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    style={{ flex: 1, padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                  <button
                    type="button"
                    style={{
                      background: "#25d366",
                      color: "#fff",
                      border: 0,
                      borderRadius: "8px",
                      padding: "0 16px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleSendWhatsApp(activeVoterForSlip)}
                  >
                    <Share2 size={16} /> WhatsApp
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
                <button
                  type="button"
                  className="outline"
                  onClick={() => setShowSlipModal(false)}
                >
                  ✕ {lang === "hi" ? "बंद करें" : "Close"}
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => window.print()}
                >
                  <Printer size={16} /> {t.printSlip}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Data Update (डेटा अपडेट - Add Voter / Excel Upload) */}
      {showUpdateModal && (
        <div className="modalOverlay noPrint">
          <div className="modalBox" style={{ maxWidth: "560px" }}>
            <div className="modalHead">
              <h3>{t.btnDataUpdate}</h3>
              <button onClick={() => setShowUpdateModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #cbd5e1", background: "#f8fafc" }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "12px",
                  border: 0,
                  borderBottom: updateTab === "add" ? "3px solid #026aa7" : "3px solid transparent",
                  background: updateTab === "add" ? "#ffffff" : "transparent",
                  fontWeight: updateTab === "add" ? 700 : 500,
                  color: updateTab === "add" ? "#026aa7" : "#64748b",
                  cursor: "pointer",
                }}
                onClick={() => setUpdateTab("add")}
              >
                + {t.quickAddVoter}
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: "12px",
                  border: 0,
                  borderBottom: updateTab === "upload" ? "3px solid #026aa7" : "3px solid transparent",
                  background: updateTab === "upload" ? "#ffffff" : "transparent",
                  fontWeight: updateTab === "upload" ? 700 : 500,
                  color: updateTab === "upload" ? "#026aa7" : "#64748b",
                  cursor: "pointer",
                }}
                onClick={() => setUpdateTab("upload")}
              >
                📁 {t.quickUploadExcel}
              </button>
            </div>

            <div className="modalBody">
              {updateTab === "add" ? (
                <form onSubmit={handleSaveVoter}>
                  <div className="inputGrid">
                    <div className="formGroup">
                      <label>{t.colName} *</label>
                      <input
                        required
                        value={voterForm.name}
                        onChange={(e) => setVoterForm({ ...voterForm, name: e.target.value })}
                        placeholder="जैसे: मंगल चन्द"
                      />
                    </div>
                    <div className="formGroup">
                      <label>{t.colGuardian}</label>
                      <input
                        value={voterForm.guardian}
                        onChange={(e) => setVoterForm({ ...voterForm, guardian: e.target.value })}
                        placeholder="जैसे: पांचू राम"
                      />
                    </div>
                  </div>

                  <div className="inputGrid">
                    <div className="formGroup">
                      <label>{t.colPart} *</label>
                      <input
                        required
                        value={voterForm.booth}
                        onChange={(e) => setVoterForm({ ...voterForm, booth: e.target.value })}
                        placeholder="1"
                      />
                    </div>
                    <div className="formGroup">
                      <label>{t.colSerial}</label>
                      <input
                        type="number"
                        value={voterForm.serialNo}
                        onChange={(e) => setVoterForm({ ...voterForm, serialNo: e.target.value })}
                        placeholder="जैसे: 2"
                      />
                    </div>
                  </div>

                  <div className="inputGrid">
                    <div className="formGroup">
                      <label>{t.epicNumber}</label>
                      <input
                        value={voterForm.epic}
                        onChange={(e) => setVoterForm({ ...voterForm, epic: e.target.value })}
                        placeholder="RJX1001001"
                      />
                    </div>
                    <div className="formGroup">
                      <label>{t.houseNo}</label>
                      <input
                        value={voterForm.house}
                        onChange={(e) => setVoterForm({ ...voterForm, house: e.target.value })}
                        placeholder="12"
                      />
                    </div>
                  </div>

                  <div className="inputGrid">
                    <div className="formGroup">
                      <label>{t.updateMobile}</label>
                      <input
                        type="tel"
                        value={voterForm.phone}
                        onChange={(e) => setVoterForm({ ...voterForm, phone: e.target.value })}
                        placeholder="98290XXXXX"
                      />
                    </div>
                    <div className="formGroup">
                      <label>{t.status}</label>
                      <select
                        value={voterForm.status}
                        onChange={(e) => setVoterForm({ ...voterForm, status: e.target.value as VoterRecord["status"] })}
                      >
                        <option value="Pending">{t.stPending}</option>
                        <option value="Contacted">{t.stContacted}</option>
                        <option value="In-Favor">{t.stInFavor}</option>
                        <option value="Slip-Given">{t.stSlipGiven}</option>
                        <option value="Doubtful">{t.stDoubtful}</option>
                      </select>
                    </div>
                  </div>

                  <div className="formFoot">
                    <button type="button" className="outline" onClick={() => setShowUpdateModal(false)}>
                      ✕ {lang === "hi" ? "रद्द करें" : "Cancel"}
                    </button>
                    <button type="submit" className="primary">
                      ✓ {lang === "hi" ? "डेटा सुरक्षित करें" : "Save Voter"}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div
                    style={{
                      border: "2px dashed #026aa7",
                      borderRadius: "12px",
                      padding: "30px 16px",
                      textAlign: "center",
                      background: "#f0f9ff",
                      cursor: "pointer",
                      marginBottom: "16px",
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      accept=".xlsx, .xls, .csv"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleModalExcelUpload(f);
                      }}
                    />
                    <FileSpreadsheet size={40} color="#026aa7" style={{ margin: "0 auto 10px" }} />
                    <h4 style={{ margin: "0 0 6px", fontSize: "15px", color: "#0f172a" }}>
                      {uploading ? t.readingFile : t.chooseFileBtn}
                    </h4>
                    <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                      {t.dragDropText}
                    </p>
                    <small style={{ display: "block", color: "#94a3b8", fontSize: "10px", marginTop: "8px" }}>
                      {t.fileSupported}
                    </small>
                  </div>

                  {uploadMsg && (
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        background: uploadMsg.includes("सफलता") ? "#dcfce7" : "#fee2e2",
                        color: uploadMsg.includes("सफलता") ? "#15803d" : "#b91c1c",
                        fontSize: "12px",
                        fontWeight: 700,
                        textAlign: "center",
                        marginBottom: "12px",
                      }}
                    >
                      {uploadMsg}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button type="button" className="outline" onClick={downloadSampleExcelTemplate}>
                      <Download size={14} /> {t.downloadTemplate}
                    </button>
                    <button type="button" className="outline" onClick={() => setShowUpdateModal(false)}>
                      ✕ {lang === "hi" ? "बंद करें" : "Close"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal: Location (लोकेशन - Polling Station Details) */}
      {showLocationModal && (
        <div className="modalOverlay noPrint">
          <div className="modalBox">
            <div className="modalHead">
              <h3>📍 {t.pollingStation}</h3>
              <button onClick={() => setShowLocationModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modalBody">
              <div
                style={{
                  background: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "16px",
                }}
              >
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#0284c7", textTransform: "uppercase" }}>
                  POLLING STATION / मतदान केंद्र
                </span>
                <h4 style={{ margin: "6px 0 4px", fontSize: "16px", color: "#0f172a" }}>
                  {t.pollingStationName}
                </h4>
                <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#475467" }}>
                  {t.pollingStationAddress}
                </p>
                <div style={{ fontSize: "12px", color: "#0369a1", fontWeight: 600 }}>
                  🕒 {t.pollingTime}
                </div>
              </div>

              <div style={{ marginBottom: "16px", fontSize: "13px", color: "#334155" }}>
                <p style={{ margin: "0 0 6px" }}>
                  👤 <b>बूथ प्रभारी (Supervisor):</b> Amit Joshi (+91 98290 12345)
                </p>
                <p style={{ margin: "0 0 6px" }}>
                  🗳️ <b>भाग / बूथ संख्या:</b> {partFilter === "ALL" ? "1 (वार्ड 34)" : `भाग सं. ${partFilter}`}
                </p>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    window.open("https://maps.google.com/?q=Govt+Senior+Secondary+School+Bhilwara", "_blank");
                  }}
                >
                  🗺️ {t.openInMaps}
                </button>
                <button
                  type="button"
                  className="outline"
                  onClick={() => setShowLocationModal(false)}
                >
                  ✕ {lang === "hi" ? "बंद करें" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal: Print (प्रिंट) */}
      {showPrintModal && (
        <div className="modalOverlay noPrint">
          <div className="modalBox">
            <div className="modalHead">
              <h3>🖨️ {t.btnPrint}</h3>
              <button onClick={() => setShowPrintModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modalBody">
              <div style={{ display: "grid", gap: "12px", marginBottom: "20px" }}>
                <button
                  type="button"
                  style={{
                    padding: "16px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    background: "#ffffff",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                  onClick={() => {
                    setShowPrintModal(false);
                    setTimeout(() => window.print(), 200);
                  }}
                >
                  <FileSpreadsheet size={24} color="#026aa7" />
                  <div>
                    <b style={{ fontSize: "14px", display: "block", color: "#0f172a" }}>
                      {t.printVoterRoll}
                    </b>
                    <small style={{ color: "#64748b", fontSize: "11px" }}>
                      वर्तमान में दिख रहे {filteredVoters.length} मतदाताओं की पूरी नामावली तालिका प्रिंट करें
                    </small>
                  </div>
                </button>

                <button
                  type="button"
                  style={{
                    padding: "16px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    background: "#ffffff",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                  onClick={() => {
                    setShowPrintModal(false);
                    setShowSlipModal(true);
                  }}
                >
                  <Printer size={24} color="#ea580c" />
                  <div>
                    <b style={{ fontSize: "14px", display: "block", color: "#0f172a" }}>
                      {t.printVoterSlip}
                    </b>
                    <small style={{ color: "#64748b", fontSize: "11px" }}>
                      {selectedVoter ? `मतदाता ${selectedVoter.name} की पर्ची प्रिंट करें` : "मतदाता पर्ची का प्रारूप प्रिंट करें"}
                    </small>
                  </div>
                </button>
              </div>

              <div style={{ textAlign: "right" }}>
                <button type="button" className="outline" onClick={() => setShowPrintModal(false)}>
                  ✕ {lang === "hi" ? "बंद करें" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 4. CANDIDATE ADMIN DASHBOARD
// -------------------------------------------------------------
function CandidateDashboard({ go, candidate, voters, t }: { go: (p: string) => void; candidate: CandidateAccount; voters: VoterRecord[]; t: (typeof translations)["hi"] }) {
  const total = voters.length;
  const contacted = voters.filter((v) => v.status === "Contacted" || v.status === "In-Favor" || v.status === "Slip-Given").length;
  const inFavor = voters.filter((v) => v.status === "In-Favor").length;
  const pending = voters.filter((v) => v.status === "Pending").length;

  const contactedPct = total > 0 ? Math.round((contacted / total) * 100) : 0;

  // Booth progress
  const boothCounts: Record<string, { total: number; contacted: number }> = {};
  for (const v of voters) {
    if (!boothCounts[v.booth]) boothCounts[v.booth] = { total: 0, contacted: 0 };
    boothCounts[v.booth].total++;
    if (v.status !== "Pending") boothCounts[v.booth].contacted++;
  }

  return (
    <>
      <Title
        tag={`${candidate.electionName.toUpperCase()} — ${candidate.wardConstituency}`}
        title={`${t.welcomeBack}, ${candidate.name}`}
        sub={t.dashboardSub}
      >
        <button className="primary" onClick={() => go("import")}>
          <Upload size={16} />
          <span className="desktopOnly">{t.importVotersFull}</span>
          <span className="mobileOnly">{t.importVoters}</span>
        </button>
      </Title>

      <div className="stats">
        <article>
          <i className="blue"><Users /></i>
          <span>{t.totalVoters}</span>
          <b>{total.toLocaleString()}</b>
          <small>{t.managedInWard}</small>
        </article>
        <article>
          <i className="green"><CheckCircle2 /></i>
          <span>{t.contacted}</span>
          <b>{contacted.toLocaleString()}</b>
          <small>{contactedPct}% {t.completed}</small>
        </article>
        <article>
          <i className="orange"><UserCheck /></i>
          <span>{t.pakkaVote}</span>
          <b>{inFavor.toLocaleString()}</b>
          <small>{t.highConfidence}</small>
        </article>
        <article>
          <i className="red"><Users /></i>
          <span>{t.pending}</span>
          <b>{pending.toLocaleString()}</b>
          <small>{total > 0 ? Math.round((pending / total) * 100) : 0}% {t.remaining}</small>
        </article>
      </div>

      <div className="two">
        <Panel title={t.boothCompletion} sub={t.boothSub}>
          {Object.entries(boothCounts).slice(0, 5).map(([bNo, data]) => {
            const pct = data.total > 0 ? Math.round((data.contacted / data.total) * 100) : 0;
            return (
              <div className="rowProgress" key={bNo}>
                <div>
                  <b>Booth {bNo}</b>
                  <small>{data.contacted} / {data.total} voters</small>
                </div>
                <div className="progress">
                  <i style={{ width: `${pct}%` }} />
                </div>
                <b>{pct}%</b>
              </div>
            );
          })}
        </Panel>

        <Panel title={t.quickActions} sub="Operations for candidate and managers">
          <div className="actions">
            <button onClick={() => go("import")}>
              <i className="blue"><FileSpreadsheet /></i>
              <span>
                <b>{t.uploadNewList}</b>
                <small>{t.uploadSub}</small>
              </span>
              ›
            </button>
            <button onClick={() => go("voters")}>
              <i className="orange"><Users /></i>
              <span>
                <b>{t.reviewPending} ({pending})</b>
                <small>{t.reviewSub}</small>
              </span>
              ›
            </button>
            <button onClick={() => go("team")}>
              <i className="green"><UserRound /></i>
              <span>
                <b>{t.manageTeam}</b>
                <small>{t.manageSub}</small>
              </span>
              ›
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}

// -------------------------------------------------------------
// 5. VOTERS TABLE WITH SEARCH, BOOTH FILTER & REAL CSV EXPORT
// -------------------------------------------------------------
function VotersTable({
  candidateId,
  voters,
  onUpdate,
  t,
}: {
  candidateId: string;
  voters: VoterRecord[];
  onUpdate: () => void;
  t: (typeof translations)["hi"];
}) {
  const [q, setQ] = useState("");
  const [boothFilter, setBoothFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  const [newVoter, setNewVoter] = useState({
    name: "",
    epic: "",
    guardian: "",
    age: "35",
    gender: "Male",
    house: "",
    booth: "12",
    phone: "",
    status: "Pending" as VoterRecord["status"],
  });

  const booths = useMemo(() => {
    const set = new Set<string>();
    voters.forEach((v) => set.add(v.booth));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [voters]);

  const filtered = useMemo(() => {
    return voters.filter((v) => {
      if (boothFilter !== "ALL" && v.booth !== boothFilter) return false;
      if (statusFilter !== "ALL" && v.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (q.trim()) {
        return matchesVoter(v, q);
      }
      return true;
    });
  }, [voters, boothFilter, statusFilter, q]);

  const handleAddVoter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoter.name || !newVoter.epic) return;

    store.addVoter({
      ...newVoter,
      worker: "Unassigned",
      candidateId,
    });

    setShowAddModal(false);
    setNewVoter({
      name: "",
      epic: "",
      guardian: "",
      age: "35",
      gender: "Male",
      house: "",
      booth: "12",
      phone: "",
      status: "Pending",
    });
    onUpdate();
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["EPIC", "Name", "Guardian", "Age", "Gender", "House", "Booth", "Status", "Phone", "Worker"];
    const rows = filtered.map((v) => [
      v.epic,
      `"${v.name}"`,
      `"${v.guardian}"`,
      v.age,
      v.gender,
      `"${v.house}"`,
      v.booth,
      v.status,
      v.phone || "",
      `"${v.worker}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `VoterDesk_Voters_${candidateId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Title
        tag="VOTER DATABASE"
        title="Voter Registry"
        sub={`Total ${filtered.length} voters match your filters.`}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="outline" onClick={handleExportCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button className="primary" onClick={() => setShowAddModal(true)}>
            <Plus /> Add Single Voter
          </button>
        </div>
      </Title>

      <Panel>
        <div className="tableTools">
          <div>
            <Search />
            <input
              placeholder="Search name, EPIC, guardian, house or phone..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            style={{ border: "1px solid #d8dde5", borderRadius: "9px", padding: "0 12px", height: "42px", background: "white", fontSize: "13px" }}
            value={boothFilter}
            onChange={(e) => setBoothFilter(e.target.value)}
          >
            <option value="ALL">All Booths</option>
            {booths.map((b) => (
              <option key={b} value={b}>Booth {b}</option>
            ))}
          </select>

          <select
            style={{ border: "1px solid #d8dde5", borderRadius: "9px", padding: "0 12px", height: "42px", background: "white", fontSize: "13px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Contacted">Contacted</option>
            <option value="In-Favor">In-Favor</option>
            <option value="Slip-Given">Slip Given</option>
            <option value="Doubtful">Doubtful</option>
            <option value="Opposed">Opposed</option>
          </select>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Voter Details</th>
                <th>EPIC Number</th>
                <th>Age / Gender</th>
                <th>House No</th>
                <th>Booth</th>
                <th>Status</th>
                <th>Assigned Worker</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id}>
                  <td>
                    <b>{v.name}</b>
                    <small>S/O, W/O: {v.guardian || "—"}</small>
                  </td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--blue)" }}>{v.epic}</span>
                  </td>
                  <td>{v.age} / {v.gender}</td>
                  <td>{v.house}</td>
                  <td>
                    <b>Booth {v.booth}</b>
                  </td>
                  <td>
                    <select
                      className={`status ${v.status.toLowerCase()}`}
                      style={{ border: "0", cursor: "pointer", background: "transparent" }}
                      value={v.status}
                      onChange={(e) => {
                        store.updateVoter(v.id, { status: e.target.value as VoterRecord["status"] });
                        onUpdate();
                      }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Contacted">Contacted</option>
                      <option value="In-Favor">In-Favor</option>
                      <option value="Slip-Given">Slip Given</option>
                      <option value="Doubtful">Doubtful</option>
                      <option value="Opposed">Opposed</option>
                    </select>
                  </td>
                  <td>{v.worker}</td>
                  <td>
                    <button
                      style={{ border: 0, background: "transparent", color: "#d83b3b", padding: "4px" }}
                      title="Delete record"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete voter ${v.name}?`)) {
                          store.deleteVoter(v.id);
                          onUpdate();
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>
                    No voters match your search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Add Single Voter Modal */}
      {showAddModal && (
        <div className="modalOverlay" onClick={() => setShowAddModal(false)}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <h3>Add Single Voter Record</h3>
              <button onClick={() => setShowAddModal(false)}><X /></button>
            </div>
            <form onSubmit={handleAddVoter} className="modalBody">
              <div className="inputGrid">
                <div className="formGroup">
                  <label>Voter Full Name *</label>
                  <input
                    required
                    placeholder="e.g. Ramesh Sharma"
                    value={newVoter.name}
                    onChange={(e) => setNewVoter({ ...newVoter, name: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>EPIC (Voter ID No.) *</label>
                  <input
                    required
                    placeholder="e.g. RJX1029384"
                    value={newVoter.epic}
                    onChange={(e) => setNewVoter({ ...newVoter, epic: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="formGroup">
                <label>Guardian / Father / Husband Name</label>
                <input
                  placeholder="e.g. Sohan Lal"
                  value={newVoter.guardian}
                  onChange={(e) => setNewVoter({ ...newVoter, guardian: e.target.value })}
                />
              </div>

              <div className="inputGrid">
                <div className="formGroup">
                  <label>Age</label>
                  <input
                    type="number"
                    value={newVoter.age}
                    onChange={(e) => setNewVoter({ ...newVoter, age: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>Gender</label>
                  <select
                    value={newVoter.gender}
                    onChange={(e) => setNewVoter({ ...newVoter, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="inputGrid">
                <div className="formGroup">
                  <label>House No.</label>
                  <input
                    placeholder="e.g. 42-A"
                    value={newVoter.house}
                    onChange={(e) => setNewVoter({ ...newVoter, house: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>Booth / Part Number *</label>
                  <input
                    required
                    placeholder="e.g. 12"
                    value={newVoter.booth}
                    onChange={(e) => setNewVoter({ ...newVoter, booth: e.target.value })}
                  />
                </div>
              </div>

              <div className="formGroup">
                <label>Mobile Number (Optional)</label>
                <input
                  placeholder="e.g. 9829012345"
                  value={newVoter.phone}
                  onChange={(e) => setNewVoter({ ...newVoter, phone: e.target.value })}
                />
              </div>

              <div className="formFoot" style={{ marginTop: "20px" }}>
                <button type="button" className="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Save Voter Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// -------------------------------------------------------------
// 6. REAL EXCEL & CSV IMPORTER WITH SHEETJS XLSX
// -------------------------------------------------------------
function RealExcelImporter({
  candidateId,
  onImportSuccess,
  t,
}: {
  candidateId: string;
  onImportSuccess: () => void;
  t: (typeof translations)["hi"];
}) {
  const [step, setStep] = useState(1);
  const [parsedData, setParsedData] = useState<ParsedSheetData | null>(null);
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({});
  const [parsing, setParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [importStats, setImportStats] = useState({ valid: 0, warnings: 0, duplicates: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    setParsing(true);
    setErrorMsg("");
    try {
      const data = await parseExcelFile(file);
      setParsedData(data);
      const autoMap = detectFieldMapping(data.columns);
      setFieldMap(autoMap);
      setStep(2);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to parse file. Make sure it is a valid .xlsx or .csv");
    } finally {
      setParsing(false);
    }
  };

  const handleValidate = () => {
    if (!parsedData) return;

    let valid = 0;
    let warnings = 0;
    let duplicates = 0;

    const epicSet = new Set<string>();

    for (const row of parsedData.rows) {
      const name = String(row[fieldMap.name] || "").trim();
      const epic = String(row[fieldMap.epic] || "").trim().toUpperCase();

      if (!name || !epic) {
        warnings++;
      } else if (epicSet.has(epic)) {
        duplicates++;
      } else {
        epicSet.add(epic);
        valid++;
      }
    }

    setImportStats({ valid, warnings, duplicates });
    setStep(3);
  };

  const handleExecuteImport = () => {
    if (!parsedData) return;

    const votersToImport = parsedData.rows.map((row) => ({
      name: String(row[fieldMap.name] || "").trim(),
      epic: String(row[fieldMap.epic] || "").trim().toUpperCase(),
      guardian: String(row[fieldMap.guardian] || "").trim(),
      age: String(row[fieldMap.age] || ""),
      gender: String(row[fieldMap.gender] || "Male"),
      house: String(row[fieldMap.house] || ""),
      booth: String(row[fieldMap.booth] || "1"),
      phone: String(row[fieldMap.phone] || ""),
      status: "Pending" as VoterRecord["status"],
      worker: "Unassigned",
    })).filter((v) => v.name && v.epic);

    store.importVoters(candidateId, votersToImport);
    setStep(4);
  };

  return (
    <>
      <Title
        tag="DATA MANAGEMENT"
        title="Import Voter List"
        sub="Upload an Excel (.xlsx / .xls) or CSV file and automatically map columns to VoterDesk."
      >
        <button className="outline" onClick={downloadSampleExcelTemplate}>
          <Download size={16} /> Download Sample Template (.xlsx)
        </button>
      </Title>

      <div className="steps">
        {["Upload file", "Map columns", "Validate", "Import complete"].map((x, i) => (
          <div className={step >= i + 1 ? "done" : ""} key={x}>
            <i>{step > i + 1 ? "✓" : i + 1}</i>
            <b>{x}</b>
          </div>
        ))}
      </div>

      <Panel>
        {/* Step 1: Upload */}
        {step === 1 && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
            />

            <div
              className="drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) processFile(file);
              }}
            >
              <i><FileSpreadsheet /></i>
              <h2>Upload Your Voter List File</h2>
              <p>Drag and drop your .xlsx, .xls or .csv file here, or click below.</p>
              <button
                className="primary"
                disabled={parsing}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload /> {parsing ? "Reading File..." : "Choose Excel / CSV File"}
              </button>
              <small>Supports both English & Hindi columns • Max file size: 50 MB</small>

              {errorMsg && (
                <p style={{ color: "#d83b3b", marginTop: "14px", fontWeight: 700 }}>
                  {errorMsg}
                </p>
              )}
            </div>

            <div className="template">
              <div>
                <b>Don't have an Excel file ready?</b>
                <span>Download our official pre-formatted Excel template with sample Indian voter records.</span>
              </div>
              <button className="outline" onClick={downloadSampleExcelTemplate}>
                <Download size={16} /> Download Template
              </button>
            </div>
          </>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && parsedData && (
          <>
            <span className="file">
              <FileSpreadsheet /> {parsedData.fileName} ({parsedData.totalRows} rows detected)
            </span>
            <h2>Match Your File Columns</h2>
            <p className="muted">
              We automatically identified standard columns. Please verify the mapping below.
            </p>

            <div className="mapping">
              {[
                { key: "name", label: "Voter Full Name * (मतदाता का नाम)" },
                { key: "epic", label: "EPIC / Voter ID Number * (पहचान पत्र क्रमांक)" },
                { key: "guardian", label: "Guardian / Father / Husband Name (पिता/पति का नाम)" },
                { key: "age", label: "Age (उम्र / आयु)" },
                { key: "gender", label: "Gender (लिंग)" },
                { key: "house", label: "House No. (मकान संख्या)" },
                { key: "booth", label: "Part / Booth No. (भाग / बूथ संख्या)" },
                { key: "phone", label: "Mobile Number (मोबाइल नं.)" },
              ].map((field) => (
                <div key={field.key}>
                  <span><b>{field.label}</b></span>
                  <span>→</span>
                  <select
                    value={fieldMap[field.key] || ""}
                    onChange={(e) => setFieldMap({ ...fieldMap, [field.key]: e.target.value })}
                  >
                    <option value="">-- Select Column from File --</option>
                    {parsedData.columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  {fieldMap[field.key] ? <CheckCircle2 /> : <span style={{ color: "#94a3b8" }}>—</span>}
                </div>
              ))}
            </div>

            <Foot back={() => setStep(1)} next={handleValidate} label="Validate Records ›" />
          </>
        )}

        {/* Step 3: Validate */}
        {step === 3 && (
          <>
            <Result
              title="File Validation Complete"
              sub="Your voter data is verified and ready for import into this election campaign."
            />
            <div className="resultStats">
              <span><b>{importStats.valid}</b>Valid Records</span>
              <span><b>{importStats.warnings}</b>Warnings (Missing Info)</span>
              <span><b>{importStats.duplicates}</b>Duplicate EPICs (Skipped)</span>
            </div>
            <Foot back={() => setStep(2)} next={handleExecuteImport} label="Confirm & Import Voters" />
          </>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="result">
            <CheckCircle2 />
            <h2>{importStats.valid} Voters Imported Successfully!</h2>
            <p>Your candidate voter database, booth totals and karyakarta lists are now updated.</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
              <button className="primary" onClick={onImportSuccess}>
                View Voters in Database ›
              </button>
              <button className="outline" onClick={() => setStep(1)}>
                Import Another File
              </button>
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}

// -------------------------------------------------------------
// 7. TEAM & BOOTH MANAGEMENT (KARYAKARTAS)
// -------------------------------------------------------------
function TeamManagement({
  candidateId,
  team,
  onUpdate,
  t,
}: {
  candidateId: string;
  team: TeamMember[];
  onUpdate: () => void;
  t: (typeof translations)["hi"];
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    phone: "",
    roleTitle: "Booth Supervisor",
    assignedBooths: "12, 13",
    password: "karyakarta",
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.phone) return;

    const boothsArray = newMember.assignedBooths
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);

    store.addTeamMember({
      name: newMember.name,
      phone: newMember.phone,
      roleTitle: newMember.roleTitle,
      assignedBooths: boothsArray,
      status: "Active",
      candidateId,
      password: newMember.password,
    });

    setShowAddModal(false);
    setNewMember({
      name: "",
      phone: "",
      roleTitle: "Booth Supervisor",
      assignedBooths: "12, 13",
      password: "karyakarta",
    });
    onUpdate();
  };

  return (
    <>
      <Title
        tag="CAMPAIGN GROUND WORKERS"
        title="Team & Booth Assignments"
        sub="Manage Karyakarta access, login credentials and assign field workers to booths."
      >
        <button className="primary" onClick={() => setShowAddModal(true)}>
          <Plus /> Add Team Member (Karyakarta)
        </button>
      </Title>

      <div className="stats three">
        <article>
          <span>Total Karyakartas</span>
          <b>{team.length}</b>
          <small>{team.filter((t) => t.status === "Active").length} currently active</small>
        </article>
        <article>
          <span>Covered Booths</span>
          <b>{new Set(team.flatMap((t) => t.assignedBooths)).size}</b>
          <small>Assigned field coverage</small>
        </article>
        <article>
          <span>Voter Contacts Made</span>
          <b>{team.reduce((acc, t) => acc + (t.contactedCount || 0), 0)}</b>
          <small>Recorded door-to-door visits</small>
        </article>
      </div>

      <Panel title="Karyakarta Team Members" sub="Each member can log in via their mobile number to access only their assigned booths.">
        <div className="team">
          {team.map((member, idx) => (
            <div key={member.id}>
              <i className={`person c${idx % 4}`}>
                {member.name.slice(0, 2).toUpperCase()}
              </i>
              <p>
                <b>{member.name}</b>
                <small>{member.phone}</small>
              </p>
              <span>{member.roleTitle}</span>
              <span>Booths: {member.assignedBooths.join(", ") || "All"}</span>
              <em className="status contacted">{member.status}</em>
              <button
                style={{ border: 0, background: "transparent", color: "var(--muted)" }}
                title="Member options"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
          ))}
        </div>
      </Panel>

      {/* Add Karyakarta Modal */}
      {showAddModal && (
        <div className="modalOverlay" onClick={() => setShowAddModal(false)}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <h3>Add Campaign Karyakarta</h3>
              <button onClick={() => setShowAddModal(false)}><X /></button>
            </div>
            <form onSubmit={handleAddMember} className="modalBody">
              <div className="formGroup">
                <label>Karyakarta Full Name *</label>
                <input
                  required
                  placeholder="e.g. Rahul Meena"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                />
              </div>

              <div className="inputGrid">
                <div className="formGroup">
                  <label>Mobile Number (For Login) *</label>
                  <input
                    required
                    placeholder="e.g. 9829012345"
                    value={newMember.phone}
                    onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>Initial Password</label>
                  <input
                    required
                    type="password"
                    value={newMember.password}
                    onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="inputGrid">
                <div className="formGroup">
                  <label>Role / Title</label>
                  <select
                    value={newMember.roleTitle}
                    onChange={(e) => setNewMember({ ...newMember, roleTitle: e.target.value })}
                  >
                    <option value="Booth Supervisor">Booth Supervisor (बूथ प्रभारी)</option>
                    <option value="Field Worker">Field Worker (कार्यकर्ता)</option>
                    <option value="Data Operator">Data Operator (कंप्यूटर ऑपरेटर)</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>Assigned Booth Numbers (comma separated)</label>
                  <input
                    placeholder="e.g. 12, 14, 15"
                    value={newMember.assignedBooths}
                    onChange={(e) => setNewMember({ ...newMember, assignedBooths: e.target.value })}
                  />
                </div>
              </div>

              <div className="formFoot" style={{ marginTop: "24px" }}>
                <button type="button" className="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Create Karyakarta Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// -------------------------------------------------------------
// 8. REPORTS VIEW
// -------------------------------------------------------------
function ReportsView({ voters, t }: { voters: VoterRecord[]; t: (typeof translations)["hi"] }) {
  const total = voters.length;
  const contacted = voters.filter((v) => v.status === "Contacted").length;
  const inFavor = voters.filter((v) => v.status === "In-Favor").length;
  const slipGiven = voters.filter((v) => v.status === "Slip-Given").length;
  const pending = voters.filter((v) => v.status === "Pending").length;

  return (
    <>
      <Title tag="PERFORMANCE" title="Campaign Analytics" sub="Monitor field survey completion and booth confidence." />
      <div className="two">
        <Panel title="Weekly Voter Outreach" sub="Contact attempts recorded by your team">
          <div className="bars">
            {[45, 62, 54, 80, 73, 91, 68].map((v, i) => (
              <div key={i}>
                <i style={{ height: v + "%" }} />
                <small>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</small>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Voter Sentiment Overview" sub="Aggregated feedback across all booths">
          <div className="donut">
            <div>
              <b>{total > 0 ? Math.round(((contacted + inFavor + slipGiven) / total) * 100) : 0}%</b>
              <span>Contacted</span>
            </div>
          </div>
          <div className="legend">
            <span><i className="green" /> Pakka Vote (In-Favor) <b>{inFavor}</b></span>
            <span><i className="blue" /> Contacted <b>{contacted}</b></span>
            <span><i style={{ background: "#4338ca" }} /> Slip Distributed <b>{slipGiven}</b></span>
            <span><i className="orange" /> Pending <b>{pending}</b></span>
          </div>
        </Panel>
      </div>
    </>
  );
}

// -------------------------------------------------------------
// UI ATOMS
// -------------------------------------------------------------
function Title({ tag, title, sub, children }: { tag: string; title: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="title">
      <div>
        <em>{tag}</em>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {children}
    </div>
  );
}

function Panel({ title, sub, children }: { title?: string; sub?: string; children?: React.ReactNode }) {
  return (
    <article className="panel">
      {title && (
        <div className="panelHead">
          <div>
            <h2>{title}</h2>
            <p>{sub}</p>
          </div>
        </div>
      )}
      {children}
    </article>
  );
}

function Foot({ back, next, label }: { back: () => void; next: () => void; label: string }) {
  return (
    <div className="formFoot">
      <button className="outline" onClick={back}>Back</button>
      <button className="primary" onClick={next}>{label}</button>
    </div>
  );
}

function Result({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="result">
      <CheckCircle2 />
      <h2>{title}</h2>
      <p>{sub}</p>
    </div>
  );
}

function Logo() {
  return (
    <i className="logo">
      <Vote />
    </i>
  );
}
