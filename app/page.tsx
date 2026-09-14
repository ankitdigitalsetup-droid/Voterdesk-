"use client";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
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
  Globe,
  SlidersHorizontal,
  RefreshCw
} from "lucide-react";
import { store } from "@/lib/data-store";
import { VoterRecord, CandidateAccount, TeamMember, UserAccount } from "@/lib/types";
import { parseExcelFile, detectFieldMapping, downloadSampleExcelTemplate, ParsedSheetData } from "@/lib/excel-helper";
import { translations, Lang } from "@/lib/translations";
import { matchesVoter, singleFieldMatches } from "@/lib/transliterate";

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

  // Multi-mobile live sync states
  const [serverVersion, setServerVersion] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [onlineWorkersCount, setOnlineWorkersCount] = useState<number>(1);
  const [syncToast, setSyncToast] = useState<string>("");
  const serverVersionRef = useRef<number>(0);
  serverVersionRef.current = serverVersion;

  // Refresh data from local store
  const refreshData = () => {
    setCandidates([...store.getCandidates()]);
    setVoters([...store.getVoters({ candidateId: activeCandidateId })]);
    setTeam([...store.getTeam(activeCandidateId)]);
  };

  // Synchronize with server across all 15 mobile devices in real time
  const syncWithServer = useCallback(
    async (force = false) => {
      try {
        setIsSyncing(true);
        const curVer = force ? 0 : serverVersionRef.current;
        const workerName = user ? user.name : "Karyakarta";
        const res = await fetch(
          `/api/voters/sync?candidateId=${encodeURIComponent(activeCandidateId)}&version=${curVer}&force=${force ? "true" : "false"}&worker=${encodeURIComponent(workerName)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.activeWorkers !== undefined) {
            setOnlineWorkersCount(Math.max(1, data.activeWorkers));
          }
          if (data.hasUpdates && Array.isArray(data.voters)) {
            setVoters(data.voters);
            setServerVersion(data.version);
            serverVersionRef.current = data.version;
            store.setVotersList(activeCandidateId, data.voters);
            if (force) {
              setSyncToast("✅ डेटा तुरंत रिफ्रेश और 15 मोबाइल्स के साथ सिंक हो गया!");
              setTimeout(() => setSyncToast(""), 3500);
            }
          } else if (force) {
            setSyncToast("✅ आपका डेटा पहले से ही पूरी तरह अप-टू-डेट है!");
            setTimeout(() => setSyncToast(""), 3000);
          }
        }
      } catch {
        if (force) {
          refreshData();
          setSyncToast("✅ डेटा रिफ्रेश हो गया!");
          setTimeout(() => setSyncToast(""), 2500);
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [activeCandidateId, user]
  );

  useEffect(() => {
    refreshData();
    syncWithServer(true);
  }, [activeCandidateId]);

  // Live polling every 3 seconds so if any of 15 mobiles makes an edit, all other mobiles see it live!
  useEffect(() => {
    const timer = setInterval(() => {
      syncWithServer(false);
    }, 3000);
    return () => clearInterval(timer);
  }, [syncWithServer]);

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
        onRefreshData={syncWithServer}
        isSyncing={isSyncing}
        onlineWorkersCount={onlineWorkersCount}
        syncToast={syncToast}
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

// Indian States list for Survey Form (Images 4 & 5)
const indianStates = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

// Districts list for Rajasthan / Survey Form
const rajasthanDistricts = [
  "Ajmer",
  "Alwar",
  "Anupgarh",
  "Balotra",
  "Banswara",
  "Baran",
  "Barmer",
  "Beawar",
  "Bharatpur",
  "Bhilwara",
  "Bikaner",
  "Bundi",
  "Chittorgarh",
  "Churu",
  "Dausa",
  "Deeg",
  "Dholpur",
  "Didwana-Kuchaman",
  "Dudu",
  "Dungarpur",
  "Gangapur City",
  "Hanumangarh",
  "Jaipur",
  "Jaipur Rural",
  "Jaisalmer",
  "Jalore",
  "Jhalawar",
  "Jhunjhunu",
  "Jodhpur",
  "Jodhpur Rural",
  "Karauli",
  "Kekri",
  "Khairthal-Tijara",
  "Kota",
  "Kotputli-Behror",
  "Nagaur",
  "Neem Ka Thana",
  "Pali",
  "Phalodi",
  "Pratapgarh",
  "Rajsamand",
  "Salumbar",
  "Sanchore",
  "Sawai Madhopur",
  "Shahpura",
  "Sikar",
  "Sirohi",
  "Sri Ganganagar",
  "Tonk",
  "Udaipur",
  "Other"
];

// -------------------------------------------------------------
// 3. BOOTH MANAGER DIRECT VIEW (MATCHING USER SCREENSHOT)
// -------------------------------------------------------------
function BoothManagerView({
  user,
  candidateId,
  candidate,
  voters,
  onVoterUpdated,
  onRefreshData,
  isSyncing = false,
  onlineWorkersCount = 1,
  syncToast = "",
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
  onRefreshData: (force?: boolean) => void;
  isSyncing?: boolean;
  onlineWorkersCount?: number;
  syncToast?: string;
  onLogout: () => void;
  onOpenAdminPanel?: () => void;
  lang: Lang;
  toggleLang: () => void;
  t: (typeof translations)["hi"];
}) {
  const [search, setSearch] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(true);
  const [partFilter, setPartFilter] = useState("ALL");
  const [selectedVoter, setSelectedVoter] = useState<VoterRecord | null>(null);

  // Modals state
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [updateTab, setUpdateTab] = useState<"sync" | "add" | "upload">("sync");

  // Voter Action Modal (Image 1: 7-Buttons Hub) & Sub-Screens
  const [activeActionVoter, setActiveActionVoter] = useState<VoterRecord | null>(null);
  const [activeVoterPhone, setActiveVoterPhone] = useState("");
  const [isPhoneUpdating, setIsPhoneUpdating] = useState(false);
  const [phoneUpdatedSuccess, setPhoneUpdatedSuccess] = useState(false);
  const [activeVoterSlipMsg, setActiveVoterSlipMsg] = useState("");
  const [showPrintSlipScreen, setShowPrintSlipScreen] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState("Select Printer");
  const [showWhatsAppSlipScreen, setShowWhatsAppSlipScreen] = useState(false);
  const [showSurveyScreen, setShowSurveyScreen] = useState(false);
  const [surveyFormData, setSurveyFormData] = useState({
    supporter: "",
    casteCategory: "",
    casteSub: "",
    casteCustom: "",
    whatsapp: "",
    education: "",
    livelihood: "",
    livelihoodDetail: "",
    outsideState: "Andaman and Nicobar Islands",
    outsideDistrict: "-Select-",
    outsideAddress: "",
    officeBearer: "",
    detail1: "",
    detail2: "",
  });
  const [familyFilter, setFamilyFilter] = useState<{ house: string; booth: string } | null>(null);

  // Voter Slip Custom Message (1:1 with user screenshot)
  const defaultSlipMsg = `vote for "${candidate ? candidate.name : "Candidate Name"}"`;
  const [customSlipMsg, setCustomSlipMsg] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("voterdesk_slip_msg");
      if (saved) return saved;
    }
    return `vote for "${candidate ? candidate.name : "Candidate Name"}"`;
  });
  const [showSlipMsgModal, setShowSlipMsgModal] = useState(false);
  const [tempSlipMsg, setTempSlipMsg] = useState(customSlipMsg);
  const [localToast, setLocalToast] = useState("");

  const handleSaveSlipMsg = () => {
    const finalMsg = tempSlipMsg.trim() || defaultSlipMsg;
    setCustomSlipMsg(finalMsg);
    if (typeof window !== "undefined") {
      localStorage.setItem("voterdesk_slip_msg", finalMsg);
    }
    setShowSlipMsgModal(false);
    setLocalToast("✅ वोटर स्लिप मैसेज सेव हो गया!");
    setTimeout(() => setLocalToast(""), 3000);
  };

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
    address: "",
    boothAddress: "",
    voted: "नहीं",
    isSupporter: "हाँ",
    isOutside: "नहीं",
    phone: "",
    status: "Pending" as VoterRecord["status"],
  });

  // Excel Upload state in modal
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Advanced Multi-Column Search states (Name, Father/Husband, Address, EPIC)
  const [showAdvSearch, setShowAdvSearch] = useState(false);
  const [advName, setAdvName] = useState("");
  const [advFather, setAdvFather] = useState("");
  const [advAddress, setAdvAddress] = useState("");
  const [advEpic, setAdvEpic] = useState("");

  const activeAdvFiltersCount =
    (advName.trim() ? 1 : 0) +
    (advFather.trim() ? 1 : 0) +
    (advAddress.trim() ? 1 : 0) +
    (advEpic.trim() ? 1 : 0);

  const clearAdvSearch = () => {
    setAdvName("");
    setAdvFather("");
    setAdvAddress("");
    setAdvEpic("");
  };

  // -------------------------------------------------------------
  // HANDLERS FOR VOTER ACTION HUB & SUB-SCREENS (IMAGES 1, 2, 3, 4/5)
  // -------------------------------------------------------------
  const handleOpenVoterAction = (v: VoterRecord) => {
    setActiveActionVoter(v);
    setActiveVoterPhone(v.phone || "");
    setActiveVoterSlipMsg(v.slipMessage || customSlipMsg || "");
    setIsPhoneUpdating(false);
    setPhoneUpdatedSuccess(false);
  };

  const handleSavePhoneUpdate = async () => {
    if (!activeActionVoter) return;
    const cleanPhone = activeVoterPhone.trim();
    setIsPhoneUpdating(true);

    try {
      // 1. Update in-memory & disk data store
      const updated = store.updateVoter(activeActionVoter.id, { phone: cleanPhone });
      if (updated) {
        // Update local modal state
        setActiveActionVoter((prev) => (prev ? { ...prev, phone: cleanPhone } : null));
        // Update bottom drawer selected voter if open
        if (selectedVoter && selectedVoter.id === activeActionVoter.id) {
          setSelectedVoter((prev) => (prev ? { ...prev, phone: cleanPhone } : null));
        }

        // 2. Broadcast update to all 15 mobile devices via sync API
        await fetch("/api/voters/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId,
            voterId: activeActionVoter.id,
            updates: { phone: cleanPhone },
            worker: user.name,
            booth: activeActionVoter.booth,
          }),
        }).catch(() => {});

        // 3. Update single voter endpoint
        await fetch(`/api/voters/${activeActionVoter.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleanPhone }),
        }).catch(() => {});

        // 4. Trigger UI re-render and global refresh
        onVoterUpdated();
        onRefreshData(true);

        // 5. Visual success feedback
        setPhoneUpdatedSuccess(true);
        setLocalToast("✅ मोबाइल नंबर सफलतापूर्वक अपडेट हो गया!");
        setTimeout(() => {
          setPhoneUpdatedSuccess(false);
          setLocalToast("");
        }, 3000);
      }
    } catch {
      setLocalToast("⚠️ नंबर अपडेट करने में समस्या आई");
      setTimeout(() => setLocalToast(""), 3000);
    } finally {
      setIsPhoneUpdating(false);
    }
  };

  const handleUpdateActionSlipMsg = (newMsg: string) => {
    setActiveVoterSlipMsg(newMsg);
    if (!activeActionVoter) return;
    const updated = store.updateVoter(activeActionVoter.id, { slipMessage: newMsg });
    if (updated) {
      setActiveActionVoter((prev) => (prev ? { ...prev, slipMessage: newMsg } : null));
      if (selectedVoter && selectedVoter.id === activeActionVoter.id) {
        setSelectedVoter((prev) => (prev ? { ...prev, slipMessage: newMsg } : null));
      }
      onVoterUpdated();
    }
  };

  // 1. प्रिंट वोटर स्लिप
  const handleOpenPrintSlip = () => {
    setShowPrintSlipScreen(true);
  };

  // 2. मैसेज (Normal SMS Intent - Opens blank message composer without pre-filled text)
  const handleSendActionSMS = () => {
    if (!activeActionVoter) return;
    const ph = (activeVoterPhone || activeActionVoter.phone || "").replace(/[^0-9]/g, "");

    if (!ph) {
      setLocalToast("⚠️ कृपया पहले ऊपर मोबाइल नंबर दर्ज करें!");
      setTimeout(() => setLocalToast(""), 3000);
      return;
    }
    // Opens phone's default SMS app in a blank composer for this recipient
    window.location.href = `sms:${ph}`;
  };

  // 3. कॉल (Direct Tel Intent)
  const handleCallAction = () => {
    if (!activeActionVoter) return;
    const ph = (activeVoterPhone || activeActionVoter.phone || "").replace(/[^0-9]/g, "");
    if (!ph) {
      setLocalToast("⚠️ कॉल करने के लिए कृपया ऊपर मोबाइल नंबर दर्ज करें!");
      setTimeout(() => setLocalToast(""), 3000);
      return;
    }
    window.location.href = `tel:${ph}`;
  };

  // 4. वोटर स्लिप (Formatted Slip Copy & Share)
  const handleShareVoterSlip = async () => {
    if (!activeActionVoter) return;
    const slipText = `क्रम सं : ${activeActionVoter.serialNo || "—"}     भाग सं : ${activeActionVoter.booth}
नाम : ${activeActionVoter.name}
पिता/पति : ${activeActionVoter.guardian || "—"}
उम्र : ${activeActionVoter.age || "—"}     मकान नंबर : ${activeActionVoter.house || "—"}
वोटर ID : ${activeActionVoter.epic}
बुथ पता : ${activeActionVoter.boothAddress || "184 - महात्मा गांधी राजकीय विद्यालय इंग्लिश मीडियम का कमरा नं. 2 चौरसियावास अजमेर"}
${activeVoterSlipMsg ? "\n" + activeVoterSlipMsg : ""}`;

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(slipText);
        setLocalToast("📋 वोटर स्लिप कॉपी हो गई!");
        setTimeout(() => setLocalToast(""), 3000);
      } catch {}
    }

    const ph = (activeVoterPhone || activeActionVoter.phone || "").replace(/[^0-9]/g, "");
    if (ph) {
      window.open(`sms:${ph}?body=${encodeURIComponent(slipText)}`, "_self");
    } else if (navigator.share) {
      try {
        await navigator.share({ title: `वोटर स्लिप - ${activeActionVoter.name}`, text: slipText });
      } catch {}
    }
  };

  // 5. फैमिली लिस्ट (Filter by same House & Booth)
  const handleFilterFamily = () => {
    if (!activeActionVoter) return;
    setFamilyFilter({ house: activeActionVoter.house || "", booth: activeActionVoter.booth });
    setActiveActionVoter(null);
    setLocalToast(`👨‍👩‍👧‍👦 मकान नं. ${activeActionVoter.house || "—"} के सभी परिवारजन फ़िल्टर हो गए!`);
    setTimeout(() => setLocalToast(""), 3500);
  };

  // 6. व्हाट्सएप (Open Image 3 screen)
  const handleOpenWhatsAppSlip = () => {
    setShowWhatsAppSlipScreen(true);
  };

  // 7. सर्वे (Open Survey screen)
  const handleOpenSurvey = () => {
    if (!activeActionVoter) return;
    const surv = activeActionVoter.survey || {};
    setSurveyFormData({
      supporter: surv.supporter || (activeActionVoter.isSupporter === "हाँ" ? "हाँ" : ""),
      casteCategory: surv.casteCategory || "",
      casteSub: surv.casteSub || "",
      casteCustom: surv.casteCustom || "",
      whatsapp: surv.whatsapp || activeVoterPhone || activeActionVoter.phone || "",
      education: surv.education || "",
      livelihood: surv.livelihood || "",
      livelihoodDetail: surv.livelihoodDetail || "",
      outsideState: surv.outsideState || "Andaman and Nicobar Islands",
      outsideDistrict: surv.outsideDistrict || "-Select-",
      outsideAddress: surv.outsideAddress || "",
      officeBearer: surv.officeBearer || "",
      detail1: surv.detail1 || "",
      detail2: surv.detail2 || "",
    });
    setShowSurveyScreen(true);
  };

  // Submit Survey Form
  const handleSubmitSurvey = () => {
    if (!activeActionVoter) return;
    const updates: Partial<VoterRecord> = {
      survey: surveyFormData,
      isSupporter: surveyFormData.supporter === "हाँ" ? "हाँ" : surveyFormData.supporter === "नहीं" ? "नहीं" : activeActionVoter.isSupporter,
      isOutside: (surveyFormData.outsideAddress || (surveyFormData.outsideDistrict && surveyFormData.outsideDistrict !== "-Select-")) ? "हाँ" : activeActionVoter.isOutside,
      phone: surveyFormData.whatsapp || activeActionVoter.phone,
    };
    const updated = store.updateVoter(activeActionVoter.id, updates);
    if (updated) {
      setActiveActionVoter((prev) => (prev ? { ...prev, ...updates } : null));
      if (selectedVoter && selectedVoter.id === activeActionVoter.id) {
        setSelectedVoter((prev) => (prev ? { ...prev, ...updates } : null));
      }
      fetch("/api/voters/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          voterId: activeActionVoter.id,
          updates,
          worker: user.name,
          booth: activeActionVoter.booth,
        }),
      }).catch(() => {});
      onVoterUpdated();
    }
    setShowSurveyScreen(false);
    setLocalToast("✅ सर्वे डेटा सफलतापूर्वक सुरक्षित हो गया!");
    setTimeout(() => setLocalToast(""), 3000);
  };

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

      // Family List Filter (When red Family List button is clicked)
      if (familyFilter) {
        if (v.booth !== familyFilter.booth) return false;
        if (familyFilter.house && v.house !== familyFilter.house) return false;
      }

      // 1. Advanced Search: Voter Name column
      if (advName.trim() && !singleFieldMatches(v.name, advName)) {
        return false;
      }

      // 2. Advanced Search: Father / Husband column
      if (advFather.trim() && (!v.guardian || !singleFieldMatches(v.guardian, advFather))) {
        return false;
      }

      // 3. Advanced Search: House / Address column
      if (advAddress.trim()) {
        const matchHouse = v.house && singleFieldMatches(v.house, advAddress);
        const matchAddr = v.address && singleFieldMatches(v.address, advAddress);
        if (!matchHouse && !matchAddr) return false;
      }

      // 4. Advanced Search: EPIC No. column
      if (advEpic.trim() && (!v.epic || !singleFieldMatches(v.epic, advEpic))) {
        return false;
      }

      // General Search query bar
      if (search.trim()) {
        return matchesVoter(v, search);
      }
      return true;
    });
  }, [voters, user, partFilter, search, advName, advFather, advAddress, advEpic, familyFilter]);

  // Auto-select and show details drawer when search pinpoints a single voter
  useEffect(() => {
    if (filteredVoters.length === 1 && (activeAdvFiltersCount >= 2 || (activeAdvFiltersCount >= 1 && search.trim()))) {
      setSelectedVoter(filteredVoters[0]);
    }
  }, [filteredVoters, activeAdvFiltersCount, search]);

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
    // Push update to server for 15 mobiles real-time sync
    fetch("/api/voters/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId,
        voterId,
        updates: { status: newStatus, worker: user.name },
        worker: user.name,
      }),
    }).catch(() => {});
    onVoterUpdated();
  };

  const handleToggleField = (
    voter: VoterRecord,
    field: "voted" | "isSupporter" | "isOutside"
  ) => {
    const currentVal = String(voter[field] || (field === "isSupporter" ? "हाँ" : "नहीं"));
    const isCurrentlyYes = currentVal === "हाँ" || currentVal === "Yes" || currentVal === "true";
    const newVal = isCurrentlyYes ? "नहीं" : "हाँ";
    const updatePayload: Partial<VoterRecord> = { [field]: newVal };
    if (field === "isSupporter") {
      updatePayload.status = newVal === "हाँ" ? "In-Favor" : "Pending";
    }
    store.updateVoter(voter.id, updatePayload);
    setSelectedVoter((prev) => (prev && prev.id === voter.id ? { ...prev, ...updatePayload } : prev));
    // Push toggle to server for 15 mobiles real-time sync
    fetch("/api/voters/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId,
        voterId: voter.id,
        updates: updatePayload,
        worker: user.name,
        booth: voter.booth,
      }),
    }).catch(() => {});
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
      address: voterForm.address.trim(),
      boothAddress: voterForm.boothAddress.trim(),
      voted: voterForm.voted,
      isSupporter: voterForm.isSupporter,
      isOutside: voterForm.isOutside,
      phone: voterForm.phone.trim(),
      status: voterForm.status,
      worker: user.name,
      candidateId: candidateId || "cand_1",
    });

    // Push new voter to server for 15 mobiles real-time sync
    fetch("/api/voters/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: candidateId || "cand_1",
        newVoter: {
          name: voterForm.name.trim(),
          guardian: voterForm.guardian.trim(),
          booth: voterForm.booth.trim() || "1",
          serialNo: voterForm.serialNo ? Number(voterForm.serialNo) : undefined,
          epic: epicVal,
          age: voterForm.age || "35",
          gender: voterForm.gender || "Male",
          house: voterForm.house.trim(),
          address: voterForm.address.trim(),
          boothAddress: voterForm.boothAddress.trim(),
          voted: voterForm.voted,
          isSupporter: voterForm.isSupporter,
          isOutside: voterForm.isOutside,
          phone: voterForm.phone.trim(),
          status: voterForm.status,
          worker: user.name,
        },
        worker: user.name,
        booth: voterForm.booth.trim() || "1",
      }),
    }).catch(() => {});

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
      address: "",
      boothAddress: "",
      voted: "नहीं",
      isSupporter: "हाँ",
      isOutside: "नहीं",
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
      const toImport = parsed.rows.map((row, idx) => {
        const boothVal = String(row[mapping.booth] || "1").trim();
        const serialVal = mapping.serialNo && row[mapping.serialNo] ? Number(row[mapping.serialNo]) : (idx + 1);
        const epicVal = String(row[mapping.epic] || "").trim().toUpperCase() ||
          `RJX${boothVal.padStart(2, "0")}${String(serialVal).padStart(5, "0")}`;

        const isSupp = String(row[mapping.isSupporter] || "").trim();
        const votedVal = String(row[mapping.voted] || "").trim();
        const outsideVal = String(row[mapping.isOutside] || "").trim();

        return {
          name: String(row[mapping.name] || "").trim(),
          epic: epicVal,
          guardian: String(row[mapping.guardian] || "").trim(),
          age: String(row[mapping.age] || "35"),
          gender: String(row[mapping.gender] || "Male"),
          house: String(row[mapping.house] || "").trim(),
          booth: boothVal,
          serialNo: serialVal,
          phone: String(row[mapping.phone] || "").trim(),
          address: String(row[mapping.address] || "").trim(),
          voted: votedVal || "नहीं",
          isSupporter: isSupp || "हाँ",
          isOutside: outsideVal || "नहीं",
          boothAddress: String(row[mapping.boothAddress] || "").trim(),
          status: (isSupp === "हाँ" || isSupp === "Yes") ? ("In-Favor" as VoterRecord["status"]) : ("Pending" as VoterRecord["status"]),
          worker: "Unassigned",
        };
      }).filter((v) => v.name);

      if (toImport.length === 0) {
        throw new Error("फ़ाइल में कोई वैध मतदाता रिकॉर्ड नहीं मिले।");
      }

      const res = store.importVoters(candidateId || "cand_1", toImport);
      // Sync imported batch to server
      fetch("/api/voters/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candidateId || "cand_1",
          voters: toImport,
        }),
      }).then(() => {
        onRefreshData(true);
      }).catch(() => {});

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
    const campaignMsg = customSlipMsg.trim() || `vote for "${candName}"`;
    return `🇮🇳 *मतदाता पर्ची (OFFICIAL VOTER SLIP)* 🇮🇳%0A` +
      `*उम्मीदवार:* ${candName} (${candParty})%0A` +
      `----------------------------------------%0A` +
      `👤 *मतदाता:* ${v.name}%0A` +
      `👨‍👧 *पिता/पति:* ${v.guardian || "—"}%0A` +
      `🔢 *भाग सं. (Part No):* ${v.booth} | *क्र सं. (Sr No):* ${v.serialNo || "—"}%0A` +
      `🆔 *पहचान पत्र (EPIC):* ${v.epic}%0A` +
      `🏠 *मकान नं.:* ${v.house || "—"}${v.address ? ` (${v.address})` : ""}%0A` +
      `📍 *मतदान केंद्र:* ${t.pollingStationName}%0A` +
      `----------------------------------------%0A` +
      `🗳️ ${campaignMsg} 🙏`;
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
      {/* Floating Live Sync / Slip Toast Notification */}
      {(syncToast || localToast) && (
        <div
          style={{
            position: "fixed",
            top: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99999,
            background: "#065f46",
            color: "#ecfdf5",
            padding: "8px 16px",
            borderRadius: "30px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            fontSize: "12px",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "1px solid #34d399",
            maxWidth: "92vw",
            textAlign: "center",
          }}
        >
          <RefreshCw size={13} style={{ animation: syncToast ? "spin 1s linear infinite" : "none" }} />
          <span>{localToast || syncToast}</span>
        </div>
      )}

      {/* 1. Header (Matching Screenshot) */}
      <header className="bmHeader noPrint">
        <div className="bmHeaderLeft">
          <div className="bmHeaderLogo">
            <ShieldCheck size={20} color="#ffffff" />
          </div>
          <div style={{ minWidth: 0, overflow: "hidden" }}>
            <b className="bmHeaderTitle">{t.bmTitle}</b>
            <span className="bmHeaderSub">{t.bmSub}</span>
          </div>
        </div>

        <div className="bmHeaderRight">
          {/* Live Multi-Mobile Sync Indicator */}
          <button
            type="button"
            onClick={() => onRefreshData(true)}
            className="bmLiveBadge"
            title="क्लिक करके अभी डेटा रिफ्रेश व 15 मोबाइल्स में सिंक करें"
          >
            <span className="bmLiveDot" />
            <span>{onlineWorkersCount > 1 ? `${onlineWorkersCount} लाइव` : "15 लाइव"}</span>
            <RefreshCw
              size={10}
              style={{
                animation: isSyncing ? "spin 1s linear infinite" : "none",
              }}
            />
          </button>

          {/* Working Language Switcher Button */}
          <button
            type="button"
            onClick={toggleLang}
            className="bmLangBtn"
            title="Switch Language / भाषा बदलें"
          >
            <Globe size={11} />
            <span>{lang === "hi" ? "EN" : "हि"}</span>
          </button>

          {/* Admin Panel Button (for Candidate Admin / Super Admin) */}
          {onOpenAdminPanel && (
            <button
              type="button"
              onClick={onOpenAdminPanel}
              className="bmAdminBtn"
              title={t.adminPanel}
            >
              <span>{lang === "hi" ? "एडमिन" : "Admin"}</span>
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
            setTempSlipMsg(customSlipMsg);
            setShowSlipMsgModal(true);
          }}
          title="वोटर स्लिप के साथ मैसेज सेट करें"
        >
          <span>{lang === "hi" ? "स्लिप" : "Slip"}</span>
          <span>{lang === "hi" ? "मैसेज" : "Message"}</span>
        </button>

        <button
          type="button"
          className="bmActionBtn bmBtnUpdate"
          onClick={() => {
            onRefreshData(true);
            setUpdateTab("sync");
            setShowUpdateModal(true);
          }}
          title="डेटा रिफ्रेश व अपडेट करें"
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
      {/* 3. Search & Filter Bar (Toggled when Search clicked) */}
      {showSearchBar && (
        <>
          <div
            className="noPrint"
            style={{
              background: "#f1f5f9",
              padding: "10px 12px",
              borderBottom: "1px solid #cbd5e1",
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 200px", position: "relative" }}>
              <Search
                size={15}
                style={{ position: "absolute", left: "10px", top: "11px", color: "#64748b" }}
              />
              <input
                type="text"
                placeholder={lang === "hi" ? "नाम, सरनेम, पिता/पति, पता या EPIC (e.g. Rakesh, Sharma, 1001001)..." : "Search Name, Surname, Father, Address, EPIC (e.g. Rakesh, Sharma, 1001001)..."}
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

            {/* Advanced Search Button right beside Search Input */}
            <button
              type="button"
              onClick={() => setShowAdvSearch((prev) => !prev)}
              style={{
                height: "36px",
                padding: "0 10px",
                borderRadius: "8px",
                border: showAdvSearch || activeAdvFiltersCount > 0 ? "1.5px solid #0284c7" : "1px solid #cbd5e1",
                background: showAdvSearch || activeAdvFiltersCount > 0 ? "#e0f2fe" : "#ffffff",
                color: showAdvSearch || activeAdvFiltersCount > 0 ? "#0369a1" : "#334155",
                fontSize: "12px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: showAdvSearch ? "0 0 0 2px rgba(2, 132, 199, 0.18)" : "none",
                transition: "all 0.15s ease",
              }}
              title={lang === "hi" ? "एडवांस्ड सर्च (नाम, पिता, पता, पहचान पत्र अलग-अलग कॉलम में खोजें)" : "Advanced Search"}
            >
              <SlidersHorizontal size={14} />
              <span>{lang === "hi" ? "एडवांस्ड सर्च" : "Adv Search"}</span>
              {activeAdvFiltersCount > 0 && (
                <span
                  style={{
                    background: "#0284c7",
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: 800,
                    borderRadius: "50%",
                    width: "17px",
                    height: "17px",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {activeAdvFiltersCount}
                </span>
              )}
            </button>

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

          {/* Advanced Multi-Column Search Drawer / Panel */}
          {showAdvSearch && (
            <div
              className="noPrint"
              style={{
                background: "#ffffff",
                borderBottom: "2px solid #38bdf8",
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.08)",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <SlidersHorizontal size={15} color="#0284c7" />
                  <b style={{ fontSize: "13px", color: "#0f172a" }}>
                    {lang === "hi" ? "एडवांस्ड सर्च (अलग-अलग कॉलम में खोजें)" : "Advanced Search by Columns"}
                  </b>
                  {activeAdvFiltersCount > 0 && (
                    <span style={{ fontSize: "11px", color: "#0369a1", background: "#e0f2fe", padding: "2px 7px", borderRadius: "5px", fontWeight: 700 }}>
                      {activeAdvFiltersCount} {lang === "hi" ? "सक्रिय फ़िल्टर" : "Active"}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {activeAdvFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAdvSearch}
                      style={{
                        border: 0,
                        background: "#fee2e2",
                        color: "#b91c1c",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "4px 9px",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      ✕ {lang === "hi" ? "सभी हटाएं (Clear)" : "Clear All"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAdvSearch(false)}
                    style={{
                      border: 0,
                      background: "#f1f5f9",
                      color: "#64748b",
                      borderRadius: "50%",
                      width: "26px",
                      height: "26px",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                    }}
                    title={lang === "hi" ? "बंद करें" : "Close"}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* 4 Separate Columns as requested by user */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: "10px",
                }}
              >
                {/* 1. Voter Name Column */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    👤 {lang === "hi" ? "मतदाता का नाम (Name)" : "Voter Name"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={advName}
                      onChange={(e) => setAdvName(e.target.value)}
                      placeholder={lang === "hi" ? "उदा: Gau, Gaurav, गौरव..." : "e.g. Gau, Gaurav..."}
                      style={{
                        width: "100%",
                        height: "34px",
                        padding: "0 26px 0 9px",
                        borderRadius: "6px",
                        border: advName ? "1.5px solid #0284c7" : "1px solid #cbd5e1",
                        fontSize: "12px",
                        background: advName ? "#f0f9ff" : "#ffffff",
                        outline: "none",
                      }}
                    />
                    {advName && (
                      <button
                        type="button"
                        onClick={() => setAdvName("")}
                        style={{
                          position: "absolute",
                          right: "6px",
                          top: "9px",
                          border: 0,
                          background: "transparent",
                          color: "#94a3b8",
                          cursor: "pointer",
                        }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Father / Husband Name Column */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    👨‍👧 {lang === "hi" ? "पिता/पति का नाम (Father/Husband)" : "Father / Husband"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={advFather}
                      onChange={(e) => setAdvFather(e.target.value)}
                      placeholder={lang === "hi" ? "उदा: San, Santosh, संतोष..." : "e.g. San, Santosh..."}
                      style={{
                        width: "100%",
                        height: "34px",
                        padding: "0 26px 0 9px",
                        borderRadius: "6px",
                        border: advFather ? "1.5px solid #0284c7" : "1px solid #cbd5e1",
                        fontSize: "12px",
                        background: advFather ? "#f0f9ff" : "#ffffff",
                        outline: "none",
                      }}
                    />
                    {advFather && (
                      <button
                        type="button"
                        onClick={() => setAdvFather("")}
                        style={{
                          position: "absolute",
                          right: "6px",
                          top: "9px",
                          border: 0,
                          background: "transparent",
                          color: "#94a3b8",
                          cursor: "pointer",
                        }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Address / House Column */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    🏠 {lang === "hi" ? "मकान नं. / पता (Address/House)" : "Address / House No."}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={advAddress}
                      onChange={(e) => setAdvAddress(e.target.value)}
                      placeholder={lang === "hi" ? "उदा: 12, 64, शांति नगर..." : "e.g. 12, 64, Ward 34..."}
                      style={{
                        width: "100%",
                        height: "34px",
                        padding: "0 26px 0 9px",
                        borderRadius: "6px",
                        border: advAddress ? "1.5px solid #0284c7" : "1px solid #cbd5e1",
                        fontSize: "12px",
                        background: advAddress ? "#f0f9ff" : "#ffffff",
                        outline: "none",
                      }}
                    />
                    {advAddress && (
                      <button
                        type="button"
                        onClick={() => setAdvAddress("")}
                        style={{
                          position: "absolute",
                          right: "6px",
                          top: "9px",
                          border: 0,
                          background: "transparent",
                          color: "#94a3b8",
                          cursor: "pointer",
                        }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. EPIC No Column */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    🆔 {lang === "hi" ? "पहचान पत्र क्र. (EPIC No.)" : "Voter ID (EPIC)"}
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={advEpic}
                      onChange={(e) => setAdvEpic(e.target.value)}
                      placeholder={lang === "hi" ? "उदा: RJX..., 1001025..." : "e.g. RJX..., 1001025..."}
                      style={{
                        width: "100%",
                        height: "34px",
                        padding: "0 26px 0 9px",
                        borderRadius: "6px",
                        border: advEpic ? "1.5px solid #0284c7" : "1px solid #cbd5e1",
                        fontSize: "12px",
                        background: advEpic ? "#f0f9ff" : "#ffffff",
                        outline: "none",
                      }}
                    />
                    {advEpic && (
                      <button
                        type="button"
                        onClick={() => setAdvEpic("")}
                        style={{
                          position: "absolute",
                          right: "6px",
                          top: "9px",
                          border: 0,
                          background: "transparent",
                          color: "#94a3b8",
                          cursor: "pointer",
                        }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Helper tip with live match count */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px", color: "#64748b", borderTop: "1px dashed #e2e8f0", paddingTop: "8px" }}>
                <span>
                  💡 <b>{lang === "hi" ? "सुझाव:" : "Tip:"}</b> {lang === "hi" ? "नाम में 'Gau' और पिता के कॉलम में 'San' लिखते ही सटीक मतदाता तुरंत सामने आ जाएगा।" : "Typing 'Gau' in Name and 'San' in Father immediately pinpoints the voter."}
                </span>
                <span style={{ fontWeight: 700, color: "#0369a1", background: "#f0f9ff", padding: "2px 8px", borderRadius: "6px" }}>
                  {filteredVoters.length} {lang === "hi" ? "मतदाता मिले" : "voters found"}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Active Family List Filter Badge */}
      {familyFilter && (
        <div style={{
          background: "#fee2e2",
          border: "1.5px solid #f87171",
          color: "#991b1b",
          padding: "10px 14px",
          borderRadius: "8px",
          margin: "0 10px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "13.5px",
          fontWeight: 600,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          <span>
            👨‍👩‍👧‍👦 {lang === "hi" ? "फैमिली लिस्ट फ़िल्टर सक्रिय:" : "Family List Active:"}{" "}
            भाग {familyFilter.booth}, मकान नं {familyFilter.house || "—"} ({filteredVoters.length} {lang === "hi" ? "सदस्य" : "members"})
          </span>
          <button
            type="button"
            onClick={() => setFamilyFilter(null)}
            style={{
              background: "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            ✕ {lang === "hi" ? "फ़िल्टर हटाएं" : "Clear Filter"}
          </button>
        </div>
      )}

      {/* 4. Tabular Voter Roll (Exact Layout from Screenshot) */}
      <div className="bmTableContainer printableArea">
        <table className="bmTable">
          <thead>
            <tr>
              <th style={{ width: "55px" }}>{t.colPart}</th>
              <th style={{ width: "55px" }}>{t.colSerial}</th>
              <th className="thLeft" style={{ minWidth: "140px" }}>{t.colName}</th>
              <th className="thLeft" style={{ minWidth: "140px" }}>{t.colGuardian}</th>
              <th style={{ minWidth: "85px" }}>{t.colVoted}</th>
              <th style={{ minWidth: "85px" }}>{t.colSupporter}</th>
              <th style={{ minWidth: "85px" }}>{t.colOutside}</th>
              <th style={{ minWidth: "115px" }}>{t.colPhone}</th>
              <th style={{ width: "75px" }}>{t.colHouse}</th>
              <th className="thLeft" style={{ minWidth: "150px" }}>{t.colAddress}</th>
              <th className="thLeft" style={{ minWidth: "170px" }}>{t.colBoothAddress}</th>
            </tr>
          </thead>
          <tbody>
            {filteredVoters.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                  {t.noVotersMatch}
                </td>
              </tr>
            ) : (
              filteredVoters.map((v, idx) => {
                const isSelected = selectedVoter?.id === v.id;
                const isVoted = v.voted === "हाँ" || v.voted === "Yes" || v.voted === true;
                const isSupp = v.isSupporter === "हाँ" || v.isSupporter === "Yes" || v.isSupporter === true || v.status === "In-Favor";
                const isOut = v.isOutside === "हाँ" || v.isOutside === "Yes" || v.isOutside === true;

                return (
                  <tr
                    key={v.id}
                    className={isSelected ? "selectedRow" : ""}
                    onClick={() => {
                      setSelectedVoter(v);
                      handleOpenVoterAction(v);
                    }}
                    title={lang === "hi" ? "मैसेज व एक्शन मेन्यू खोलने के लिए क्लिक करें" : "Click to open action menu"}
                  >
                    {/* 1. भाग संख्या */}
                    <td className="colPart">{v.booth}</td>

                    {/* 2. क्रम संख्या */}
                    <td className="colSerial">{v.serialNo !== undefined ? v.serialNo : idx + 1}</td>

                    {/* 3. नाम */}
                    <td className="colName" style={{ cursor: "pointer" }}>
                      <b style={{ color: "#0062cc" }}>{v.name}</b>
                    </td>

                    {/* 4. पिता/पति */}
                    <td className="colGuardian">{v.guardian || "—"}</td>

                    {/* 5. वोट डाला (1-click toggle) */}
                    <td className="colCenter" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleToggleField(v, "voted")}
                        style={{
                          border: isVoted ? "1px solid #86efac" : "1px solid #cbd5e1",
                          background: isVoted ? "#dcfce7" : "#f8fafc",
                          color: isVoted ? "#15803d" : "#64748b",
                          fontWeight: 700,
                          fontSize: "11px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        title={lang === "hi" ? "वोट स्थिति बदलें" : "Toggle Voted"}
                      >
                        {isVoted ? (lang === "hi" ? "✓ हाँ" : "✓ Yes") : (lang === "hi" ? "नहीं" : "No")}
                      </button>
                    </td>

                    {/* 6. सपोर्टर है (1-click toggle) */}
                    <td className="colCenter" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleToggleField(v, "isSupporter")}
                        style={{
                          border: isSupp ? "1px solid #fde68a" : "1px solid #cbd5e1",
                          background: isSupp ? "#fef3c7" : "#f8fafc",
                          color: isSupp ? "#b45309" : "#64748b",
                          fontWeight: 700,
                          fontSize: "11px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        title={lang === "hi" ? "समर्थक स्थिति बदलें" : "Toggle Supporter"}
                      >
                        {isSupp ? (lang === "hi" ? "★ हाँ" : "★ Yes") : (lang === "hi" ? "नहीं" : "No")}
                      </button>
                    </td>

                    {/* 7. बाहर है (1-click toggle) */}
                    <td className="colCenter" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleToggleField(v, "isOutside")}
                        style={{
                          border: isOut ? "1px solid #fca5a5" : "1px solid #cbd5e1",
                          background: isOut ? "#fee2e2" : "#f8fafc",
                          color: isOut ? "#b91c1c" : "#64748b",
                          fontWeight: 700,
                          fontSize: "11px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        title={lang === "hi" ? "बाहर/प्रवासी स्थिति बदलें" : "Toggle Outside"}
                      >
                        {isOut ? (lang === "hi" ? "🚌 हाँ" : "🚌 Yes") : (lang === "hi" ? "नहीं" : "No")}
                      </button>
                    </td>

                    {/* 8. मोबाइल नो */}
                    <td className="colPhone" onClick={(e) => e.stopPropagation()}>
                      {v.phone ? (
                        <a
                          href={`tel:${v.phone}`}
                          style={{
                            color: "#0284c7",
                            fontWeight: 600,
                            textDecoration: "none",
                            fontSize: "12px",
                          }}
                          title="कॉल करें"
                        >
                          📞 {v.phone}
                        </a>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>

                    {/* 9. हाउस No */}
                    <td className="colHouse">{v.house || "—"}</td>

                    {/* 10. एड्रेस */}
                    <td className="colAddress">{v.address || "—"}</td>

                    {/* 11. Booth Address */}
                    <td className="colBoothAddress">{v.boothAddress || "—"}</td>
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
              <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#475467", lineHeight: "1.5" }}>
                {t.fatherHusband}: <b>{selectedVoter.guardian || "—"}</b> • {t.houseNo}: <b>{selectedVoter.house || "—"}</b> • EPIC: <b>{selectedVoter.epic}</b>
                {selectedVoter.address ? <> • {lang === "hi" ? "पता" : "Address"}: <b>{selectedVoter.address}</b></> : null}
                {selectedVoter.boothAddress ? <> • 📍 {lang === "hi" ? "बूथ पता" : "Booth Address"}: <b style={{ color: "#0284c7" }}>{selectedVoter.boothAddress}</b></> : null}
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

          {/* 11 Fields Quick Toggles: वोट डाला | सपोर्टर है | बाहर है */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "6px 0" }}>
            <button
              type="button"
              onClick={() => handleToggleField(selectedVoter, "voted")}
              style={{
                background: (selectedVoter.voted === "हाँ" || selectedVoter.voted === "Yes" || selectedVoter.voted === true) ? "#15803d" : "#f1f5f9",
                color: (selectedVoter.voted === "हाँ" || selectedVoter.voted === "Yes" || selectedVoter.voted === true) ? "#ffffff" : "#475467",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "4px 9px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              🗳️ {lang === "hi" ? "वोट डाला:" : "Voted:"} {(selectedVoter.voted === "हाँ" || selectedVoter.voted === "Yes" || selectedVoter.voted === true) ? (lang === "hi" ? "हाँ ✓" : "Yes ✓") : (lang === "hi" ? "नहीं" : "No")}
            </button>

            <button
              type="button"
              onClick={() => handleToggleField(selectedVoter, "isSupporter")}
              style={{
                background: (selectedVoter.isSupporter === "हाँ" || selectedVoter.isSupporter === "Yes" || selectedVoter.isSupporter === true || selectedVoter.status === "In-Favor") ? "#d97706" : "#f1f5f9",
                color: (selectedVoter.isSupporter === "हाँ" || selectedVoter.isSupporter === "Yes" || selectedVoter.isSupporter === true || selectedVoter.status === "In-Favor") ? "#ffffff" : "#475467",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "4px 9px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              ⭐ {lang === "hi" ? "सपोर्टर है:" : "Supporter:"} {(selectedVoter.isSupporter === "हाँ" || selectedVoter.isSupporter === "Yes" || selectedVoter.isSupporter === true || selectedVoter.status === "In-Favor") ? (lang === "hi" ? "हाँ ★" : "Yes ★") : (lang === "hi" ? "नहीं" : "No")}
            </button>

            <button
              type="button"
              onClick={() => handleToggleField(selectedVoter, "isOutside")}
              style={{
                background: (selectedVoter.isOutside === "हाँ" || selectedVoter.isOutside === "Yes" || selectedVoter.isOutside === true) ? "#dc2626" : "#f1f5f9",
                color: (selectedVoter.isOutside === "हाँ" || selectedVoter.isOutside === "Yes" || selectedVoter.isOutside === true) ? "#ffffff" : "#475467",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "4px 9px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              🚌 {lang === "hi" ? "बाहर है:" : "Outside:"} {(selectedVoter.isOutside === "हाँ" || selectedVoter.isOutside === "Yes" || selectedVoter.isOutside === true) ? (lang === "hi" ? "हाँ (प्रवासी)" : "Yes") : (lang === "hi" ? "नहीं" : "No")}
            </button>
          </div>

          {/* Quick Status Buttons */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", margin: "6px 0" }}>
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
                  address: selectedVoter.address || "",
                  boothAddress: selectedVoter.boothAddress || "",
                  voted: String(selectedVoter.voted || "नहीं"),
                  isSupporter: String(selectedVoter.isSupporter || "हाँ"),
                  isOutside: String(selectedVoter.isOutside || "नहीं"),
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

      {/* 5. Modal: वोटर स्लिप के साथ मैसेज (Matching User Screenshot 1:1) */}
      {showSlipMsgModal && (
        <div
          className="bmSlipMsgModalOverlay noPrint"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSlipMsgModal(false);
          }}
        >
          <div className="bmSlipMsgBox">
            <h3 className="bmSlipMsgTitle">वोटर स्लिप के साथ मैसेज</h3>
            <input
              type="text"
              className="bmSlipMsgInput"
              value={tempSlipMsg}
              onChange={(e) => setTempSlipMsg(e.target.value)}
              placeholder='vote for "Candidate Name"'
              autoFocus
            />
            <div className="bmSlipMsgBtnRow">
              <button
                type="button"
                className="bmSlipMsgBtnCancel"
                onClick={() => setShowSlipMsgModal(false)}
              >
                कैंसिल
              </button>
              <button
                type="button"
                className="bmSlipMsgBtnSave"
                onClick={handleSaveSlipMsg}
              >
                सेव करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          1. NEW MODAL: मैसेज (VOTER ACTION POPUP - 100% 1:1 WITH IMAGE 1)
          ===================================================================== */}
      {activeActionVoter && (
        <div
          className="bmVoterActionOverlay noPrint"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveActionVoter(null);
          }}
        >
          <div className="bmVoterActionCard">
            <button
              className="bmVoterActionCloseBtn"
              onClick={() => setActiveActionVoter(null)}
              title="बंद करें"
            >
              ✕
            </button>

            <h3 className="bmVoterActionTitle">मैसेज</h3>

            {/* Mobile Number with Update Button */}
            <div className="bmPhoneRow">
              <input
                type="tel"
                className="bmVoterActionInput bmPhoneInput"
                value={activeVoterPhone}
                onChange={(e) => {
                  setActiveVoterPhone(e.target.value);
                  setPhoneUpdatedSuccess(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSavePhoneUpdate();
                }}
                placeholder="मोबाइल नंबर दर्ज करें"
              />
              <button
                type="button"
                className={`bmPhoneUpdateBtn ${phoneUpdatedSuccess ? "saved" : ""}`}
                onClick={handleSavePhoneUpdate}
                disabled={isPhoneUpdating}
                title="नंबर अपडेट करें और सभी जगह सिंक करें"
              >
                {isPhoneUpdating ? "..." : phoneUpdatedSuccess ? "✓ अपडेटेड" : (lang === "hi" ? "अपडेट" : "Update")}
              </button>
            </div>

            {/* Slip Message: editable per voter */}
            <input
              type="text"
              className="bmVoterActionInput"
              value={activeVoterSlipMsg}
              onChange={(e) => handleUpdateActionSlipMsg(e.target.value)}
              placeholder="स्लिप मैसेज"
            />

            {/* Wide Full-Width Blue Button: प्रिंट वोटर स्लिप */}
            <button
              type="button"
              className="bmBtnPrintWide"
              onClick={handleOpenPrintSlip}
            >
              प्रिंट वोटर स्लिप
            </button>

            {/* Row 2: मैसेज, कॉल, वोटर स्लिप */}
            <div className="bmBtnGrid3">
              <button
                type="button"
                className="bmActionPill bmBtnMessage"
                onClick={handleSendActionSMS}
              >
                मैसेज
              </button>
              <button
                type="button"
                className="bmActionPill bmBtnCall"
                onClick={handleCallAction}
              >
                कॉल
              </button>
              <button
                type="button"
                className="bmActionPill bmBtnVoterSlip"
                onClick={handleShareVoterSlip}
              >
                वोटर स्लिप
              </button>
            </div>

            {/* Row 3: फैमिली लिस्ट, व्हाट्सएप, सर्वे */}
            <div className="bmBtnGrid3">
              <button
                type="button"
                className="bmActionPill bmBtnFamily"
                onClick={handleFilterFamily}
              >
                फैमिली लिस्ट
              </button>
              <button
                type="button"
                className="bmActionPill bmBtnWhatsApp"
                onClick={handleOpenWhatsAppSlip}
              >
                व्हाट्सएप
              </button>
              <button
                type="button"
                className="bmActionPill bmBtnSurvey"
                onClick={handleOpenSurvey}
              >
                सर्वे
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. NEW SCREEN: PRINT VOTER SLIP (100% 1:1 WITH IMAGE 2)
          ===================================================================== */}
      {showPrintSlipScreen && activeActionVoter && (
        <div className="bmFullscreenModalOverlay noPrint">
          <div className="bmHeaderBlue">
            <button
              className="bmBackBtn"
              onClick={() => setShowPrintSlipScreen(false)}
              title="वापस जाएं"
            >
              ←
            </button>
            <h2 className="bmHeaderTitle">Print Voter Slip</h2>
          </div>

          <div className="bmScreenContent">
            {/* Printer Selector Card */}
            <div className="bmPrinterCard">
              <div className="bmPrinterLabel">Printer</div>
              <select
                className="bmPrinterSelect"
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
              >
                <option value="Select Printer">Select Printer</option>
                <option value="Thermal POS 58mm">Thermal POS 58mm (Bluetooth)</option>
                <option value="Thermal POS 80mm">Thermal POS 80mm (Bluetooth/USB)</option>
                <option value="System Default">System Default / Browser Print</option>
              </select>
            </div>

            {/* Add New Printer Link */}
            <a
              className="bmAddPrinterLink"
              onClick={() => {
                const p = prompt("नया प्रिंटर नाम या ब्लूटूथ डिवाइस का नाम दर्ज करें:", "Thermal Bluetooth Printer");
                if (p) {
                  setSelectedPrinter(p);
                  setLocalToast(`प्रिंटर सेट किया गया: ${p}`);
                  setTimeout(() => setLocalToast(""), 3000);
                }
              }}
            >
              Add New Printer
            </a>

            {/* Dotted Voter Slip Card */}
            <div className="bmDottedSlipCard">
              <div className="bmSlipRow">
                <span><b>क्रम सं : {activeActionVoter.serialNo || "—"}</b></span>
                <span><b>भाग सं : {activeActionVoter.booth || "—"}</b></span>
              </div>
              <div className="bmSlipField">
                <b>नाम : {activeActionVoter.name}</b>
              </div>
              <div className="bmSlipField">
                <b>पिता/पति : {activeActionVoter.guardian || "—"}</b>
              </div>
              <div className="bmSlipRow">
                <span><b>उम्र : {activeActionVoter.age || "—"}</b></span>
                <span><b>मकान नंबर : {activeActionVoter.house || "—"}</b></span>
              </div>
              <div className="bmSlipField">
                <b>वोटर ID : {activeActionVoter.epic}</b>
              </div>
              <div className="bmSlipField" style={{ marginTop: "4px" }}>
                <b>बुथ पता : {activeActionVoter.boothAddress || "184 - महात्मा गांधी राजकीय विद्यालय इंग्लिश मीडियम का कमरा नं. 2 चौरसियावास अजमेर"}</b>
              </div>
            </div>

            {/* Bottom Print Button */}
            <button
              type="button"
              className="bmBottomPrintBtn"
              onClick={() => {
                window.print();
              }}
            >
              Print
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. NEW SCREEN: वोटर स्लिप (WHATSAPP VIEW - 100% 1:1 WITH IMAGE 3)
          ===================================================================== */}
      {showWhatsAppSlipScreen && activeActionVoter && (
        <div className="bmFullscreenModalOverlay noPrint">
          <div className="bmHeaderBlue">
            <button
              className="bmBackBtn"
              onClick={() => setShowWhatsAppSlipScreen(false)}
              title="वापस जाएं"
            >
              ←
            </button>
            <h2 className="bmHeaderTitle">वोटर स्लिप</h2>
          </div>

          <div className="bmScreenContent">
            {/* Candidate Election Poster Graphic Banner */}
            <img
              src="/images/campaign-poster.jpg"
              alt="Campaign Poster"
              className="bmPosterImg"
            />

            {/* Custom campaign message text */}
            <div className="bmCustomMsgText">
              {activeVoterSlipMsg || `vote for ${candidate?.name || "bb"}`}
            </div>

            {/* Dotted Voter Slip Card */}
            <div className="bmDottedSlipCard">
              <div className="bmSlipRow">
                <span><b>क्रम सं :</b> {activeActionVoter.serialNo || "—"}</span>
                <span><b>भाग सं :</b> {activeActionVoter.booth || "—"}</span>
              </div>
              <div className="bmSlipField">
                <span><b>नाम :</b> {activeActionVoter.name}</span>
              </div>
              <div className="bmSlipField">
                <span><b>पिता/पति :</b> {activeActionVoter.guardian || "—"}</span>
              </div>
              <div className="bmSlipField">
                <span><b>वोटर ID :</b> {activeActionVoter.epic}</span>
              </div>
              <div className="bmSlipRow">
                <span><b>उम्र :</b> {activeActionVoter.age || "—"}</span>
                <span><b>मकान नंबर :</b> {activeActionVoter.house || "—"}</span>
              </div>
              <div className="bmSlipField" style={{ marginTop: "4px" }}>
                <span><b>बुथ पता :</b> {activeActionVoter.boothAddress || "184 - महात्मा गांधी राजकीय विद्यालय इंग्लिश मीडियम का कमरा नं. 2 चौरसियावास अजमेर"}</span>
              </div>
            </div>

            {/* Full width green Send button */}
            <button
              type="button"
              className="bmGreenSendBtn"
              onClick={() => {
                const ph = (activeVoterPhone || activeActionVoter.phone || "").replace(/[^0-9]/g, "");
                const text = `*वोटर स्लिप / VOTER SLIP*
${activeVoterSlipMsg || "vote for " + (candidate?.name || "bb")}

*क्रम सं :* ${activeActionVoter.serialNo || "—"}     *भाग सं :* ${activeActionVoter.booth}
*नाम :* ${activeActionVoter.name}
*पिता/पति :* ${activeActionVoter.guardian || "—"}
*वोटर ID :* ${activeActionVoter.epic}
*उम्र :* ${activeActionVoter.age || "—"}     *मकान नंबर :* ${activeActionVoter.house || "—"}
*बुथ पता :* ${activeActionVoter.boothAddress || "184 - महात्मा गांधी राजकीय विद्यालय इंग्लिश मीडियम का कमरा नं. 2 चौरसियावास अजमेर"}`;

                if (ph) {
                  const cleanPh = ph.length === 10 ? `91${ph}` : ph;
                  window.open(`https://wa.me/${cleanPh}?text=${encodeURIComponent(text)}`, "_blank");
                } else {
                  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
                }
              }}
            >
              Send <span style={{ fontSize: "19px" }}>➤</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. NEW SCREEN: सर्वे फॉर्म (100% 1:1 WITH IMAGES 4 & 5)
          ===================================================================== */}
      {showSurveyScreen && activeActionVoter && (
        <div className="bmFullscreenModalOverlay noPrint">
          <div className="bmHeaderBlue">
            <button
              className="bmBackBtn"
              onClick={() => setShowSurveyScreen(false)}
              title="वापस जाएं"
            >
              ←
            </button>
            <h2 className="bmHeaderTitle">सर्वे फॉर्म</h2>
          </div>

          <div className="bmScreenContent">
            {/* Voter Header Badge */}
            <div style={{ background: "#e0f2fe", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", color: "#0369a1", fontSize: "14px", fontWeight: 600 }}>
              👤 <b>{activeActionVoter.name}</b> (भाग सं: {activeActionVoter.booth}, क्र सं: {activeActionVoter.serialNo || "—"}, मकान: {activeActionVoter.house || "—"})
            </div>

            {/* 1. समर्थक */}
            <div className="bmSurveyFormGroup">
              <label className="bmSurveyFormLabel">समर्थक</label>
              <select
                className="bmSurveySelectInput"
                value={surveyFormData.supporter || ""}
                onChange={(e) => setSurveyFormData({ ...surveyFormData, supporter: e.target.value })}
              >
                <option value="">-- चुनें--</option>
                <option value="हाँ">हाँ</option>
                <option value="नहीं">नहीं</option>
                <option value="संशयित">संशयित</option>
                <option value="तटस्थ">तटस्थ</option>
              </select>
            </div>

            {/* 2. जाति */}
            <div className="bmSurveyFormGroup">
              <label className="bmSurveyFormLabel">जाति</label>
              <select
                className="bmSurveySelectInput"
                value={surveyFormData.casteCategory || ""}
                onChange={(e) => setSurveyFormData({ ...surveyFormData, casteCategory: e.target.value })}
              >
                <option value="">-- चुनें --</option>
                <option value="सामान्य">सामान्य</option>
                <option value="ओबीसी">ओबीसी</option>
                <option value="एससी">एससी</option>
                <option value="एसटी">एसटी</option>
                <option value="अल्पसंख्यक">अल्पसंख्यक</option>
                <option value="अन्य">अन्य</option>
              </select>

              <select
                className="bmSurveySelectInput"
                value={surveyFormData.casteSub || ""}
                onChange={(e) => setSurveyFormData({ ...surveyFormData, casteSub: e.target.value })}
              >
                <option value="">-- जाति चुनें --</option>
                <option value="ब्राह्मण">ब्राह्मण</option>
                <option value="राजपूत">राजपूत</option>
                <option value="जाट">जाट</option>
                <option value="गुर्जर">गुर्जर</option>
                <option value="सैनी">सैनी</option>
                <option value="माली">माली</option>
                <option value="मीणा">मीणा</option>
                <option value="बैरवा">बैरवा</option>
                <option value="मुस्लिम">मुस्लिम</option>
                <option value="जैन">जैन</option>
                <option value="अग्रवाल">अग्रवाल</option>
                <option value="कुमावत">कुमावत</option>
                <option value="प्रजापत">प्रजापत</option>
                <option value="यादव">यादव</option>
                <option value="जांगिड़">जांगिड़</option>
                <option value="सोनी">सोनी</option>
                <option value="रैगर">रैगर</option>
                <option value="मेघवाल">मेघवाल</option>
                <option value="अन्य">अन्य</option>
              </select>

              <div style={{ marginTop: "4px" }}>
                <label style={{ fontSize: "13.5px", color: "#334155", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                  जाति लिखें
                </label>
                <input
                  type="text"
                  className="bmSurveyTextInput"
                  placeholder="जाति"
                  value={surveyFormData.casteCustom || ""}
                  onChange={(e) => setSurveyFormData({ ...surveyFormData, casteCustom: e.target.value })}
                />
              </div>
            </div>

            {/* 3. व्हाट्सएप नं */}
            <div className="bmSurveyFormGroup">
              <label className="bmSurveyFormLabel">व्हाट्सएप नं</label>
              <input
                type="tel"
                className="bmSurveyTextInput"
                placeholder="Type..."
                value={surveyFormData.whatsapp || ""}
                onChange={(e) => setSurveyFormData({ ...surveyFormData, whatsapp: e.target.value })}
              />
            </div>

            {/* 4. शिक्षा */}
            <div className="bmSurveyFormGroup">
              <label className="bmSurveyFormLabel">शिक्षा</label>
              <select
                className="bmSurveySelectInput"
                value={surveyFormData.education || ""}
                onChange={(e) => setSurveyFormData({ ...surveyFormData, education: e.target.value })}
              >
                <option value="">-- चुनें --</option>
                <option value="अनपढ़">अनपढ़</option>
                <option value="5वीं">5वीं</option>
                <option value="8वीं">8वीं</option>
                <option value="10वीं">10वीं</option>
                <option value="12वीं">12वीं</option>
                <option value="स्नातक">स्नातक</option>
                <option value="परास्नातक">परास्नातक</option>
                <option value="डिप्लोमा">डिप्लोमा</option>
                <option value="अन्य">अन्य</option>
              </select>
            </div>

            {/* 5. आजीविका */}
            <div className="bmSurveyFormGroup">
              <label className="bmSurveyFormLabel">आजीविका</label>
              <select
                className="bmSurveySelectInput"
                value={surveyFormData.livelihood || ""}
                onChange={(e) => setSurveyFormData({ ...surveyFormData, livelihood: e.target.value })}
              >
                <option value="">-- चुनें --</option>
                <option value="सरकारी सेवा">सरकारी सेवा</option>
                <option value="निजी सेवा">निजी सेवा</option>
                <option value="व्यापार">व्यापार</option>
                <option value="मजदूरी">मजदूरी</option>
                <option value="कृषि">कृषि</option>
                <option value="गृहणी">गृहणी</option>
                <option value="छात्र">छात्र</option>
                <option value="बेरोजगार">बेरोजगार</option>
                <option value="अन्य">अन्य</option>
              </select>
              <input
                type="text"
                className="bmSurveyTextInput"
                placeholder="आजीविका विवरण"
                value={surveyFormData.livelihoodDetail || ""}
                onChange={(e) => setSurveyFormData({ ...surveyFormData, livelihoodDetail: e.target.value })}
              />
            </div>

            {/* 6. बाहरी पता */}
            <div className="bmSurveyFormGroup">
              <label className="bmSurveyFormLabel">बाहरी पता</label>
              <div className="bmOutsideBox">
                <label className="bmOutsideInnerLabel">राज्य</label>
                <select
                  className="bmSurveySelectInput"
                  value={surveyFormData.outsideState || "Andaman and Nicobar Islands"}
                  onChange={(e) => setSurveyFormData({ ...surveyFormData, outsideState: e.target.value })}
                >
                  {indianStates.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>

                <label className="bmOutsideInnerLabel" style={{ marginTop: "6px" }}>जिला</label>
                <select
                  className="bmSurveySelectInput"
                  value={surveyFormData.outsideDistrict || "-Select-"}
                  onChange={(e) => setSurveyFormData({ ...surveyFormData, outsideDistrict: e.target.value })}
                >
                  <option value="-Select-">-Select-</option>
                  {rajasthanDistricts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <label className="bmOutsideInnerLabel" style={{ marginTop: "6px" }}>पता</label>
                <input
                  type="text"
                  className="bmSurveyTextInput"
                  placeholder="पता"
                  value={surveyFormData.outsideAddress || ""}
                  onChange={(e) => setSurveyFormData({ ...surveyFormData, outsideAddress: e.target.value })}
                />
              </div>
            </div>

            {/* 7. पदाधिकारी */}
            <div className="bmSurveyFormGroup">
              <label className="bmSurveyFormLabel">पदाधिकारी</label>
              <select
                className="bmSurveySelectInput"
                value={surveyFormData.officeBearer || ""}
                onChange={(e) => setSurveyFormData({ ...surveyFormData, officeBearer: e.target.value })}
              >
                <option value="">-- चुनें --</option>
                <option value="हाँ">हाँ</option>
                <option value="नहीं">नहीं</option>
                <option value="अध्यक्ष">अध्यक्ष</option>
                <option value="उपाध्यक्ष">उपाध्यक्ष</option>
                <option value="महामंत्री">महामंत्री</option>
                <option value="सचिव">सचिव</option>
                <option value="कोषाध्यक्ष">कोषाध्यक्ष</option>
                <option value="बूथ अध्यक्ष">बूथ अध्यक्ष</option>
                <option value="पन्ना प्रमुख">पन्ना प्रमुख</option>
                <option value="वार्ड प्रमुख">वार्ड प्रमुख</option>
                <option value="सदस्य">सदस्य</option>
                <option value="अन्य">अन्य</option>
              </select>
            </div>

            {/* 8. अन्य विवरण */}
            <div className="bmSurveyFormGroup">
              <label className="bmSurveyFormLabel">अन्य विवरण</label>
              <input
                type="text"
                className="bmSurveyTextInput"
                placeholder="विवरण 1"
                value={surveyFormData.detail1 || ""}
                onChange={(e) => setSurveyFormData({ ...surveyFormData, detail1: e.target.value })}
              />
              <input
                type="text"
                className="bmSurveyTextInput"
                placeholder="विवरण 2"
                value={surveyFormData.detail2 || ""}
                onChange={(e) => setSurveyFormData({ ...surveyFormData, detail2: e.target.value })}
              />
            </div>

            {/* सबमिट बटन */}
            <button
              type="button"
              className="bmSubmitBlueBtn"
              onClick={handleSubmitSurvey}
            >
              सबमिट
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
                  {activeVoterForSlip.address && (
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>{lang === "hi" ? "पता / वार्ड" : "Address / Ward"}</span>
                      <b>{activeVoterForSlip.address}</b>
                    </div>
                  )}
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
                  borderBottom: updateTab === "sync" ? "3px solid #026aa7" : "3px solid transparent",
                  background: updateTab === "sync" ? "#ffffff" : "transparent",
                  fontWeight: updateTab === "sync" ? 700 : 500,
                  color: updateTab === "sync" ? "#026aa7" : "#64748b",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
                onClick={() => setUpdateTab("sync")}
              >
                🔄 {lang === "hi" ? "लाइव सिंक" : "Live Sync"}
              </button>
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
                  fontSize: "13px",
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
                  fontSize: "13px",
                }}
                onClick={() => setUpdateTab("upload")}
              >
                📁 {t.quickUploadExcel}
              </button>
            </div>

            <div className="modalBody">
              {updateTab === "sync" ? (
                <div style={{ padding: "6px 0" }}>
                  <div
                    style={{
                      background: "linear-gradient(135deg, #f0fdf4 0%, #f0f9ff 100%)",
                      border: "1.5px solid #86efac",
                      borderRadius: "14px",
                      padding: "20px 16px",
                      textAlign: "center",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#15803d",
                        color: "#ffffff",
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 800,
                        marginBottom: "12px",
                      }}
                    >
                      <span
                        style={{
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: "#4ade80",
                          boxShadow: "0 0 6px #4ade80",
                          display: "inline-block",
                        }}
                      />
                      {onlineWorkersCount > 1 ? `${onlineWorkersCount} मोबाइल्स लाइव कनेक्टेड` : "15 मोबाइल्स लाइव सिंक सक्रिय"}
                    </div>

                    <h4 style={{ margin: "0 0 8px", fontSize: "16px", color: "#065f46" }}>
                      {lang === "hi" ? "प्री-अपलोड डेटा रिफ्रेश व रियल-टाइम सिंक" : "Pre-Uploaded Data Refresh & Live Sync"}
                    </h4>

                    <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#334155", lineHeight: 1.5 }}>
                      {lang === "hi"
                        ? "जैसे ही आप या वार्ड के 15 कार्यकर्ताओं में से कोई भी किसी भी मोबाइल से 'वोट डाला', 'सपोर्टर है' या कोई भी डेटा अपडेट करेगा, वह तुरंत सभी 15 मोबाइल्स पर लाइव दिखेगा।"
                        : "Any update made on any of the 15 mobile devices in the ward instantly synchronizes across all devices."}
                    </p>

                    <button
                      type="button"
                      className="primary"
                      onClick={() => onRefreshData(true)}
                      disabled={isSyncing}
                      style={{
                        width: "100%",
                        padding: "13px",
                        fontSize: "14px",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #059669 0%, #0284c7 100%)",
                        boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
                        color: "#ffffff",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <RefreshCw size={17} style={{ animation: isSyncing ? "spin 1s linear infinite" : "none" }} />
                      <span>{isSyncing ? "डेटा रिफ्रेश हो रहा है..." : (lang === "hi" ? "🔄 अभी डेटा तुरंत रिफ्रेश करें" : "Refresh Pre-Uploaded Data")}</span>
                    </button>

                    <div style={{ marginTop: "12px", fontSize: "12px", color: "#64748b" }}>
                      कुल मतदाता: <b>{voters.length}</b> | लाइव स्थिति: <b style={{ color: "#16a34a" }}>सक्रिय 🟢</b>
                    </div>
                  </div>

                  <div className="modalFoot" style={{ marginTop: "10px" }}>
                    <button type="button" className="outline" onClick={() => setShowUpdateModal(false)}>
                      ✕ {lang === "hi" ? "बंद करें" : "Close"}
                    </button>
                    <button type="button" className="primary" onClick={() => setUpdateTab("add")}>
                      + {lang === "hi" ? "नया मतदाता जोड़ें" : "Add Voter"}
                    </button>
                  </div>
                </div>
              ) : updateTab === "add" ? (
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

                  <div className="inputGrid">
                    <div className="formGroup">
                      <label>🏠 {lang === "hi" ? "एड्रेस (मोहल्ला / कॉलोनी)" : "Address / Locality"}</label>
                      <input
                        value={voterForm.address}
                        onChange={(e) => setVoterForm({ ...voterForm, address: e.target.value })}
                        placeholder={lang === "hi" ? "उदा: वार्ड 34, स्टेशन रोड" : "e.g. Ward 34, Station Road"}
                      />
                    </div>
                    <div className="formGroup">
                      <label>📍 {lang === "hi" ? "Booth Address (बूथ पता)" : "Booth Address"}</label>
                      <input
                        value={voterForm.boothAddress}
                        onChange={(e) => setVoterForm({ ...voterForm, boothAddress: e.target.value })}
                        placeholder={lang === "hi" ? "उदा: रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1" : "e.g. Govt School, Room 1"}
                      />
                    </div>
                  </div>

                  <div className="inputGrid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                    <div className="formGroup">
                      <label>🗳️ {lang === "hi" ? "वोट डाला" : "Voted"}</label>
                      <select
                        value={voterForm.voted}
                        onChange={(e) => setVoterForm({ ...voterForm, voted: e.target.value })}
                      >
                        <option value="नहीं">{lang === "hi" ? "नहीं" : "No"}</option>
                        <option value="हाँ">{lang === "hi" ? "हाँ" : "Yes"}</option>
                      </select>
                    </div>
                    <div className="formGroup">
                      <label>⭐ {lang === "hi" ? "सपोर्टर है" : "Supporter"}</label>
                      <select
                        value={voterForm.isSupporter}
                        onChange={(e) => setVoterForm({ ...voterForm, isSupporter: e.target.value })}
                      >
                        <option value="हाँ">{lang === "hi" ? "हाँ (समर्थक)" : "Yes (Supporter)"}</option>
                        <option value="नहीं">{lang === "hi" ? "नहीं" : "No"}</option>
                      </select>
                    </div>
                    <div className="formGroup">
                      <label>🚌 {lang === "hi" ? "बाहर है" : "Is Outside"}</label>
                      <select
                        value={voterForm.isOutside}
                        onChange={(e) => setVoterForm({ ...voterForm, isOutside: e.target.value })}
                      >
                        <option value="नहीं">{lang === "hi" ? "नहीं (स्थानीय)" : "No (Local)"}</option>
                        <option value="हाँ">{lang === "hi" ? "हाँ (प्रवासी)" : "Yes (Outside)"}</option>
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
    address: "",
    boothAddress: "",
    booth: "1",
    serialNo: "",
    phone: "",
    voted: "नहीं",
    isSupporter: "हाँ",
    isOutside: "नहीं",
    status: "Pending" as VoterRecord["status"],
  });

  // Advanced Search states
  const [showAdv, setShowAdv] = useState(false);
  const [advName, setAdvName] = useState("");
  const [advFather, setAdvFather] = useState("");
  const [advAddress, setAdvAddress] = useState("");
  const [advEpic, setAdvEpic] = useState("");
  const activeAdvCount =
    (advName.trim() ? 1 : 0) +
    (advFather.trim() ? 1 : 0) +
    (advAddress.trim() ? 1 : 0) +
    (advEpic.trim() ? 1 : 0);

  const booths = useMemo(() => {
    const set = new Set<string>();
    voters.forEach((v) => set.add(v.booth));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [voters]);

  const filtered = useMemo(() => {
    return voters.filter((v) => {
      if (boothFilter !== "ALL" && v.booth !== boothFilter) return false;
      if (statusFilter !== "ALL" && v.status.toLowerCase() !== statusFilter.toLowerCase()) return false;

      // 1. Voter Name
      if (advName.trim() && !singleFieldMatches(v.name, advName)) return false;

      // 2. Father / Husband
      if (advFather.trim() && (!v.guardian || !singleFieldMatches(v.guardian, advFather))) return false;

      // 3. Address / House
      if (advAddress.trim()) {
        const matchHouse = v.house && singleFieldMatches(v.house, advAddress);
        const matchAddr = v.address && singleFieldMatches(v.address, advAddress);
        const matchBoothAddr = v.boothAddress && singleFieldMatches(v.boothAddress, advAddress);
        if (!matchHouse && !matchAddr && !matchBoothAddr) return false;
      }

      // 4. EPIC
      if (advEpic.trim() && (!v.epic || !singleFieldMatches(v.epic, advEpic))) return false;

      if (q.trim()) {
        return matchesVoter(v, q);
      }
      return true;
    });
  }, [voters, boothFilter, statusFilter, q, advName, advFather, advAddress, advEpic]);

  const handleAddVoter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoter.name.trim()) return;

    const boothVal = newVoter.booth.trim() || "1";
    const serialVal = newVoter.serialNo ? Number(newVoter.serialNo) : undefined;
    const epicVal = newVoter.epic.trim().toUpperCase() ||
      `RJX${boothVal.padStart(2, "0")}${String(serialVal || Math.floor(1000 + Math.random() * 9000)).padStart(5, "0")}`;

    const payload = {
      ...newVoter,
      name: newVoter.name.trim(),
      guardian: newVoter.guardian.trim(),
      epic: epicVal,
      booth: boothVal,
      serialNo: serialVal,
      house: newVoter.house.trim(),
      address: newVoter.address.trim(),
      boothAddress: newVoter.boothAddress.trim(),
      phone: newVoter.phone.trim(),
      worker: "Unassigned",
      candidateId,
    };
    store.addVoter(payload);

    fetch("/api/voters/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId, newVoter: payload }),
    }).catch(() => {});

    setShowAddModal(false);
    setNewVoter({
      name: "",
      epic: "",
      guardian: "",
      age: "35",
      gender: "Male",
      house: "",
      address: "",
      boothAddress: "",
      booth: "1",
      serialNo: "",
      phone: "",
      voted: "नहीं",
      isSupporter: "हाँ",
      isOutside: "नहीं",
      status: "Pending",
    });
    onUpdate();
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = [
      "भाग संख्या",
      "क्रम संख्या",
      "नाम",
      "पिता/पति",
      "वोट डाला",
      "सपोर्टर है",
      "बाहर है",
      "मोबाइल नो",
      "हाउस No",
      "एड्रेस",
      "Booth Address",
      "पहचान पत्र (EPIC)",
      "आयु",
      "लिंग",
      "कार्यकर्ता",
      "स्थिति"
    ];
    const rows = filtered.map((v, idx) => [
      v.booth,
      v.serialNo !== undefined ? v.serialNo : (idx + 1),
      `"${(v.name || "").replace(/"/g, '""')}"`,
      `"${(v.guardian || "").replace(/"/g, '""')}"`,
      `"${v.voted === "हाँ" || v.voted === "Yes" || v.voted === true ? "हाँ" : "नहीं"}"`,
      `"${v.isSupporter === "हाँ" || v.isSupporter === "Yes" || v.isSupporter === true || v.status === "In-Favor" ? "हाँ" : "नहीं"}"`,
      `"${v.isOutside === "हाँ" || v.isOutside === "Yes" || v.isOutside === true ? "हाँ" : "नहीं"}"`,
      `"${(v.phone || "").replace(/"/g, '""')}"`,
      `"${(v.house || "").replace(/"/g, '""')}"`,
      `"${(v.address || "").replace(/"/g, '""')}"`,
      `"${(v.boothAddress || "").replace(/"/g, '""')}"`,
      `"${(v.epic || "").replace(/"/g, '""')}"`,
      v.age || "",
      v.gender || "",
      `"${(v.worker || "").replace(/"/g, '""')}"`,
      v.status || "Pending",
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `VoterDesk_Voters_${candidateId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Title
        tag="VOTER DATABASE"
        title="Voter Registry"
        sub={`Total ${filtered.length} voters match your filters.`}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="outline" onClick={downloadSampleExcelTemplate} title="11 कॉलम वाला एक्सेल टेम्पलेट डाउनलोड करें">
            <Download size={16} /> Download Template (.xlsx)
          </button>
          <button className="outline" onClick={handleExportCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button className="primary" onClick={() => setShowAddModal(true)}>
            <Plus /> Add Single Voter
          </button>
        </div>
      </Title>

      <Panel>
        <div className="tableTools" style={{ flexWrap: "wrap", gap: "8px" }}>
          <div style={{ flex: "1 1 220px", display: "flex", alignItems: "center" }}>
            <Search />
            <input
              placeholder="Search name, surname, father/husband, address or EPIC (खोजें)..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Advanced Search button in VotersTable */}
          <button
            type="button"
            onClick={() => setShowAdv((prev) => !prev)}
            style={{
              height: "42px",
              padding: "0 12px",
              borderRadius: "9px",
              border: showAdv || activeAdvCount > 0 ? "1.5px solid #0284c7" : "1px solid #d8dde5",
              background: showAdv || activeAdvCount > 0 ? "#e0f2fe" : "#ffffff",
              color: showAdv || activeAdvCount > 0 ? "#0369a1" : "#475467",
              fontSize: "13px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <SlidersHorizontal size={15} />
            <span>Adv Search</span>
            {activeAdvCount > 0 && (
              <span
                style={{
                  background: "#0284c7",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 800,
                  borderRadius: "50%",
                  width: "18px",
                  height: "18px",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {activeAdvCount}
              </span>
            )}
          </button>

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

        {/* Collapsible 4-column Advanced Search in VotersTable */}
        {showAdv && (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #bae6fd",
              borderRadius: "10px",
              padding: "12px 14px",
              margin: "0 0 16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <SlidersHorizontal size={14} color="#0284c7" />
                <b style={{ fontSize: "12.5px", color: "#0f172a" }}>
                  Advanced Multi-Column Filter (नाम, पिता, पता, EPIC अलग-अलग)
                </b>
              </div>
              {activeAdvCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAdvName("");
                    setAdvFather("");
                    setAdvAddress("");
                    setAdvEpic("");
                  }}
                  style={{
                    border: 0,
                    background: "#fee2e2",
                    color: "#b91c1c",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  Clear All
                </button>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "10px",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>
                  👤 Voter Name (उदा: Gau, Gaurav)
                </label>
                <input
                  type="text"
                  value={advName}
                  onChange={(e) => setAdvName(e.target.value)}
                  placeholder="e.g. Gau, Gaurav..."
                  style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>
                  👨‍👧 Father / Husband (उदा: San, Santosh)
                </label>
                <input
                  type="text"
                  value={advFather}
                  onChange={(e) => setAdvFather(e.target.value)}
                  placeholder="e.g. San, Santosh..."
                  style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>
                  🏠 Address / House (उदा: 12, 64)
                </label>
                <input
                  type="text"
                  value={advAddress}
                  onChange={(e) => setAdvAddress(e.target.value)}
                  placeholder="e.g. 12, 64..."
                  style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>
                  🆔 EPIC Number (उदा: RJX..., 1001025)
                </label>
                <input
                  type="text"
                  value={advEpic}
                  onChange={(e) => setAdvEpic(e.target.value)}
                  placeholder="e.g. RJX..., 1001025..."
                  style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="tableWrap" style={{ overflowX: "auto" }}>
          <table style={{ minWidth: "1150px" }}>
            <thead>
              <tr>
                <th style={{ width: "65px" }}>भाग संख्या</th>
                <th style={{ width: "65px" }}>क्रम संख्या</th>
                <th style={{ minWidth: "130px" }}>नाम</th>
                <th style={{ minWidth: "130px" }}>पिता/पति</th>
                <th style={{ minWidth: "85px" }}>वोट डाला</th>
                <th style={{ minWidth: "85px" }}>सपोर्टर है</th>
                <th style={{ minWidth: "85px" }}>बाहर है</th>
                <th style={{ minWidth: "115px" }}>मोबाइल नो</th>
                <th style={{ width: "75px" }}>हाउस No</th>
                <th style={{ minWidth: "140px" }}>एड्रेस</th>
                <th style={{ minWidth: "160px" }}>Booth Address</th>
                <th style={{ width: "110px" }}>EPIC</th>
                <th style={{ width: "50px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, idx) => {
                const isVoted = v.voted === "हाँ" || v.voted === "Yes" || v.voted === true;
                const isSupp = v.isSupporter === "हाँ" || v.isSupporter === "Yes" || v.isSupporter === true || v.status === "In-Favor";
                const isOut = v.isOutside === "हाँ" || v.isOutside === "Yes" || v.isOutside === true;

                return (
                  <tr key={v.id}>
                    {/* 1. भाग संख्या */}
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{v.booth}</td>

                    {/* 2. क्रम संख्या */}
                    <td style={{ textAlign: "center", fontWeight: 700 }}>{v.serialNo !== undefined ? v.serialNo : idx + 1}</td>

                    {/* 3. नाम */}
                    <td>
                      <b style={{ color: "#0f172a" }}>{v.name}</b>
                    </td>

                    {/* 4. पिता/पति */}
                    <td>{v.guardian || "—"}</td>

                    {/* 5. वोट डाला */}
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const newVal = isVoted ? "नहीं" : "हाँ";
                          store.updateVoter(v.id, { voted: newVal });
                          fetch("/api/voters/sync", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ candidateId, voterId: v.id, updates: { voted: newVal } }),
                          }).catch(() => {});
                          onUpdate();
                        }}
                        style={{
                          border: isVoted ? "1px solid #86efac" : "1px solid #cbd5e1",
                          background: isVoted ? "#dcfce7" : "#f8fafc",
                          color: isVoted ? "#15803d" : "#64748b",
                          fontWeight: 700,
                          fontSize: "11px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        title="वोट स्थिति बदलें"
                      >
                        {isVoted ? "✓ हाँ" : "नहीं"}
                      </button>
                    </td>

                    {/* 6. सपोर्टर है */}
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const newVal = isSupp ? "नहीं" : "हाँ";
                          const updates = {
                            isSupporter: newVal,
                            status: newVal === "हाँ" ? "In-Favor" : ("Pending" as VoterRecord["status"]),
                          };
                          store.updateVoter(v.id, updates);
                          fetch("/api/voters/sync", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ candidateId, voterId: v.id, updates }),
                          }).catch(() => {});
                          onUpdate();
                        }}
                        style={{
                          border: isSupp ? "1px solid #fde68a" : "1px solid #cbd5e1",
                          background: isSupp ? "#fef3c7" : "#f8fafc",
                          color: isSupp ? "#b45309" : "#64748b",
                          fontWeight: 700,
                          fontSize: "11px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        title="समर्थक स्थिति बदलें"
                      >
                        {isSupp ? "★ हाँ" : "नहीं"}
                      </button>
                    </td>

                    {/* 7. बाहर है */}
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const newVal = isOut ? "नहीं" : "हाँ";
                          store.updateVoter(v.id, { isOutside: newVal });
                          fetch("/api/voters/sync", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ candidateId, voterId: v.id, updates: { isOutside: newVal } }),
                          }).catch(() => {});
                          onUpdate();
                        }}
                        style={{
                          border: isOut ? "1px solid #fca5a5" : "1px solid #cbd5e1",
                          background: isOut ? "#fee2e2" : "#f8fafc",
                          color: isOut ? "#b91c1c" : "#64748b",
                          fontWeight: 700,
                          fontSize: "11px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        title="बाहर/प्रवासी स्थिति बदलें"
                      >
                        {isOut ? "🚌 हाँ" : "नहीं"}
                      </button>
                    </td>

                    {/* 8. मोबाइल नो */}
                    <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      {v.phone ? (
                        <a
                          href={`tel:${v.phone}`}
                          style={{
                            color: "#0284c7",
                            fontWeight: 600,
                            textDecoration: "none",
                            fontSize: "12px",
                          }}
                          title="कॉल करें"
                        >
                          📞 {v.phone}
                        </a>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>

                    {/* 9. हाउस No */}
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{v.house || "—"}</td>

                    {/* 10. एड्रेस */}
                    <td style={{ fontSize: "12px", color: "#334155" }}>{v.address || "—"}</td>

                    {/* 11. Booth Address */}
                    <td style={{ fontSize: "12px", color: "#0369a1" }}>{v.boothAddress || "—"}</td>

                    {/* Optional: EPIC */}
                    <td>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--blue)" }}>{v.epic}</span>
                    </td>

                    {/* Delete Action */}
                    <td style={{ textAlign: "center" }}>
                      <button
                        style={{ border: 0, background: "transparent", color: "#d83b3b", padding: "4px", cursor: "pointer" }}
                        title="Delete record"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete voter ${v.name}?`)) {
                            store.deleteVoter(v.id);
                            fetch(`/api/voters/${v.id}?candidateId=${candidateId}`, { method: "DELETE" }).catch(() => {});
                            onUpdate();
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={13} style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>
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
                  <label>Booth / Part Number * (भाग संख्या)</label>
                  <input
                    required
                    placeholder="e.g. 1"
                    value={newVoter.booth}
                    onChange={(e) => setNewVoter({ ...newVoter, booth: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>Serial Number (क्रम संख्या)</label>
                  <input
                    type="number"
                    placeholder="e.g. 2"
                    value={newVoter.serialNo}
                    onChange={(e) => setNewVoter({ ...newVoter, serialNo: e.target.value })}
                  />
                </div>
              </div>

              <div className="inputGrid">
                <div className="formGroup">
                  <label>House No. (हाउस No)</label>
                  <input
                    placeholder="e.g. 42-A"
                    value={newVoter.house}
                    onChange={(e) => setNewVoter({ ...newVoter, house: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>Mobile Number (मोबाइल नो)</label>
                  <input
                    placeholder="e.g. 9829012345"
                    value={newVoter.phone}
                    onChange={(e) => setNewVoter({ ...newVoter, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="inputGrid">
                <div className="formGroup">
                  <label>Address / Ward (एड्रेस)</label>
                  <input
                    placeholder="e.g. Ward 34, Station Road"
                    value={newVoter.address}
                    onChange={(e) => setNewVoter({ ...newVoter, address: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>Booth Address (मतदान केंद्र पता)</label>
                  <input
                    placeholder="e.g. Govt School Room 1"
                    value={newVoter.boothAddress}
                    onChange={(e) => setNewVoter({ ...newVoter, boothAddress: e.target.value })}
                  />
                </div>
              </div>

              <div className="inputGrid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <div className="formGroup">
                  <label>🗳️ वोट डाला (Voted)</label>
                  <select
                    value={newVoter.voted}
                    onChange={(e) => setNewVoter({ ...newVoter, voted: e.target.value })}
                  >
                    <option value="नहीं">नहीं (No)</option>
                    <option value="हाँ">हाँ (Yes)</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>⭐ सपोर्टर है (Supporter)</label>
                  <select
                    value={newVoter.isSupporter}
                    onChange={(e) => setNewVoter({ ...newVoter, isSupporter: e.target.value })}
                  >
                    <option value="हाँ">हाँ (Yes)</option>
                    <option value="नहीं">नहीं (No)</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>🚌 बाहर है (Is Outside)</label>
                  <select
                    value={newVoter.isOutside}
                    onChange={(e) => setNewVoter({ ...newVoter, isOutside: e.target.value })}
                  >
                    <option value="नहीं">नहीं (No)</option>
                    <option value="हाँ">हाँ (Yes)</option>
                  </select>
                </div>
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

    parsedData.rows.forEach((row, idx) => {
      const name = String(row[fieldMap.name] || "").trim();
      const booth = String(row[fieldMap.booth] || "1").trim();
      const serialVal = row[fieldMap.serialNo] || (idx + 1);
      let epic = String(row[fieldMap.epic] || "").trim().toUpperCase();
      if (!epic && name) {
        epic = `RJX${booth.padStart(2, "0")}${String(serialVal).padStart(5, "0")}`;
      }

      if (!name) {
        warnings++;
      } else if (epicSet.has(epic)) {
        duplicates++;
      } else {
        epicSet.add(epic);
        valid++;
      }
    });

    setImportStats({ valid, warnings, duplicates });
    setStep(3);
  };

  const handleExecuteImport = () => {
    if (!parsedData) return;

    const votersToImport = parsedData.rows.map((row, idx) => {
      const name = String(row[fieldMap.name] || "").trim();
      const booth = String(row[fieldMap.booth] || "1").trim();
      const serialRaw = row[fieldMap.serialNo];
      const serialNo = serialRaw !== undefined && serialRaw !== "" ? Number(serialRaw) || serialRaw : (idx + 1);
      let epic = String(row[fieldMap.epic] || "").trim().toUpperCase();
      if (!epic && name) {
        epic = `RJX${booth.padStart(2, "0")}${String(serialNo).padStart(5, "0")}`;
      }
      const isSupp = String(row[fieldMap.isSupporter] || "").trim();
      const votedVal = String(row[fieldMap.voted] || "").trim();
      const outsideVal = String(row[fieldMap.isOutside] || "").trim();

      return {
        name,
        epic,
        guardian: String(row[fieldMap.guardian] || "").trim(),
        age: String(row[fieldMap.age] || "35"),
        gender: String(row[fieldMap.gender] || "Male"),
        house: String(row[fieldMap.house] || "").trim(),
        booth,
        serialNo,
        phone: String(row[fieldMap.phone] || "").trim(),
        address: String(row[fieldMap.address] || "").trim(),
        boothAddress: String(row[fieldMap.boothAddress] || "").trim(),
        voted: votedVal || "नहीं",
        isSupporter: isSupp || "हाँ",
        isOutside: outsideVal || "नहीं",
        status: (isSupp === "हाँ" || isSupp === "Yes") ? ("In-Favor" as VoterRecord["status"]) : ("Pending" as VoterRecord["status"]),
        worker: "Unassigned",
      };
    }).filter((v) => v.name && v.epic);

    store.importVoters(candidateId, votersToImport);
    fetch("/api/voters/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId, voters: votersToImport }),
    }).catch(() => {});
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
                { key: "booth", label: "1. भाग संख्या (Part / Booth No.) *" },
                { key: "serialNo", label: "2. क्रम संख्या (Serial No. / क्र.सं.)" },
                { key: "name", label: "3. नाम (Voter Full Name) *" },
                { key: "guardian", label: "4. पिता/पति (Guardian / Father / Husband)" },
                { key: "voted", label: "5. वोट डाला (Voted - हाँ/नहीं)" },
                { key: "isSupporter", label: "6. सपोर्टर है (Supporter - हाँ/नहीं)" },
                { key: "isOutside", label: "7. बाहर है (Is Outside - हाँ/नहीं)" },
                { key: "phone", label: "8. मोबाइल नो (Mobile Number)" },
                { key: "house", label: "9. हाउस No (House No.)" },
                { key: "address", label: "10. एड्रेस (Address / Ward / Colony)" },
                { key: "boothAddress", label: "11. Booth Address (मतदान केंद्र का पता)" },
                { key: "epic", label: "वैकल्पिक: पहचान पत्र (EPIC - खाली होने पर स्वतः बनेगा)" },
                { key: "age", label: "वैकल्पिक: आयु (Age)" },
                { key: "gender", label: "वैकल्पिक: लिंग (Gender)" },
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
