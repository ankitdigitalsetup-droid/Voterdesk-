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
  UserCheck
} from "lucide-react";
import { store } from "@/lib/data-store";
import { VoterRecord, CandidateAccount, TeamMember, UserAccount } from "@/lib/types";
import { parseExcelFile, detectFieldMapping, downloadSampleExcelTemplate, ParsedSheetData } from "@/lib/excel-helper";

export default function Page() {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [page, setPage] = useState<string>("dashboard");
  const [menu, setMenu] = useState(false);

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

  // When user logs in, set candidate id
  const handleLogin = (authenticatedUser: UserAccount) => {
    setUser(authenticatedUser);
    if (authenticatedUser.candidateId) {
      setActiveCandidateId(authenticatedUser.candidateId);
    }
    if (authenticatedUser.role === "SUPER_ADMIN") {
      setPage("superadmin");
    } else if (authenticatedUser.role === "KARYAKARTA") {
      setPage("field");
    } else {
      setPage("dashboard");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setPage("dashboard");
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Super Admin Direct View
  if (user.role === "SUPER_ADMIN" && page === "superadmin") {
    return (
      <SuperAdminView
        user={user}
        candidates={candidates}
        onSelectCandidate={(candId) => {
          setActiveCandidateId(candId);
          setPage("dashboard");
        }}
        onCandidateCreated={refreshData}
        onLogout={handleLogout}
      />
    );
  }

  // Karyakarta / Volunteer Direct View
  if (user.role === "KARYAKARTA" || page === "field") {
    return (
      <KaryakartaFieldView
        user={user}
        voters={voters}
        onVoterUpdated={refreshData}
        onLogout={handleLogout}
        onBackToAdmin={user.role === "SUPER_ADMIN" || user.role === "CANDIDATE_ADMIN" ? () => setPage("dashboard") : undefined}
      />
    );
  }

  // Candidate Admin Main View
  const currentCandidate = candidates.find((c) => c.id === activeCandidateId) || candidates[0];

  const candidateNav = [
    ["dashboard", "Dashboard", Home],
    ["voters", "Voters", Users],
    ["import", "Import Data", FileSpreadsheet],
    ["team", "Team & Booths", UserRound],
    ["reports", "Reports", BarChart3],
  ] as const;

  return (
    <div className="shell">
      <aside className={menu ? "side open" : "side"}>
        <div className="brand">
          <Logo />
          <div>
            <b>VoterDesk</b>
            <span>Candidate Admin</span>
          </div>
          <button className="close" onClick={() => setMenu(false)}>
            <X />
          </button>
        </div>

        <p className="label">CAMPAIGN WORKSPACE</p>
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

        <p className="label second">SWITCH VIEWS</p>
        <nav>
          {user.role === "SUPER_ADMIN" && (
            <button onClick={() => setPage("superadmin")}>
              <ShieldCheck />
              <span>Super Admin Portal</span>
            </button>
          )}
          <button onClick={() => setPage("field")}>
            <UserCheck />
            <span>Karyakarta Field View</span>
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
                {currentCandidate ? `${currentCandidate.wardConstituency} • ${currentCandidate.electionName}` : "Active Election"}
              </span>
              <h2 className="campaignTitle">
                {currentCandidate ? currentCandidate.name : "Candidate Workspace"}
              </h2>
            </div>
          </div>

          <div className="tools">
            <span className={`roleBadge ${user.role === "SUPER_ADMIN" ? "super" : "cand"}`}>
              {user.role === "SUPER_ADMIN" ? "Super Admin" : "Candidate"}
            </span>
            <button className="lang" title="Language">हिंदी / EN</button>
            <button className="bell" title="Notifications">
              <Bell size={18} />
              <i />
            </button>
            <span className="avatar">{user.name.slice(0, 2).toUpperCase()}</span>
          </div>
        </header>

        <section className="content">
          {page === "dashboard" && <CandidateDashboard go={setPage} candidate={currentCandidate} voters={voters} />}
          {page === "voters" && <VotersTable candidateId={activeCandidateId} voters={voters} onUpdate={refreshData} />}
          {page === "import" && <RealExcelImporter candidateId={activeCandidateId} onImportSuccess={() => { refreshData(); setPage("voters"); }} />}
          {page === "team" && <TeamManagement candidateId={activeCandidateId} team={team} onUpdate={refreshData} />}
          {page === "reports" && <ReportsView voters={voters} />}
        </section>
      </main>
    </div>
  );
}

// -------------------------------------------------------------
// 1. LOGIN COMPONENT (WITH 3-ROLE QUICK TABS)
// -------------------------------------------------------------
function Login({ onLogin }: { onLogin: (u: UserAccount) => void }) {
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
            <b>VoterDesk</b>
            <span>Multi-Role Campaign Platform</span>
          </div>
        </div>

        <div className="loginCopy">
          <em>CHOOSE YOUR ACCESS ROLE</em>
          <h1>Sign in to VoterDesk</h1>
          <p>Super Admin, Candidate Admin, or Karyakarta portal.</p>
        </div>

        {/* 3-Role Switcher Tabs */}
        <div className="roleTabs">
          <button
            type="button"
            className={`roleTab ${roleTab === "CANDIDATE_ADMIN" ? "active" : ""}`}
            onClick={() => selectRole("CANDIDATE_ADMIN")}
          >
            Candidate Admin
          </button>
          <button
            type="button"
            className={`roleTab ${roleTab === "SUPER_ADMIN" ? "active" : ""}`}
            onClick={() => selectRole("SUPER_ADMIN")}
          >
            Super Admin
          </button>
          <button
            type="button"
            className={`roleTab ${roleTab === "KARYAKARTA" ? "active" : ""}`}
            onClick={() => selectRole("KARYAKARTA")}
          >
            Karyakarta (Worker)
          </button>
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "14px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn}>
          <label>Registered Mobile Number</label>
          <div className="phone">
            <span>+91</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" required />
          </div>

          <div className="passLabel">
            <label>Password</label>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>Pre-filled for demo</span>
          </div>
          <input
            className="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="primary wide" disabled={loading}>
            {loading ? "Signing in..." : `Sign in as ${roleTab === "SUPER_ADMIN" ? "Super Admin" : roleTab === "CANDIDATE_ADMIN" ? "Candidate Admin" : "Karyakarta"}`}
          </button>
        </form>

        <p className="demo">
          <ShieldCheck /> 1-Click login: Click any tab above to auto-fill credentials.
        </p>
      </section>

      <section className="loginArt">
        <div className="grid" />
        <article>
          <Vote />
          <h2>Manage elections with clarity, security & booth precision.</h2>
          <div className="artStat">
            <span>Voter records organised</span>
            <b>73,860</b>
          </div>
          <div className="progress">
            <i style={{ width: "68%" }} />
          </div>
          <small>68% field campaign targets achieved</small>
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
}: {
  user: UserAccount;
  candidates: CandidateAccount[];
  onSelectCandidate: (id: string) => void;
  onCandidateCreated: () => void;
  onLogout: () => void;
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
      <header style={{ height: "72px", background: "#0b224e", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Logo />
          <div>
            <b style={{ fontSize: "18px" }}>VoterDesk Super Admin</b>
            <span style={{ display: "block", fontSize: "11px", color: "#a9c0e6" }}>System Owner Platform Console</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span className="roleBadge super">Master Administrator</span>
          <button className="outline" style={{ background: "transparent", color: "white", borderColor: "#304875" }} onClick={onLogout}>
            <LogOut size={16} /> Logout
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
// 3. KARYAKARTA / VOLUNTEER FIELD VIEW (BOOTH SPECIFIC)
// -------------------------------------------------------------
function KaryakartaFieldView({
  user,
  voters,
  onVoterUpdated,
  onLogout,
  onBackToAdmin,
}: {
  user: UserAccount;
  voters: VoterRecord[];
  onVoterUpdated: () => void;
  onLogout: () => void;
  onBackToAdmin?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedVoter, setSelectedVoter] = useState<VoterRecord | null>(null);

  // Filter voters: Only assigned booths for karyakarta
  const assignedBooths = user.assignedBooths && user.assignedBooths.length > 0 ? user.assignedBooths : ["12", "13"];

  const boothVoters = useMemo(() => {
    return voters.filter((v) => {
      // If user is Karyakarta, restrict to their booths
      const inBooth = user.role === "KARYAKARTA" ? assignedBooths.includes(v.booth) : true;
      if (!inBooth) return false;

      if (statusFilter !== "ALL" && v.status.toLowerCase() !== statusFilter.toLowerCase()) return false;

      if (search) {
        const q = search.toLowerCase();
        return (
          v.name.toLowerCase().includes(q) ||
          v.epic.toLowerCase().includes(q) ||
          (v.guardian && v.guardian.toLowerCase().includes(q)) ||
          v.house.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [voters, assignedBooths, statusFilter, search, user.role]);

  const handleStatusChange = (voterId: string, newStatus: VoterRecord["status"]) => {
    store.updateVoter(voterId, { status: newStatus, worker: user.name });
    onVoterUpdated();
  };

  const totalAssigned = boothVoters.length;
  const contacted = boothVoters.filter((v) => v.status !== "Pending").length;
  const percentage = totalAssigned > 0 ? Math.round((contacted / totalAssigned) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", paddingBottom: "40px" }}>
      {/* Mobile Top Header */}
      <header style={{ height: "64px", background: "#0b224e", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Logo />
          <div>
            <b style={{ fontSize: "16px" }}>VoterDesk Field</b>
            <span style={{ display: "block", fontSize: "10px", color: "#a9c0e6" }}>Karyakarta Mobile Portal</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {onBackToAdmin && (
            <button className="outline" style={{ color: "#fff", borderColor: "#284478", padding: "6px 10px", fontSize: "12px" }} onClick={onBackToAdmin}>
              Back to Admin
            </button>
          )}
          <button className="outline" style={{ color: "#fff", borderColor: "#284478", padding: "6px 10px", fontSize: "12px" }} onClick={onLogout}>
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <div className="fieldContainer" style={{ padding: "16px" }}>
        {/* Booth Assignment Banner */}
        <div className="fieldBoothBanner">
          <div>
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", color: "#93c5fd" }}>
              Worker: {user.name}
            </span>
            <h2 style={{ margin: "4px 0 6px", fontSize: "20px" }}>
              Assigned: Booth {assignedBooths.join(", ")}
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#cbd5e1" }}>
              Progress: {contacted} of {totalAssigned} voters contacted ({percentage}%)
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <b style={{ fontSize: "28px" }}>{percentage}%</b>
          </div>
        </div>

        {/* Search and Filters */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "13px", color: "#94a3b8" }} />
            <input
              style={{ width: "100%", height: "42px", paddingLeft: "36px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", background: "#fff" }}
              placeholder="Search voter name, EPIC or house..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            style={{ height: "42px", borderRadius: "10px", border: "1px solid #cbd5e1", padding: "0 10px", background: "#fff", fontSize: "13px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Contacted">Contacted</option>
            <option value="In-Favor">In Favor</option>
            <option value="Slip-Given">Slip Given</option>
          </select>
        </div>

        {/* Voter List Cards */}
        <div className="voterCardList">
          {boothVoters.map((v) => (
            <div key={v.id} className="voterCard">
              <div className="voterCardHead">
                <div>
                  <b style={{ fontSize: "16px", color: "#0f172a" }}>{v.name}</b>
                  <span style={{ display: "block", fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                    Guardian: {v.guardian || "—"}
                  </span>
                </div>
                <span className={`status ${v.status.toLowerCase()}`}>{v.status}</span>
              </div>

              <div className="voterCardMeta">
                <span><b>EPIC:</b> {v.epic}</span>
                <span><b>House:</b> {v.house}</span>
                <span><b>Age/Sex:</b> {v.age} / {v.gender}</span>
                <span><b>Booth:</b> {v.booth}</span>
                {v.phone && <span><b>Phone:</b> {v.phone}</span>}
              </div>

              {/* 1-Tap Quick Action Buttons */}
              <div className="voterCardActions">
                <button
                  className="outline"
                  style={{ background: v.status === "In-Favor" ? "#dcfce7" : "#fff", borderColor: "#86efac", color: "#15803d" }}
                  onClick={() => handleStatusChange(v.id, "In-Favor")}
                >
                  <Check size={14} /> Pakka Vote (In-Favor)
                </button>
                <button
                  className="outline"
                  style={{ background: v.status === "Contacted" ? "#e0f2fe" : "#fff", borderColor: "#7dd3fc", color: "#0369a1" }}
                  onClick={() => handleStatusChange(v.id, "Contacted")}
                >
                  Contacted
                </button>
                <button
                  className="outline"
                  style={{ background: v.status === "Slip-Given" ? "#e0e7ff" : "#fff", borderColor: "#c7d2fe", color: "#4338ca" }}
                  onClick={() => handleStatusChange(v.id, "Slip-Given")}
                >
                  Slip Handed Over
                </button>
                <button
                  className="outline"
                  onClick={() => setSelectedVoter(v)}
                >
                  Details / Slip
                </button>
              </div>
            </div>
          ))}

          {boothVoters.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
              No voters found matching your search in Booth {assignedBooths.join(", ")}.
            </div>
          )}
        </div>
      </div>

      {/* Voter Slip / Details Modal */}
      {selectedVoter && (
        <div className="modalOverlay" onClick={() => setSelectedVoter(null)}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <h3>Voter Information & Voting Slip</h3>
              <button onClick={() => setSelectedVoter(null)}><X /></button>
            </div>
            <div className="modalBody">
              <div style={{ border: "2px solid #0f2f67", borderRadius: "12px", padding: "16px", background: "#f8fafc", marginBottom: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #cbd5e1", paddingBottom: "10px", marginBottom: "10px" }}>
                  <b style={{ color: "var(--blue)" }}>OFFICIAL VOTER SLIP</b>
                  <span>Booth No: <b>{selectedVoter.booth}</b></span>
                </div>
                <h2 style={{ margin: "6px 0", fontSize: "20px" }}>{selectedVoter.name}</h2>
                <p style={{ margin: "4px 0", fontSize: "13px" }}><b>Father/Husband:</b> {selectedVoter.guardian}</p>
                <p style={{ margin: "4px 0", fontSize: "13px" }}><b>EPIC (Voter ID):</b> <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{selectedVoter.epic}</span></p>
                <p style={{ margin: "4px 0", fontSize: "13px" }}><b>House Number:</b> {selectedVoter.house}</p>
                <p style={{ margin: "4px 0", fontSize: "13px" }}><b>Age / Gender:</b> {selectedVoter.age} / {selectedVoter.gender}</p>
              </div>

              <div className="formGroup">
                <label>Update Mobile Number</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    placeholder="Enter voter phone..."
                    defaultValue={selectedVoter.phone || ""}
                    id="modalPhoneInput"
                  />
                  <button
                    className="primary"
                    onClick={() => {
                      const input = document.getElementById("modalPhoneInput") as HTMLInputElement;
                      if (input) {
                        store.updateVoter(selectedVoter.id, { phone: input.value });
                        onVoterUpdated();
                        setSelectedVoter({ ...selectedVoter, phone: input.value });
                      }
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="formFoot" style={{ marginTop: "20px" }}>
                <button
                  className="outline"
                  onClick={() => {
                    const text = `*VoterDesk Matdata Parchi*%0A*Naam:* ${selectedVoter.name}%0A*EPIC:* ${selectedVoter.epic}%0A*Booth:* ${selectedVoter.booth}%0A*House:* ${selectedVoter.house}%0AKripya apna vote avashya dalein!`;
                    window.open(`https://wa.me/?text=${text}`, "_blank");
                  }}
                >
                  <Share2 size={16} /> Share on WhatsApp
                </button>
                <button className="primary" onClick={() => window.print()}>
                  <Printer size={16} /> Print Slip
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
function CandidateDashboard({ go, candidate, voters }: { go: (p: string) => void; candidate: CandidateAccount; voters: VoterRecord[] }) {
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
        title={`Welcome back, ${candidate.name}`}
        sub="Here's the live field summary and booth completion status."
      >
        <button className="primary" onClick={() => go("import")}>
          <Upload size={16} />
          <span className="desktopOnly">Import voter list (.xlsx / .csv)</span>
          <span className="mobileOnly">Import Voter List</span>
        </button>
      </Title>

      <div className="stats">
        <article>
          <i className="blue"><Users /></i>
          <span>Total voters</span>
          <b>{total.toLocaleString()}</b>
          <small>Managed in this ward</small>
        </article>
        <article>
          <i className="green"><CheckCircle2 /></i>
          <span>Contacted</span>
          <b>{contacted.toLocaleString()}</b>
          <small>{contactedPct}% completed</small>
        </article>
        <article>
          <i className="orange"><UserCheck /></i>
          <span>Pakka Vote (In-Favor)</span>
          <b>{inFavor.toLocaleString()}</b>
          <small>High confidence supporters</small>
        </article>
        <article>
          <i className="red"><Users /></i>
          <span>Pending</span>
          <b>{pending.toLocaleString()}</b>
          <small>{total > 0 ? Math.round((pending / total) * 100) : 0}% remaining</small>
        </article>
      </div>

      <div className="two">
        <Panel title="Booth Wise Completion" sub="Field survey and door-to-door progress by polling station">
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

        <Panel title="Quick Actions" sub="Operations for candidate and managers">
          <div className="actions">
            <button onClick={() => go("import")}>
              <i className="blue"><FileSpreadsheet /></i>
              <span>
                <b>Upload New Voter List (.xlsx / .csv)</b>
                <small>Import official election commission electoral roll</small>
              </span>
              ›
            </button>
            <button onClick={() => go("voters")}>
              <i className="orange"><Users /></i>
              <span>
                <b>Review {pending} Pending Voters</b>
                <small>Filter and assign to field karyakartas</small>
              </span>
              ›
            </button>
            <button onClick={() => go("team")}>
              <i className="green"><UserRound /></i>
              <span>
                <b>Manage Karyakarta Team</b>
                <small>Assign booth duties and monitor targets</small>
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
}: {
  candidateId: string;
  voters: VoterRecord[];
  onUpdate: () => void;
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
      if (q) {
        const query = q.toLowerCase();
        return (
          v.name.toLowerCase().includes(query) ||
          v.epic.toLowerCase().includes(query) ||
          (v.guardian && v.guardian.toLowerCase().includes(query)) ||
          v.house.toLowerCase().includes(query) ||
          (v.phone && v.phone.includes(query))
        );
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
}: {
  candidateId: string;
  onImportSuccess: () => void;
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
}: {
  candidateId: string;
  team: TeamMember[];
  onUpdate: () => void;
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
function ReportsView({ voters }: { voters: VoterRecord[] }) {
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
