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
  RefreshCw,
  Key,
  Copy,
  Sparkles,
  Image as ImageIcon,
  ArrowUpDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import { store } from "@/lib/data-store";
import { VoterRecord, CandidateAccount, TeamMember, UserAccount, WorkerLocation, CandidateCredential, AccountStatus } from "@/lib/types";
import { parseExcelFile, detectFieldMapping, downloadSampleExcelTemplate, ParsedSheetData } from "@/lib/excel-helper";
import { translations, Lang } from "@/lib/translations";
import { matchesVoter, singleFieldMatches, getEnglishSortKey } from "@/lib/transliterate";

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

  // Check active server session on load / refresh
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
            if (data.user.candidateId) {
              setActiveCandidateId(data.user.candidateId);
            }
            if (data.user.role === "SUPER_ADMIN") {
              setPage("superadmin");
            } else {
              setPage("boothmanager");
            }
          }
        }
      } catch {
        // Session not present or expired
      }
    }
    checkSession();
  }, []);

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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setUser(null);
    setPage("boothmanager");
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  if (!user) {
    return <Login onLogin={handleLogin} lang={lang} toggleLang={toggleLang} t={t} />;
  }

  // Enforce first-login password creation before any dashboard access
  if (user.mustChangePassword) {
    return (
      <ForceChangePasswordModal
        user={user}
        onPasswordChanged={(updatedUser) => {
          setUser(updatedUser);
        }}
        onLogout={handleLogout}
        lang={lang}
      />
    );
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
    ...(user.role === "SUPER_ADMIN" ? [["import", t.navImport, FileSpreadsheet] as const] : []),
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

        <p className="label second">{lang === "hi" ? "डाउनलोड" : "Download"}</p>
        <nav>
          <button
            onClick={() => {
              setMenu(false);
              if (voters.length === 0) {
                alert(lang === "hi" ? "कोई मतदाता डेटा उपलब्ध नहीं है!" : "No voter data available!");
                return;
              }
              const exportRows = voters.map((v, idx) => ({
                "भाग संख्या (Part No)": v.booth || "—",
                "क्रम संख्या (Serial No)": v.serialNo !== undefined && v.serialNo !== "" ? v.serialNo : idx + 1,
                "मतदाता का नाम (Name)": v.name || "",
                "पिता/पति का नाम (Guardian)": v.guardian || "—",
                "वोट डाला (Voted)": (v.voted === "हाँ" || v.voted === "Yes" || v.voted === true) ? "हाँ" : "नहीं",
                "समर्थक (Supporter)": (v.isSupporter === "हाँ" || v.isSupporter === "Yes" || v.isSupporter === true || v.status === "In-Favor") ? "हाँ" : "नहीं",
                "बाहर है (Outside)": (v.isOutside === "हाँ" || v.isOutside === "Yes" || v.isOutside === true) ? "हाँ" : "नहीं",
                "आयु (Age)": v.age || "—",
                "मोबाइल नंबर (Mobile)": v.phone || "—",
                "वोटर ID / पहचान पत्र (EPIC)": v.epic || "—",
                "मकान नंबर (House No)": v.house || "—",
                "पता (Address)": v.address || "—",
                "मतदान केंद्र (Booth Address)": v.boothAddress || "—",
                "लिंग (Gender)": v.gender || "—",
                "स्थिति (Status)": v.status || "Pending",
                "कार्यकर्ता (Worker)": v.worker || "—",
              }));
              const ws = XLSX.utils.json_to_sheet(exportRows);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "All_Voters");
              const dateStr = new Date().toISOString().slice(0, 10);
              XLSX.writeFile(wb, `VoterDesk_All_${voters.length}_voters_${dateStr}.xlsx`);
            }}
          >
            <Download />
            <span>{lang === "hi" ? `डाउनलोड Excel (${voters.length})` : `Download Voters (${voters.length})`}</span>
          </button>
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
          {page === "dashboard" && <CandidateDashboard go={setPage} candidate={currentCandidate} voters={voters} t={t} user={user} />}
          {page === "voters" && <VotersTable candidateId={activeCandidateId} voters={voters} onUpdate={refreshData} t={t} user={user} />}
          {page === "import" && (
            user.role === "SUPER_ADMIN" ? (
              <RealExcelImporter candidateId={activeCandidateId} onImportSuccess={() => { refreshData(); setPage("voters"); }} t={t} />
            ) : (
              <Panel title="एक्सेस प्रतिबंधित (Access Restricted)">
                <div style={{ padding: "30px", textAlign: "center" }}>
                  <AlertCircle size={40} color="#e11d48" style={{ margin: "0 auto 12px" }} />
                  <h3 style={{ color: "#0f172a" }}>Excel फ़ाइल अपलोड की अनुमति केवल सुपर एडमिन को है।</h3>
                  <p style={{ color: "#64748b", fontSize: "14px", marginTop: "6px" }}>
                    कैंडिडेट पैनल से एक्सेल अपलोड और नया वोटर जोड़ना हटा दिया गया है। यह सुविधा केवल सुपर एडमिन पैनल से उपलब्ध है।
                  </p>
                  <button className="primary" style={{ marginTop: "16px" }} onClick={() => setPage("boothmanager")}>
                    बूथ मैनेजमेंट पर वापस जाएं ›
                  </button>
                </div>
              </Panel>
            )
          )}
          {page === "team" && <TeamManagement candidateId={activeCandidateId} team={team} onUpdate={refreshData} t={t} />}
          {page === "reports" && <ReportsView voters={voters} t={t} />}
        </section>
      </main>
    </div>
  );
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// 1. PRODUCTION SECURE LOGIN COMPONENT (CLEAN - NO DEMO CREDS)
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
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: loginId.trim(), password }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        onLogin(data.user);
        return;
      }

      setError(data.error || "अमान्य मोबाइल नंबर या पासवर्ड।");
    } catch {
      setError("सर्वर से कनेक्ट करने में त्रुटि हुई। कृपया इंटरनेट कनेक्शन जांचें।");
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
          <h1>{lang === "hi" ? "सुरक्षित लॉगिन" : "Secure Sign In"}</h1>
          <p>{lang === "hi" ? "अपने अधिकृत क्रेडेंशियल्स दर्ज कर पोर्टल में प्रवेश करें" : "Enter your authorized credentials to access portal"}</p>
        </div>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              border: "1px solid #f87171",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "16px",
              fontWeight: 600,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSignIn}>
          <label>{lang === "hi" ? "मोबाइल नंबर या लॉगिन आईडी" : "Mobile Number or Login ID"}</label>
          <div className="phone" style={{ marginTop: "4px", marginBottom: "14px" }}>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder={lang === "hi" ? "जैसे: 90793XXXXX या Login ID" : "e.g. 90793XXXXX or Login ID"}
              required
              autoFocus
              style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
          </div>

          <div className="passLabel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label>{lang === "hi" ? "पासवर्ड" : "Password"}</label>
          </div>
          <input
            className="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={lang === "hi" ? "अपना गुप्त पासवर्ड दर्ज करें" : "Enter password"}
            required
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px", marginBottom: "16px" }}
          />

          <button className="primary wide" disabled={loading} style={{ padding: "12px", fontSize: "15px", fontWeight: 700 }}>
            {loading ? (lang === "hi" ? "प्रमाणीकरण हो रहा है..." : "Signing in...") : (lang === "hi" ? "लॉगिन करें / Sign In" : "Sign In")}
          </button>
        </form>
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
// 1.5 MANDATORY FIRST-LOGIN PASSWORD CREATION COMPONENT
// -------------------------------------------------------------
function ForceChangePasswordModal({
  user,
  onPasswordChanged,
  onLogout,
  lang,
}: {
  user: UserAccount;
  onPasswordChanged: (u: UserAccount) => void;
  onLogout: () => void;
  lang: Lang;
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("कृपया सभी फ़ील्ड भरें।");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते हैं।");
      return;
    }

    if (newPassword.length < 6) {
      setError("नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        onPasswordChanged(data.user);
      } else {
        setError(data.error || "पासवर्ड बदलने में त्रुटि हुई।");
      }
    } catch {
      setError("सर्वर से कनेक्ट करने में त्रुटि।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0b192c 0%, #1e3e62 100%)",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "32px",
          width: "100%",
          maxWidth: "440px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "42px", marginBottom: "8px" }}>🔐</div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>
            नया पासवर्ड बनाएं (Create New Password)
          </h2>
          <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>
            नमस्ते <b>{user.name}</b>, यह आपकी पहली लॉगिन है। सुरक्षा नियमों के अनुसार कृपया अपना नया सुरक्षित पासवर्ड सेट करें।
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#b91c1c",
              border: "1px solid #f87171",
              padding: "10px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              marginBottom: "16px",
              fontWeight: 600,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
              अस्थायी पासवर्ड (Temporary Password)
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="सुपर एडमिन द्वारा दिया गया 8-अंकीय पासवर्ड"
              required
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
              नया पासवर्ड (New Password)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="नया गुप्त पासवर्ड दर्ज करें"
              required
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
              नए पासवर्ड की पुष्टि (Confirm New Password)
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="नया पासवर्ड दोबारा दर्ज करें"
              required
              style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
              color: "#ffffff",
              border: 0,
              borderRadius: "10px",
              padding: "13px",
              fontSize: "15px",
              fontWeight: 800,
              cursor: loading ? "wait" : "pointer",
              marginTop: "8px",
              boxShadow: "0 4px 12px rgba(29, 78, 216, 0.35)",
            }}
          >
            {loading ? "सुरक्षित किया जा रहा है..." : "पासवर्ड सेव करें व आगे बढ़ें ➤"}
          </button>

          <button
            type="button"
            onClick={onLogout}
            style={{
              background: "transparent",
              border: 0,
              color: "#64748b",
              fontSize: "13px",
              cursor: "pointer",
              textDecoration: "underline",
              marginTop: "4px",
            }}
          >
            लॉगआउट करें (Cancel & Logout)
          </button>
        </form>
      </div>
    </div>
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
  const [newCand, setNewCand] = useState<{
    name: string;
    phone: string;
    party: string;
    electionName: string;
    wardConstituency: string;
    boothCount: string;
    status: AccountStatus;
  }>({
    name: "",
    phone: "",
    party: "Independent (निर्दलीय)",
    electionName: "Municipal Election 2026",
    wardConstituency: "Ward 01",
    boothCount: "1",
    status: "ACTIVE",
  });

  // One-Time Credentials Modal State (Temporary Password shown only once!)
  const [oneTimeCreds, setOneTimeCreds] = useState<{
    name: string;
    phone: string;
    tempPassword: string;
    roleTitle: string;
    ward?: string;
  } | null>(null);
  const [copiedOneTimeCreds, setCopiedOneTimeCreds] = useState(false);

  // Dedicated Karyakarta Creation Modal
  const [showAddKaryakartaModal, setShowAddKaryakartaModal] = useState<CandidateAccount | null>(null);
  const [karyakartaForm, setKaryakartaForm] = useState<{
    name: string;
    phone: string;
    roleTitle: string;
    ward: string;
    booth: string;
    area: string;
    status: AccountStatus;
  }>({
    name: "",
    phone: "",
    roleTitle: "Field Worker",
    ward: "",
    booth: "1",
    area: "",
    status: "ACTIVE",
  });

  // Dedicated Ward Onboarding Card States
  const [wardNo, setWardNo] = useState("Ward 34");
  const [electionName, setElectionName] = useState("Municipal Election 2026");
  const [candName, setCandName] = useState("");
  const [candParty, setCandParty] = useState("Independent (निर्दलीय)");
  const [candPhone, setCandPhone] = useState("");
  const [boothCount, setBoothCount] = useState<number>(3); // default 3 booths

  // Poster Upload state
  const [posterPreview, setPosterPreview] = useState<string>("");
  const [posterFileName, setPosterFileName] = useState<string>("");
  const posterInputRef = useRef<HTMLInputElement>(null);

  // Excel Voter Roll Upload state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelFileName, setExcelFileName] = useState<string>("");
  const [parsedVoters, setParsedVoters] = useState<Omit<VoterRecord, "id">[]>([]);
  const [isParsingExcel, setIsParsingExcel] = useState<boolean>(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Credentials Generation state
  const [credentials, setCredentials] = useState<Array<{
    name: string;
    phone: string;
    role: "CANDIDATE_ADMIN" | "KARYAKARTA";
    boothNumber: string;
    roleTitle: string;
    status: AccountStatus;
    mustChangePassword: boolean;
  }>>([]);
  const [previewBoothFilter, setPreviewBoothFilter] = useState<string>("ALL");
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [activationToast, setActivationToast] = useState<string>("");

  // Credentials Export / View Modal State
  const [viewCredsModal, setViewCredsModal] = useState<{
    candidate: CandidateAccount;
    creds: CandidateCredential[];
  } | null>(null);
  const [modalBoothFilter, setModalBoothFilter] = useState<string>("ALL");
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Dedicated Excel Upload Modal for Existing Candidate (Super Admin exclusive)
  const [saUploadCand, setSaUploadCand] = useState<CandidateAccount | null>(null);
  const [saUploadFileName, setSaUploadFileName] = useState("");
  const [saParsedVoters, setSaParsedVoters] = useState<Omit<VoterRecord, "id">[]>([]);
  const [isParsingSaExcel, setIsParsingSaExcel] = useState(false);
  const saExcelInputRef = useRef<HTMLInputElement>(null);

  // Dedicated Add Single Voter Modal for Existing Candidate (Super Admin exclusive)
  const [saAddVoterCand, setSaAddVoterCand] = useState<CandidateAccount | null>(null);
  const [saVoterForm, setSaVoterForm] = useState({
    name: "",
    guardian: "",
    booth: "1",
    serialNo: "",
    epic: "",
    age: "35",
    gender: "Male",
    phone: "",
    house: "",
    address: "",
    boothAddress: "",
    voted: "नहीं",
    isSupporter: "हाँ",
    isOutside: "नहीं",
  });

  const handleSaExcelSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsingSaExcel(true);
    setSaUploadFileName(file.name);
    try {
      const parsed = await parseExcelFile(file);
      const mapping = detectFieldMapping(parsed.columns);
      const rows: Omit<VoterRecord, "id">[] = parsed.rows.map((r, idx) => {
        const boothVal = mapping.booth && r[mapping.booth] ? String(r[mapping.booth]).trim() : "1";
        const serialVal = mapping.serialNo && r[mapping.serialNo] ? Number(String(r[mapping.serialNo]).replace(/\D/g, "")) || (idx + 1) : idx + 1;
        const nameVal = mapping.name && r[mapping.name] ? String(r[mapping.name]).trim() : `मतदाता ${idx + 1}`;
        const guardianVal = mapping.guardian && r[mapping.guardian] ? String(r[mapping.guardian]).trim() : "";
        const votedVal = mapping.voted && r[mapping.voted] ? String(r[mapping.voted]).trim() : "नहीं";
        const suppVal = mapping.isSupporter && r[mapping.isSupporter] ? String(r[mapping.isSupporter]).trim() : "हाँ";
        const outsideVal = mapping.isOutside && r[mapping.isOutside] ? String(r[mapping.isOutside]).trim() : "नहीं";
        const ageVal = mapping.age && r[mapping.age] ? String(r[mapping.age]).trim() : "35";
        const genderVal = mapping.gender && r[mapping.gender] ? String(r[mapping.gender]).trim() : "Male";
        const phoneVal = mapping.phone && r[mapping.phone] ? String(r[mapping.phone]).trim() : "";
        const houseVal = mapping.house && r[mapping.house] ? String(r[mapping.house]).trim() : "";
        const addressVal = mapping.address && r[mapping.address] ? String(r[mapping.address]).trim() : "";
        const boothAddrVal = mapping.boothAddress && r[mapping.boothAddress] ? String(r[mapping.boothAddress]).trim() : "";
        let epicVal = mapping.epic && r[mapping.epic] ? String(r[mapping.epic]).trim().toUpperCase() : "";
        if (!epicVal) {
          epicVal = `RJX${boothVal.padStart(2, "0")}${String(serialVal).padStart(5, "0")}`;
        }
        return {
          candidateId: saUploadCand ? saUploadCand.id : "cand_1",
          booth: boothVal,
          serialNo: serialVal,
          name: nameVal,
          guardian: guardianVal,
          voted: votedVal === "हाँ" || votedVal === "Yes" || votedVal === "true" ? "हाँ" : "नहीं",
          isSupporter: suppVal === "हाँ" || suppVal === "Yes" || suppVal === "true" ? "हाँ" : "नहीं",
          isOutside: outsideVal === "हाँ" || outsideVal === "Yes" || outsideVal === "true" ? "हाँ" : "नहीं",
          age: ageVal,
          gender: genderVal,
          phone: phoneVal,
          house: houseVal,
          address: addressVal,
          boothAddress: boothAddrVal,
          epic: epicVal,
          status: "Pending",
          worker: "Super Admin",
          extraData: r,
        };
      });
      setSaParsedVoters(rows);
    } catch (err: unknown) {
      alert("Excel फ़ाइल पार्स करने में त्रुटि: " + (err instanceof Error ? err.message : String(err)));
      setSaUploadFileName("");
      setSaParsedVoters([]);
    } finally {
      setIsParsingSaExcel(false);
    }
  };

  const handleSaveSaExcel = () => {
    if (!saUploadCand || saParsedVoters.length === 0) return;
    const res = store.importVoters(saUploadCand.id, saParsedVoters);
    onCandidateCreated();
    alert(`✅ ${res.imported} मतदाता ${saUploadCand.name} (${saUploadCand.wardConstituency}) में सफलतापूर्वक अपलोड व सुरक्षित हो गए!`);
    setSaUploadCand(null);
    setSaUploadFileName("");
    setSaParsedVoters([]);
  };

  const handleSaveSaSingleVoter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saAddVoterCand) return;
    if (!saVoterForm.name.trim()) {
      alert("कृपया मतदाता का नाम दर्ज करें");
      return;
    }
    const epicVal = saVoterForm.epic.trim().toUpperCase() || `RJX${String(saVoterForm.booth || "1").padStart(2, "0")}${Math.floor(10000 + Math.random() * 90000)}`;
    store.addVoter({
      candidateId: saAddVoterCand.id,
      name: saVoterForm.name.trim(),
      guardian: saVoterForm.guardian.trim(),
      booth: saVoterForm.booth.trim() || "1",
      serialNo: saVoterForm.serialNo ? Number(saVoterForm.serialNo) : undefined,
      epic: epicVal,
      age: saVoterForm.age.trim() || "35",
      gender: saVoterForm.gender.trim() || "Male",
      phone: saVoterForm.phone.trim(),
      house: saVoterForm.house.trim(),
      address: saVoterForm.address.trim(),
      boothAddress: saVoterForm.boothAddress.trim(),
      voted: saVoterForm.voted,
      isSupporter: saVoterForm.isSupporter,
      isOutside: saVoterForm.isOutside,
      status: "Pending",
      worker: "Super Admin",
    });
    onCandidateCreated();
    alert(`✅ नया मतदाता ${saVoterForm.name.trim()} (${saAddVoterCand.name}) में सफलतापूर्वक जुड़ गया!`);
    setSaAddVoterCand(null);
    setSaVoterForm({
      name: "",
      guardian: "",
      booth: "1",
      serialNo: "",
      epic: "",
      age: "35",
      gender: "Male",
      phone: "",
      house: "",
      address: "",
      boothAddress: "",
      voted: "नहीं",
      isSupporter: "हाँ",
      isOutside: "नहीं",
    });
  };

  // Dynamic Accounts Formula (1 booth = 4 accounts: 1 candidate + 3 karyakartas)
  const generateCredsList = useCallback((count: number, cName: string, cPhone: string) => {
    const list: Array<{
      name: string;
      phone: string;
      role: "CANDIDATE_ADMIN" | "KARYAKARTA";
      boothNumber: string;
      roleTitle: string;
      status: AccountStatus;
      mustChangePassword: boolean;
    }> = [];

    const baseName = cName.trim() || "प्रत्याशी";
    const cleanPhone = cPhone.replace(/\D/g, "");
    const basePhone = cleanPhone.length === 10 ? cleanPhone : "9829012345";
    const prefix = basePhone.substring(0, 6);

    for (let b = 1; b <= count; b++) {
      const bStr = String(b);
      const bPad = b < 10 ? `0${b}` : `${b}`;

      // 1. Candidate Account for Booth b
      list.push({
        name: b === 1 ? baseName : `${baseName} (बूथ ${b})`,
        phone: b === 1 && cleanPhone.length === 10 ? cleanPhone : `${prefix}${bPad}0`,
        role: "CANDIDATE_ADMIN",
        boothNumber: bStr,
        roleTitle: `बूथ ${b} प्रत्याशी प्रभारी`,
        status: "ACTIVE",
        mustChangePassword: true,
      });

      // 2. Three Karyakarta Accounts for Booth b
      for (let k = 1; k <= 3; k++) {
        list.push({
          name: `कार्यकर्ता ${k} (बूथ ${b})`,
          phone: `${prefix}${bPad}${k}`,
          role: "KARYAKARTA",
          boothNumber: bStr,
          roleTitle: `बूथ ${b} कार्यकर्ता ${k}`,
          status: "ACTIVE",
          mustChangePassword: true,
        });
      }
    }
    return list;
  }, []);

  // Synchronize credentials whenever boothCount, candName, or candPhone change
  useEffect(() => {
    setCredentials(generateCredsList(boothCount, candName, candPhone));
  }, [boothCount, candName, candPhone, generateCredsList]);

  // Poster File Handler
  const handlePosterUpload = (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      alert("कृपया एक मान्य इमेज फ़ाइल (.jpg, .png, .webp) चुनें।");
      return;
    }
    setPosterFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPosterPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Excel File Handler
  const handleExcelUpload = async (file: File) => {
    if (!file) return;
    setExcelFile(file);
    setExcelFileName(file.name);
    setIsParsingExcel(true);
    try {
      const parsed = await parseExcelFile(file);
      const mapping = detectFieldMapping(parsed.columns);
      const mappedColNames = new Set(Object.values(mapping).filter(Boolean));
      const votersToImport: Omit<VoterRecord, "id">[] = parsed.rows
        .map((row, idx) => {
          const boothVal = String(row[mapping.booth] || "1").trim();
          const serialVal = row[mapping.serialNo] ? Number(row[mapping.serialNo]) || (idx + 1) : (idx + 1);
          const ageVal = mapping.age && row[mapping.age] !== undefined && String(row[mapping.age]).trim() !== ""
            ? String(row[mapping.age]).trim()
            : "35";
          let epicVal = mapping.epic && row[mapping.epic] !== undefined && String(row[mapping.epic]).trim() !== ""
            ? String(row[mapping.epic]).trim().toUpperCase()
            : "";
          if (!epicVal) {
            epicVal = `RJX${boothVal.padStart(2, "0")}${String(serialVal).padStart(5, "0")}`;
          }

          // Preserve all extra columns from Excel sheet
          const extraData: Record<string, any> = {};
          for (const [key, val] of Object.entries(row)) {
            if (!mappedColNames.has(key)) {
              extraData[key] = val;
            }
          }

          return {
            name: String(row[mapping.name] || "").trim(),
            guardian: String(row[mapping.guardian] || "").trim(),
            epic: epicVal,
            booth: boothVal,
            serialNo: serialVal,
            age: ageVal,
            gender: String(row[mapping.gender] || "Male").trim(),
            house: String(row[mapping.house] || "").trim(),
            address: String(row[mapping.address] || "").trim(),
            boothAddress: String(row[mapping.boothAddress] || "").trim(),
            phone: String(row[mapping.phone] || "").trim(),
            voted: row[mapping.voted] === "हाँ" || row[mapping.voted] === "Yes" ? "हाँ" : "नहीं",
            isSupporter: row[mapping.isSupporter] === "हाँ" || row[mapping.isSupporter] === "Yes" ? "हाँ" : "नहीं",
            isOutside: row[mapping.isOutside] === "हाँ" || row[mapping.isOutside] === "Yes" ? "हाँ" : "नहीं",
            status: "Pending" as VoterRecord["status"],
            worker: "Unassigned",
            candidateId: "",
            extraData,
            ...extraData,
          };
        })
        .filter((v) => v.name);

      setParsedVoters(votersToImport);

      // Auto-detect max booth from data if present
      const boothsInData = Array.from(
        new Set(votersToImport.map((v) => Number(v.booth)).filter((n) => !isNaN(n) && n > 0))
      );
      if (boothsInData.length > 0) {
        const maxBooth = Math.max(...boothsInData);
        if (maxBooth > 0 && maxBooth !== boothCount) {
          setBoothCount(maxBooth);
        }
      }
    } catch (err) {
      alert("एक्सेल पार्स करने में त्रुटि: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsParsingExcel(false);
    }
  };

  // Submit Activation
  const handleActivateSetup = () => {
    if (!candName.trim()) {
      alert("कृपया प्रत्याशी का नाम दर्ज करें!");
      return;
    }
    if (!candPhone.trim()) {
      alert("कृपया मुख्य मोबाइल नंबर दर्ज करें!");
      return;
    }
    if (boothCount < 1) {
      alert("कम से कम 1 बूथ होना आवश्यक है!");
      return;
    }

    setIsActivating(true);
    try {
      const result = store.createCandidateBatchWithPasswords({
        candidate: {
          name: candName.trim(),
          phone: candPhone.trim(),
          party: candParty.trim(),
          electionName: electionName.trim(),
          wardConstituency: wardNo.trim(),
          boothCount: Number(boothCount),
          status: "ACTIVE",
          posterUrl: posterPreview || undefined,
        },
        voters: parsedVoters,
        credentials: credentials,
      });

      onCandidateCreated();

      setActivationToast(`🎉 ${wardNo} के लिए प्रत्याशी एवं ${result.credentialsCount} पासवर्ड सफलतापूर्वक एक्टिवेट हो गए!`);
      setTimeout(() => setActivationToast(""), 4000);

      // Open credentials export modal so admin can immediately copy/download
      setViewCredsModal({
        candidate: result.candidate,
        creds: result.credentials,
      });

      // Clear form
      setCandName("");
      setCandPhone("");
      setPosterPreview("");
      setPosterFileName("");
      setExcelFile(null);
      setExcelFileName("");
      setParsedVoters([]);
    } catch (err) {
      alert("सक्रिय करने में त्रुटि: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsActivating(false);
    }
  };

  // Download Credentials as Excel Sheet (NO PASSWORDS EXPORTED)
  const downloadCredentialsExcel = (cand: CandidateAccount, creds: CandidateCredential[]) => {
    const data = creds.map((c) => ({
      "वार्ड / क्षेत्र": cand.wardConstituency,
      "चुनाव का नाम": cand.electionName,
      "प्रत्याशी का नाम": cand.name,
      "पार्टी": cand.party,
      "भूमिका": c.role === "CANDIDATE_ADMIN" ? "प्रत्याशी (Candidate Admin)" : "कार्यकर्ता (Karyakarta)",
      "पद / पदनाम": c.roleTitle,
      "आवंटित बूथ": `बूथ ${c.boothNumber}`,
      "मोबाइल / लॉगिन आईडी": c.phone,
      "खाता स्थिति": c.status || "ACTIVE",
      "पासवर्ड स्थिति": c.mustChangePassword ? "अस्थायी पासवर्ड (बदलना अनिवार्य)" : "सक्रिय पासवर्ड (सेट)",
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Accounts");
    XLSX.writeFile(workbook, `VoterDesk_Accounts_${cand.wardConstituency.replace(/\s+/g, "_")}.xlsx`);
  };

  // Status Change Handler for Team User
  const handleUpdateStatus = (userId: string, newStatus: AccountStatus) => {
    try {
      store.updateUserStatus(userId, newStatus, user.id, user.name);
      if (viewCredsModal) {
        setViewCredsModal({
          ...viewCredsModal,
          creds: store.getCandidateUsers(viewCredsModal.candidate.id),
        });
      }
      onCandidateCreated();
    } catch (err: unknown) {
      alert("खाता स्थिति बदलने में त्रुटि: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Status Change Handler for Candidate Campaign
  const handleUpdateCandidateStatus = (candidateId: string, newStatus: AccountStatus) => {
    try {
      store.updateCandidateStatus(candidateId, newStatus, user.id, user.name);
      onCandidateCreated();
    } catch (err: unknown) {
      alert("प्रत्याशी अभियान स्थिति बदलने में त्रुटि: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Password Reset Handler for Individual User
  const handleResetPassword = (userId: string, name: string, roleTitle: string, phone: string) => {
    if (!confirm(`क्या आप ${name} (${roleTitle}) का पासवर्ड रीसेट करना चाहते हैं?\n\nनया 8-अंकीय अस्थायी पासवर्ड जारी होगा और सभी सक्रिय सत्र समाप्त हो जाएंगे।`)) {
      return;
    }
    try {
      const res = store.resetUserPassword(userId, user.id, user.name);
      if (viewCredsModal) {
        setViewCredsModal({
          ...viewCredsModal,
          creds: store.getCandidateUsers(viewCredsModal.candidate.id),
        });
      }
      onCandidateCreated();
      setOneTimeCreds({
        name,
        phone,
        tempPassword: res.tempPassword,
        roleTitle,
        ward: viewCredsModal?.candidate.wardConstituency,
      });
    } catch (err: unknown) {
      alert("पासवर्ड रीसेट करने में त्रुटि: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Password Reset Handler for Candidate
  const handleResetCandidatePassword = (cand: CandidateAccount) => {
    if (!confirm(`क्या आप प्रत्याशी ${cand.name} (${cand.wardConstituency}) का एडमिन पासवर्ड रीसेट करना चाहते हैं?\n\nनया 8-अंकीय अस्थायी संख्यात्मक पासवर्ड जारी होगा और प्रत्याशी का वर्तमान लॉगिन सत्र तुरंत समाप्त हो जाएगा।`)) {
      return;
    }
    try {
      const res = store.resetCandidatePassword(cand.id, user.id, user.name);
      onCandidateCreated();
      setOneTimeCreds({
        name: cand.name,
        phone: cand.phone,
        tempPassword: res.tempPassword,
        roleTitle: "प्रत्याशी एडमिन (Candidate Admin)",
        ward: cand.wardConstituency,
      });
    } catch (err: unknown) {
      alert("प्रत्याशी पासवर्ड रीसेट करने में त्रुटि: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCand.name || !newCand.phone) return;

    try {
      const result = store.createCandidateWithAdmin(
        {
          name: newCand.name,
          phone: newCand.phone,
          party: newCand.party,
          electionName: newCand.electionName,
          wardConstituency: newCand.wardConstituency,
          boothCount: Number(newCand.boothCount) || 1,
          status: newCand.status || "ACTIVE",
        },
        user.id,
        user.name
      );

      setShowAddModal(false);
      setNewCand({
        name: "",
        phone: "",
        party: "Independent (निर्दलीय)",
        electionName: "Municipal Election 2026",
        wardConstituency: "Ward 01",
        boothCount: "1",
        status: "ACTIVE",
      });
      onCandidateCreated();

      // Show One-Time Temporary Credentials Modal!
      setOneTimeCreds({
        name: result.candidate.name,
        phone: result.candidate.phone,
        tempPassword: result.tempPassword,
        roleTitle: "प्रत्याशी एडमिन (Candidate Admin)",
        ward: result.candidate.wardConstituency,
      });
    } catch (err: unknown) {
      alert("प्रत्याशी खाता बनाने में त्रुटि: " + (err instanceof Error ? err.message : String(err)));
    }
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

        {/* Floating Activation Toast Notification */}
        {activationToast && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 99999,
              background: "#065f46",
              color: "#ecfdf5",
              padding: "10px 20px",
              borderRadius: "30px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              fontSize: "13.5px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "1.5px solid #34d399",
              maxWidth: "92vw",
              textAlign: "center",
            }}
          >
            <Check size={16} />
            <span>{activationToast}</span>
          </div>
        )}

        {/* =====================================================================
            NEW PROPER CARD: वार्ड ऑनबोर्डिंग, डेटा, पोस्टर एवं 4-पासवर्ड जनरेटर
            ===================================================================== */}
        <div className="saOnboardingCard">
          <div className="saCardHeader">
            <div className="saCardHeaderLeft">
              <div className="saCardHeaderIcon">
                <Sparkles size={22} />
              </div>
              <div>
                <h2 className="saCardTitle">🎯 वार्ड ऑनबोर्डिंग एवं पासवर्ड जनरेटर (Ward Onboarding & Multi-Booth Engine)</h2>
                <p className="saCardSubtitle">
                  वार्ड का डेटा (Excel) व प्रत्याशी का पोस्टर अपलोड करें, और 1 बूथ = 4 पासवर्ड्स के अनुपात से तुरंत क्रेडेंशियल्स जनरेट करें।
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="outline"
                style={{ background: "rgba(255, 255, 255, 0.15)", color: "#ffffff", border: "1px solid rgba(255, 255, 255, 0.3)", padding: "7px 12px", fontSize: "12px", borderRadius: "8px" }}
                onClick={downloadSampleExcelTemplate}
              >
                <Download size={13} /> {t.downloadTemplate}
              </button>
            </div>
          </div>

          <div className="saCardBody">
            {/* Live Formula Banner */}
            <div className="saFormulaBanner">
              <div className="saFormulaText">
                <span>⚡ <b>पासवर्ड नियम:</b></span>
                <span>1 बूथ पर 4 पासवर्ड | 2 बूथ पर 8 | 3 बूथ पर 12 | (प्रत्येक बूथ: 1 प्रत्याशी + 3 कार्यकर्ता)</span>
              </div>
              <div className="saFormulaBadge">
                कुल {boothCount} बूथ = {credentials.length} सक्रिय क्रेडेंशियल्स
              </div>
            </div>

            {/* Inputs Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "24px" }}>
              
              {/* Column 1: Ward & Candidate Information */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <h4 style={{ margin: "0 0 4px", fontSize: "14.5px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                  🏛️ 1. वार्ड एवं प्रत्याशी विवरण
                </h4>

                <div className="formGroup" style={{ margin: 0 }}>
                  <label style={{ fontSize: "12px", fontWeight: 700 }}>वार्ड / क्षेत्र का नाम या संख्या</label>
                  <input
                    type="text"
                    value={wardNo}
                    onChange={(e) => setWardNo(e.target.value)}
                    placeholder="उदा. Ward 34 / वार्ड 34"
                    required
                    style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>

                <div className="formGroup" style={{ margin: 0 }}>
                  <label style={{ fontSize: "12px", fontWeight: 700 }}>चुनाव का नाम</label>
                  <input
                    type="text"
                    value={electionName}
                    onChange={(e) => setElectionName(e.target.value)}
                    placeholder="उदा. Municipal Election 2026"
                    required
                    style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>

                <div className="formGroup" style={{ margin: 0 }}>
                  <label style={{ fontSize: "12px", fontWeight: 700 }}>प्रत्याशी का पूरा नाम</label>
                  <input
                    type="text"
                    value={candName}
                    onChange={(e) => setCandName(e.target.value)}
                    placeholder="उदा. रमेश कुमार शर्मा"
                    required
                    style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="formGroup" style={{ margin: 0 }}>
                    <label style={{ fontSize: "12px", fontWeight: 700 }}>पार्टी / दल</label>
                    <input
                      type="text"
                      value={candParty}
                      onChange={(e) => setCandParty(e.target.value)}
                      placeholder="निर्दलीय / BJP / Congress"
                      style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>

                  <div className="formGroup" style={{ margin: 0 }}>
                    <label style={{ fontSize: "12px", fontWeight: 700 }}>मुख्य मोबाइल नं. (लॉगिन हेतु)</label>
                    <input
                      type="tel"
                      value={candPhone}
                      onChange={(e) => setCandPhone(e.target.value)}
                      placeholder="98290XXXXX"
                      required
                      style={{ padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                </div>

                {/* Booth Count Selector */}
                <div className="formGroup" style={{ margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 700, margin: 0 }}>वार्ड में कुल बूथ संख्या (Total Booths)</label>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#0284c7" }}>
                      {boothCount} बूथ = {boothCount * 4} पासवर्ड
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {[1, 2, 3, 4, 5].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setBoothCount(cnt)}
                        style={{
                          flex: 1,
                          padding: "7px 4px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          border: boothCount === cnt ? "2px solid #0062cc" : "1px solid #cbd5e1",
                          background: boothCount === cnt ? "#eff6ff" : "#ffffff",
                          color: boothCount === cnt ? "#0062cc" : "#334155",
                        }}
                      >
                        {cnt} {cnt === 1 ? "बूथ (4)" : cnt === 2 ? "बूथ (8)" : cnt === 3 ? "बूथ (12)" : `बूथ (${cnt * 4})`}
                      </button>
                    ))}
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={boothCount}
                      onChange={(e) => setBoothCount(Math.max(1, Number(e.target.value) || 1))}
                      style={{ width: "65px", padding: "7px 8px", borderRadius: "8px", border: "1px solid #cbd5e1", textAlign: "center", fontWeight: 700 }}
                      title="कस्टम बूथ संख्या"
                    />
                  </div>
                </div>
              </div>

              {/* Column 2: Candidate Campaign Poster Upload */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <h4 style={{ margin: "0 0 4px", fontSize: "14.5px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                  🖼️ 2. प्रत्याशी पोस्टर / बैनर अपलोड
                </h4>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                  यह पोस्टर वोटर स्लिप, व्हाट्सएप शेयरिंग और डिजिटल कार्ड में प्रदर्शित होगा।
                </p>

                <input
                  ref={posterInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePosterUpload(f);
                  }}
                />

                {!posterPreview ? (
                  <div
                    className="saUploadDropzone"
                    onClick={() => posterInputRef.current?.click()}
                  >
                    <ImageIcon size={32} color="#0284c7" />
                    <b style={{ fontSize: "13.5px", color: "#0f172a" }}>प्रत्याशी का पोस्टर चुनें या ड्रैग करें</b>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>JPG, PNG, WEBP (अधिकतम 5MB)</span>
                    <button
                      type="button"
                      className="outline"
                      style={{ padding: "4px 12px", fontSize: "12px", pointerEvents: "none" }}
                    >
                      फ़ाइल ब्राउज़ करें
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <div className="saPosterPreviewBox">
                      <img src={posterPreview} alt="Candidate Poster Preview" className="saPosterThumbnail" />
                      <button
                        type="button"
                        className="saPosterRemoveBtn"
                        onClick={() => {
                          setPosterPreview("");
                          setPosterFileName("");
                          if (posterInputRef.current) posterInputRef.current.value = "";
                        }}
                        title="पोस्टर हटाएं"
                      >
                        ✕
                      </button>
                    </div>
                    <div style={{ fontSize: "12px", color: "#059669", fontWeight: 700, marginTop: "6px" }}>
                      ✓ पोस्टर सेट: {posterFileName || "poster.jpg"}
                    </div>
                    <button
                      type="button"
                      className="outline"
                      style={{ padding: "4px 10px", fontSize: "11px", marginTop: "4px" }}
                      onClick={() => posterInputRef.current?.click()}
                    >
                      पोस्टर बदलें
                    </button>
                  </div>
                )}
              </div>

              {/* Column 3: Excel Voter Data Upload */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <h4 style={{ margin: "0 0 4px", fontSize: "14.5px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                  📊 3. वार्ड वोटर लिस्ट डेटा (Excel Upload)
                </h4>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                  इस वार्ड के सभी मतदाताओं की एक्सेल (.xlsx / .csv) फ़ाइल अपलोड करें।
                </p>

                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleExcelUpload(f);
                  }}
                />

                <div
                  className="saUploadDropzone"
                  onClick={() => excelInputRef.current?.click()}
                  style={{ borderColor: parsedVoters.length > 0 ? "#10b981" : "#cbd5e1", background: parsedVoters.length > 0 ? "#f0fdf4" : "#f8fafc" }}
                >
                  <FileSpreadsheet size={32} color={parsedVoters.length > 0 ? "#10b981" : "#0284c7"} />
                  {isParsingExcel ? (
                    <span style={{ fontSize: "13px", color: "#0284c7", fontWeight: 700 }}>
                      <RefreshCw size={14} className="spin" /> एक्सेल फ़ाइल पार्स हो रही है...
                    </span>
                  ) : parsedVoters.length > 0 ? (
                    <>
                      <b style={{ fontSize: "13.5px", color: "#065f46" }}>✓ {excelFileName}</b>
                      <span style={{ fontSize: "12px", color: "#047857", fontWeight: 700 }}>
                        {parsedVoters.length.toLocaleString()} मतदाता रिकॉर्ड्स लोड हो गए!
                      </span>
                      <button
                        type="button"
                        className="outline"
                        style={{ padding: "4px 10px", fontSize: "11px", pointerEvents: "none" }}
                      >
                        दूसरी फ़ाइल चुनें
                      </button>
                    </>
                  ) : (
                    <>
                      <b style={{ fontSize: "13.5px", color: "#0f172a" }}>वार्ड वोटर एक्सेल फ़ाइल चुनें</b>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>.xlsx, .xls, .csv (11 कॉलम स्वतः मैच होंगे)</span>
                      <button
                        type="button"
                        className="outline"
                        style={{ padding: "4px 12px", fontSize: "12px", pointerEvents: "none" }}
                      >
                        फ़ाइल ब्राउज़ करें
                      </button>
                    </>
                  )}
                </div>

                <div style={{ fontSize: "11.5px", color: "#475569", background: "#f1f5f9", padding: "8px 10px", borderRadius: "8px" }}>
                  💡 <b>कॉलम्स:</b> भाग सं., क्र. सं., नाम, पिता/पति, वोट डाला, सपोर्टर, बाहर, मोबाइल, मकान, एड्रेस, बूथ पता।
                </div>
              </div>
            </div>

            {/* Credentials Live Preview Section */}
            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                <div>
                  <h4 style={{ margin: "0 0 2px", fontSize: "15px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                    🔑 4. जनरेट होने वाले पासवर्ड्स प्रीव्यू ({credentials.length} Accounts)
                  </h4>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                    हर बूथ पर 1 कैंडिडेट पासवर्ड और 3 कार्यकर्ता पासवर्ड तैयार हैं।
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {/* Booth Filter Chips */}
                  <select
                    value={previewBoothFilter}
                    onChange={(e) => setPreviewBoothFilter(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", fontWeight: 700, color: "#334155" }}
                  >
                    <option value="ALL">सभी बूथ देखें ({credentials.length})</option>
                    {Array.from({ length: boothCount }, (_, i) => i + 1).map((b) => (
                      <option key={b} value={String(b)}>बूथ {b} के 4 पासवर्ड्स</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="outline"
                    style={{ padding: "6px 10px", fontSize: "12px" }}
                    onClick={() => setCredentials(generateCredsList(boothCount, candName, candPhone))}
                    title="रैंडम पिन री-जनरेट करें"
                  >
                    <RefreshCw size={12} /> री-जनरेट
                  </button>
                </div>
              </div>

              {/* Grid of Credentials */}
              <div className="saCredGrid">
                {credentials
                  .filter((c) => previewBoothFilter === "ALL" || c.boothNumber === previewBoothFilter)
                  .map((c, idx) => (
                    <div
                      key={idx}
                      className={`saCredCard ${c.role === "CANDIDATE_ADMIN" ? "candidate" : "karyakarta"}`}
                    >
                      <div className="saCredHeader">
                        <span className={`saCredRoleBadge ${c.role === "CANDIDATE_ADMIN" ? "cand" : "kary"}`}>
                          {c.role === "CANDIDATE_ADMIN" ? "👑 कैंडिडेट पासवर्ड" : "👤 कार्यकर्ता पासवर्ड"}
                        </span>
                        <span className="saCredBoothBadge">बूथ {c.boothNumber}</span>
                      </div>

                      <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>
                        {c.name}
                      </div>

                      <div className="saCredRow">
                        <span style={{ color: "#64748b" }}>📱 मोबाइल / लॉगिन:</span>
                        <b style={{ color: "#0f172a" }}>{c.phone}</b>
                      </div>

                      <div className="saCredRow">
                        <span style={{ color: "#64748b" }}>🔒 पासवर्ड:</span>
                        <span className="saCredPassBox" style={{ letterSpacing: "0.5px", fontSize: "11px", color: "#0369a1", background: "#f0f9ff", border: "1px dashed #7dd3fc" }}>
                          [8-अंकीय पिन स्वतः जनरेट होगा]
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Final Action Submission Bar */}
            <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1.5px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ fontSize: "13px", color: "#475569" }}>
                {parsedVoters.length > 0 ? (
                  <span>✅ <b>{parsedVoters.length}</b> वोटर्स + <b>{posterPreview ? "1 पोस्टर" : "डिफ़ॉल्ट पोस्टर"}</b> + <b>{credentials.length}</b> पासवर्ड्स तैयार</span>
                ) : (
                  <span>⚠️ एक्सेल फ़ाइल वैकल्पिक है। यदि अभी अपलोड नहीं करेंगे तो बाद में भी कर सकते हैं।</span>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="primary"
                  style={{ padding: "12px 28px", fontSize: "14.5px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px", borderRadius: "8px", boxShadow: "0 4px 14px rgba(0, 98, 204, 0.35)" }}
                  disabled={isActivating}
                  onClick={handleActivateSetup}
                >
                  <Sparkles size={16} />
                  {isActivating ? "सक्रिय किया जा रहा है..." : `🚀 वार्ड डेटा, पोस्टर एवं सभी ${credentials.length} पासवर्ड एक्टिवेट करें`}
                </button>
              </div>
            </div>
          </div>
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
                      <select
                        value={cand.status || "ACTIVE"}
                        onChange={(e) => handleUpdateCandidateStatus(cand.id, e.target.value as AccountStatus)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                          border: "1px solid",
                          borderColor: cand.status === "ACTIVE" ? "#86efac" : cand.status === "SUSPENDED" ? "#fde047" : "#fca5a5",
                          background: cand.status === "ACTIVE" ? "#f0fdf4" : cand.status === "SUSPENDED" ? "#fefce8" : "#fef2f2",
                          color: cand.status === "ACTIVE" ? "#166534" : cand.status === "SUSPENDED" ? "#854d0e" : "#991b1b",
                          cursor: "pointer",
                        }}
                      >
                        <option value="ACTIVE">✅ Active</option>
                        <option value="SUSPENDED">⏸️ Suspended</option>
                        <option value="DISABLED">❌ Disabled</option>
                      </select>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="outline"
                          style={{ padding: "6px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px", background: "#f0fdf4", color: "#166534", borderColor: "#86efac", fontWeight: 700 }}
                          onClick={() => {
                            setSaUploadCand(cand);
                            setSaUploadFileName("");
                            setSaParsedVoters([]);
                          }}
                          title="इस प्रत्याशी के लिए Excel वोटर लिस्ट अपलोड करें (Super Admin Only)"
                        >
                          <Upload size={13} /> 📁 Excel अपलोड
                        </button>
                        <button
                          type="button"
                          className="outline"
                          style={{ padding: "6px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px", background: "#eff6ff", color: "#1d4ed8", borderColor: "#93c5fd", fontWeight: 700 }}
                          onClick={() => {
                            setSaAddVoterCand(cand);
                            setSaVoterForm({
                              name: "",
                              guardian: "",
                              booth: "1",
                              serialNo: "",
                              epic: "",
                              age: "35",
                              gender: "Male",
                              phone: "",
                              house: "",
                              address: "",
                              boothAddress: "",
                              voted: "नहीं",
                              isSupporter: "हाँ",
                              isOutside: "नहीं",
                            });
                          }}
                          title="इस प्रत्याशी में नया एकल वोटर जोड़ें (Super Admin Only)"
                        >
                          <Plus size={13} /> + नया वोटर
                        </button>
                        <button
                          type="button"
                          className="outline"
                          style={{ padding: "6px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          onClick={() => {
                            const creds = store.getCandidateUsers(cand.id);
                            setViewCredsModal({ candidate: cand, creds });
                          }}
                          title="इस प्रत्याशी के टीम खाते व पासवर्ड स्थिति देखें"
                        >
                          <Key size={13} /> 👥 टीम खाते
                        </button>
                        <button
                          type="button"
                          className="outline"
                          style={{
                            padding: "6px 10px",
                            fontSize: "12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            color: "#b91c1c",
                            borderColor: "#fca5a5",
                            background: "#fef2f2",
                            fontWeight: 700,
                          }}
                          onClick={() => handleResetCandidatePassword(cand)}
                          title="इस प्रत्याशी के लिए नया 8-अंकीय पासवर्ड रीसेट करें (सत्र तुरंत समाप्त होगा)"
                        >
                          <Key size={13} /> 🔄 Reset Password
                        </button>
                        <button
                          className="primary"
                          style={{ padding: "6px 12px", fontSize: "12px" }}
                          onClick={() => onSelectCandidate(cand.id)}
                        >
                          Open Workspace ›
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Credentials Export & View Modal */}
      {viewCredsModal && (
        <div className="modalOverlay" onClick={() => setViewCredsModal(null)}>
          <div className="modalBox" style={{ maxWidth: "850px", width: "95%" }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHead" style={{ background: "#0b224e", color: "#ffffff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Key size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, color: "#ffffff", fontSize: "17px" }}>
                  🔑 {viewCredsModal.candidate.name} ({viewCredsModal.candidate.wardConstituency}) - लॉगिन क्रेडेंशियल्स
                </h3>
              </div>
              <button onClick={() => setViewCredsModal(null)} style={{ color: "#ffffff" }}><X /></button>
            </div>

            <div className="modalBody">
              {/* Top Details & Action Row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "16px", background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                    {viewCredsModal.candidate.name} ({viewCredsModal.candidate.party})
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {viewCredsModal.candidate.electionName} • कुल {viewCredsModal.candidate.boothCount} बूथ • {viewCredsModal.creds.length} टीम खाते
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="primary"
                    style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px", background: "#0284c7", borderColor: "#0284c7" }}
                    onClick={() => {
                      setKaryakartaForm({
                        name: "",
                        phone: "",
                        roleTitle: "Booth Worker",
                        ward: viewCredsModal.candidate.wardConstituency,
                        booth: "1",
                        area: "",
                        status: "ACTIVE",
                      });
                      setShowAddKaryakartaModal(viewCredsModal.candidate);
                    }}
                  >
                    <Plus size={14} /> + नया कार्यकर्ता जोड़ें
                  </button>

                  <button
                    type="button"
                    className="outline"
                    style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px", background: "#ffffff" }}
                    onClick={() => downloadCredentialsExcel(viewCredsModal.candidate, viewCredsModal.creds)}
                  >
                    <Download size={14} /> 📥 टीम लिस्ट Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    className="primary"
                    style={{ padding: "6px 12px", fontSize: "12px" }}
                    onClick={() => {
                      setViewCredsModal(null);
                      onSelectCandidate(viewCredsModal.candidate.id);
                    }}
                  >
                    ⚡ ऐप खोलें ›
                  </button>
                </div>
              </div>

              {/* Booth Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>बूथ फ़िल्टर:</span>
                <select
                  value={modalBoothFilter}
                  onChange={(e) => setModalBoothFilter(e.target.value)}
                  style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", fontWeight: 700 }}
                >
                  <option value="ALL">सभी बूथ ({viewCredsModal.creds.length} खाते)</option>
                  {Array.from(new Set(viewCredsModal.creds.map((c) => c.boothNumber))).map((b) => (
                    <option key={b} value={b}>बूथ {b}</option>
                  ))}
                </select>
              </div>

              {/* Table of Credentials (NO PASSWORDS DISPLAYED) */}
              <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                  <thead style={{ background: "#f1f5f9", position: "sticky", top: 0, zIndex: 2 }}>
                    <tr>
                      <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>भूमिका / रोल</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>नाम</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>बूथ</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>मोबाइल / लॉगिन</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>खाता स्थिति</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>पासवर्ड स्थिति</th>
                      <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "1px solid #cbd5e1" }}>कार्रवाई</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewCredsModal.creds
                      .filter((c) => modalBoothFilter === "ALL" || c.boothNumber === modalBoothFilter)
                      .map((c, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", background: c.role === "CANDIDATE_ADMIN" ? "#f0f9ff" : "#ffffff" }}>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: c.role === "CANDIDATE_ADMIN" ? "#dbeafe" : "#d1fae5",
                              color: c.role === "CANDIDATE_ADMIN" ? "#1d4ed8" : "#047857"
                            }}>
                              {c.role === "CANDIDATE_ADMIN" ? "कैंडिडेट" : "कार्यकर्ता"}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0f172a" }}>{c.name}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, fontSize: "11px" }}>
                              बूथ {c.boothNumber}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: "#0369a1" }}>{c.phone}</td>
                          
                          {/* Account Status Switcher */}
                          <td style={{ padding: "8px 12px" }}>
                            <select
                              value={c.status || "ACTIVE"}
                              onChange={(e) => handleUpdateStatus(c.id, e.target.value as AccountStatus)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                border: "1px solid",
                                borderColor: c.status === "ACTIVE" ? "#86efac" : c.status === "SUSPENDED" ? "#fde047" : "#fca5a5",
                                background: c.status === "ACTIVE" ? "#f0fdf4" : c.status === "SUSPENDED" ? "#fefce8" : "#fef2f2",
                                color: c.status === "ACTIVE" ? "#166534" : c.status === "SUSPENDED" ? "#854d0e" : "#991b1b",
                                cursor: "pointer",
                              }}
                            >
                              <option value="ACTIVE">✅ Active</option>
                              <option value="SUSPENDED">⏸️ Suspended</option>
                              <option value="DISABLED">❌ Disabled</option>
                            </select>
                          </td>

                          {/* Password Status */}
                          <td style={{ padding: "8px 12px" }}>
                            {c.mustChangePassword ? (
                              <span style={{ background: "#fef3c7", color: "#92400e", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                                ⚠️ अस्थायी जारी
                              </span>
                            ) : (
                              <span style={{ background: "#ecfdf5", color: "#065f46", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                                ✅ सक्रिय सेट
                              </span>
                            )}
                          </td>

                          {/* Reset Password Action */}
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <button
                              type="button"
                              className="outline"
                              style={{
                                padding: "4px 10px",
                                fontSize: "11.5px",
                                color: "#b91c1c",
                                borderColor: "#fca5a5",
                                background: "#fef2f2",
                                fontWeight: 700,
                                borderRadius: "6px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                              onClick={() => handleResetPassword(c.id, c.name, c.roleTitle, c.phone)}
                              title="पुराना पासवर्ड हटाकर नया 8-अंकीय अस्थायी पासवर्ड जारी करें"
                            >
                              <Key size={12} /> Reset Password
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
                <button type="button" className="outline" onClick={() => setViewCredsModal(null)}>
                  बंद करें (Close)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ONE-TIME TEMPORARY CREDENTIALS DISPLAY MODAL (SHOWN ONLY ONCE!)
          ===================================================================== */}
      {oneTimeCreds && (
        <div className="modalOverlay" style={{ zIndex: 9999999 }}>
          <div
            className="modalBox"
            style={{
              maxWidth: "520px",
              width: "95%",
              textAlign: "center",
              border: "2px solid #2563eb",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <div style={{ fontSize: "44px", marginBottom: "4px" }}>🔐</div>
            <h3 style={{ fontSize: "19px", fontWeight: 900, color: "#0f172a", margin: "0 0 6px" }}>
              अस्थायी लॉगिन क्रेडेंशियल (Temporary Credentials)
            </h3>

            {/* Crucial Security Warning */}
            <div
              style={{
                background: "#fef3c7",
                border: "1.5px solid #f59e0b",
                color: "#92400e",
                padding: "12px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                textAlign: "left",
                margin: "12px 0 16px",
                lineHeight: "1.5",
              }}
            >
              ⚠️ <b>महत्वपूर्ण सुरक्षा निर्देश / Security Notice:</b>
              <p style={{ margin: "4px 0 0", fontSize: "12.5px" }}>
                These temporary credentials will be shown only once. Please share them securely with the authorized user.
              </p>
              <small style={{ display: "block", marginTop: "4px", color: "#b45309" }}>
                (यह 8-अंकीय पासवर्ड केवल एक बार स्क्रीन पर दिखेगा। विंडो बंद करने के बाद इसे दोबारा देखना संभव नहीं होगा।)
              </small>
            </div>

            {/* Credential Details Card */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "12px",
                padding: "16px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 700 }}>नाम (Name):</span>
                <b style={{ color: "#0f172a", fontSize: "14px" }}>{oneTimeCreds.name}</b>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 700 }}>भूमिका (Role):</span>
                <span style={{ color: "#1d4ed8", fontWeight: 800, fontSize: "13px" }}>{oneTimeCreds.roleTitle}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 700 }}>लॉगिन आईडी / मोबाइल:</span>
                <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: "16px", color: "#0f172a" }}>
                  {oneTimeCreds.phone}
                </span>
              </div>

              <div style={{ marginTop: "6px", paddingTop: "10px", borderTop: "1.5px dashed #cbd5e1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ color: "#b91c1c", fontSize: "12.5px", fontWeight: 800 }}>
                    🔒 जनरेटेड 8-अंकीय पासवर्ड:
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>(Numeric 8-Digits)</span>
                </div>
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "2px solid #10b981",
                    borderRadius: "8px",
                    padding: "10px",
                    fontSize: "24px",
                    fontWeight: 900,
                    fontFamily: "monospace",
                    letterSpacing: "4px",
                    color: "#065f46",
                    textAlign: "center",
                  }}
                >
                  {oneTimeCreds.tempPassword}
                </div>
              </div>
            </div>

            {/* Modal Buttons */}
            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button
                type="button"
                onClick={() => {
                  const msg =
                    `🇮🇳 *VoterDesk लॉगिन क्रेडेंशियल*\n` +
                    `👤 *नाम:* ${oneTimeCreds.name}\n` +
                    `👑 *भूमिका:* ${oneTimeCreds.roleTitle}\n` +
                    `📱 *लॉगिन आईडी / मोबाइल:* ${oneTimeCreds.phone}\n` +
                    `🔒 *अस्थायी पासवर्ड:* ${oneTimeCreds.tempPassword}\n` +
                    `🌐 *लॉगिन लिंक:* ${window.location.origin}\n\n` +
                    `⚠️ *नोट:* प्रथम लॉगिन पर आपको नया पासवर्ड बनाना अनिवार्य होगा।`;
                  navigator.clipboard.writeText(msg);
                  setCopiedOneTimeCreds(true);
                  setTimeout(() => setCopiedOneTimeCreds(false), 3000);
                }}
                style={{
                  flex: 1,
                  background: "#16a34a",
                  color: "#ffffff",
                  border: 0,
                  borderRadius: "10px",
                  padding: "12px",
                  fontWeight: 800,
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 3px 8px rgba(22, 163, 74, 0.3)",
                }}
              >
                <Copy size={16} /> {copiedOneTimeCreds ? "✓ कॉपी हो गया!" : "Copy Credentials"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOneTimeCreds(null);
                  setCopiedOneTimeCreds(false);
                }}
                style={{
                  background: "#1e293b",
                  color: "#ffffff",
                  border: 0,
                  borderRadius: "10px",
                  padding: "12px 18px",
                  fontWeight: 700,
                  fontSize: "13.5px",
                  cursor: "pointer",
                }}
              >
                मैंने नोट कर लिया (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ADD KARYAKARTA MODAL (SUPER ADMIN EXCLUSIVE)
          ===================================================================== */}
      {showAddKaryakartaModal && (
        <div className="modalOverlay" onClick={() => setShowAddKaryakartaModal(null)}>
          <div className="modalBox" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHead" style={{ background: "#0b224e", color: "#ffffff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Plus size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, color: "#ffffff", fontSize: "16px" }}>
                  नया कार्यकर्ता जोड़ें - {showAddKaryakartaModal.name}
                </h3>
              </div>
              <button onClick={() => setShowAddKaryakartaModal(null)} style={{ color: "#ffffff" }}><X /></button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!karyakartaForm.name.trim() || !karyakartaForm.phone.trim()) {
                  alert("कृपया कार्यकर्ता का नाम और मोबाइल नंबर भरें!");
                  return;
                }

                try {
                  const result = store.createKaryakartaWithUser(
                    {
                      name: karyakartaForm.name.trim(),
                      phone: karyakartaForm.phone.trim(),
                      candidateId: showAddKaryakartaModal.id,
                      roleTitle: karyakartaForm.roleTitle || "Field Worker",
                      assignedBooths: [karyakartaForm.booth || "1"],
                      status: karyakartaForm.status,
                    },
                    user.id,
                    user.name
                  );

                  // Refresh creds in viewCredsModal if open
                  if (viewCredsModal) {
                    setViewCredsModal({
                      ...viewCredsModal,
                      creds: store.getCandidateUsers(showAddKaryakartaModal.id),
                    });
                  }

                  setShowAddKaryakartaModal(null);

                  // Open One-Time Credentials Modal
                  setOneTimeCreds({
                    name: result.teamMember.name,
                    phone: result.teamMember.phone,
                    tempPassword: result.tempPassword,
                    roleTitle: result.teamMember.roleTitle,
                    ward: showAddKaryakartaModal.wardConstituency,
                  });
                } catch (err) {
                  alert("कार्यकर्ता जोड़ने में त्रुटि: " + (err instanceof Error ? err.message : String(err)));
                }
              }}
              className="modalBody"
            >
              <div className="formGroup">
                <label>कार्यकर्ता का पूरा नाम (Full Name) *</label>
                <input
                  required
                  placeholder="उदा: रमेश कुमार"
                  value={karyakartaForm.name}
                  onChange={(e) => setKaryakartaForm({ ...karyakartaForm, name: e.target.value })}
                />
              </div>

              <div className="inputGrid">
                <div className="formGroup">
                  <label>मोबाइल नंबर (Login Mobile) *</label>
                  <input
                    required
                    placeholder="उदा: 98290XXXXX"
                    value={karyakartaForm.phone}
                    onChange={(e) => setKaryakartaForm({ ...karyakartaForm, phone: e.target.value })}
                  />
                </div>

                <div className="formGroup">
                  <label>आवंटित पोलिंग बूथ (Booth No) *</label>
                  <input
                    required
                    placeholder="उदा: 1 या 14"
                    value={karyakartaForm.booth}
                    onChange={(e) => setKaryakartaForm({ ...karyakartaForm, booth: e.target.value })}
                  />
                </div>
              </div>

              <div className="inputGrid">
                <div className="formGroup">
                  <label>पद / पदनाम (Role Title)</label>
                  <select
                    value={karyakartaForm.roleTitle}
                    onChange={(e) => setKaryakartaForm({ ...karyakartaForm, roleTitle: e.target.value })}
                  >
                    <option value="Booth Supervisor">बूथ प्रभारी (Booth Supervisor)</option>
                    <option value="Field Worker">फील्ड कार्यकर्ता (Field Worker)</option>
                    <option value="Data Operator">डाटा ऑपरेटर (Data Operator)</option>
                  </select>
                </div>

                <div className="formGroup">
                  <label>खाता स्थिति (Account Status)</label>
                  <select
                    value={karyakartaForm.status}
                    onChange={(e) => setKaryakartaForm({ ...karyakartaForm, status: e.target.value as AccountStatus })}
                  >
                    <option value="ACTIVE">सक्रिय (Active)</option>
                    <option value="SUSPENDED">निलंबित (Suspended)</option>
                    <option value="DISABLED">निष्क्रिय (Disabled)</option>
                  </select>
                </div>
              </div>

              <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", padding: "10px", borderRadius: "8px", fontSize: "12px", color: "#475569" }}>
                🔒 सिस्टम इस कार्यकर्ता के लिए एक विशिष्ट <b>8-अंकीय रैंडम पासवर्ड</b> जनरेट करेगा जो केवल एक बार स्क्रीन पर प्रदर्शित होगा।
              </div>

              <div className="formFoot" style={{ marginTop: "18px" }}>
                <button type="button" className="outline" onClick={() => setShowAddKaryakartaModal(null)}>
                  रद्द करें (Cancel)
                </button>
                <button type="submit" className="primary">
                  कार्यकर्ता खाता बनाएं व पासवर्ड जनरेट करें ➤
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin - Dedicated Excel Upload Modal for Existing Candidate */}
      {saUploadCand && (
        <div className="modalOverlay" onClick={() => setSaUploadCand(null)}>
          <div className="modalBox" style={{ maxWidth: "720px", width: "95%" }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHead" style={{ background: "#0b224e", color: "#ffffff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileSpreadsheet size={20} color="#38bdf8" />
                <div>
                  <h3 style={{ margin: 0, color: "#ffffff", fontSize: "16px" }}>
                    Excel वोटर लिस्ट अपलोड - {saUploadCand.name}
                  </h3>
                  <small style={{ color: "#94a3b8" }}>
                    {saUploadCand.wardConstituency} • कुल बूथ: {saUploadCand.boothCount}
                  </small>
                </div>
              </div>
              <button onClick={() => setSaUploadCand(null)} style={{ color: "#ffffff" }}><X /></button>
            </div>

            <div className="modalBody" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "14px", color: "#334155", fontWeight: 600 }}>
                    वोटर लिस्ट (.xlsx, .xls, .csv) चुनें
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                    कैंडिडेट के लिए पूरी वोटर लिस्ट स्वतः पार्स व सिंक होगी
                  </p>
                </div>
                <button
                  type="button"
                  className="outline"
                  style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  onClick={downloadSampleExcelTemplate}
                >
                  <Download size={14} /> 11-कॉलम टेम्पलेट (.xlsx)
                </button>
              </div>

              {/* Upload Dropzone */}
              <input
                type="file"
                ref={saExcelInputRef}
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={handleSaExcelSelect}
              />
              <div
                onClick={() => saExcelInputRef.current?.click()}
                style={{
                  border: "2px dashed #94a3b8",
                  borderRadius: "10px",
                  padding: "28px 16px",
                  textAlign: "center",
                  background: saParsedVoters.length > 0 ? "#f0fdf4" : "#f8fafc",
                  borderColor: saParsedVoters.length > 0 ? "#16a34a" : "#cbd5e1",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {isParsingSaExcel ? (
                  <div style={{ color: "#0284c7" }}>
                    <RefreshCw className="animate-spin" size={32} style={{ margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>Excel फ़ाइल पार्स की जा रही है...</p>
                  </div>
                ) : saParsedVoters.length > 0 ? (
                  <div>
                    <CheckCircle2 size={36} color="#16a34a" style={{ margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontWeight: 700, color: "#15803d", fontSize: "15px" }}>
                      {saUploadFileName}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#166534" }}>
                      ✅ {saParsedVoters.length} मतदाता सफलतापूर्वक पार्स हो चुके हैं!
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#64748b" }}>
                      (फ़ाइल बदलने के लिए यहाँ दोबारा क्लिक करें)
                    </p>
                  </div>
                ) : (
                  <div>
                    <Upload size={36} color="#64748b" style={{ margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontWeight: 600, color: "#1e293b", fontSize: "14px" }}>
                      यहाँ क्लिक करके Excel या CSV फ़ाइल चुनें
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
                      समर्थित प्रारूप: .xlsx, .xls, .csv
                    </p>
                  </div>
                )}
              </div>

              {/* Preview of Parsed Voters */}
              {saParsedVoters.length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                      डेटा पूर्वावलोकन (Preview - पहले 5 रिकॉर्ड्स):
                    </span>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      कुल: <b>{saParsedVoters.length}</b> मतदाता
                    </span>
                  </div>
                  <div style={{ maxHeight: "180px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                    <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#f1f5f9", textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
                          <th style={{ padding: "6px 8px" }}>क्र.</th>
                          <th style={{ padding: "6px 8px" }}>नाम</th>
                          <th style={{ padding: "6px 8px" }}>पिता/पति</th>
                          <th style={{ padding: "6px 8px" }}>आयु</th>
                          <th style={{ padding: "6px 8px" }}>बूथ</th>
                          <th style={{ padding: "6px 8px" }}>EPIC</th>
                          <th style={{ padding: "6px 8px" }}>मोबाइल</th>
                        </tr>
                      </thead>
                      <tbody>
                        {saParsedVoters.slice(0, 5).map((v, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "6px 8px" }}>{v.serialNo || i + 1}</td>
                            <td style={{ padding: "6px 8px", fontWeight: 600 }}>{v.name}</td>
                            <td style={{ padding: "6px 8px" }}>{v.guardian || "-"}</td>
                            <td style={{ padding: "6px 8px" }}>{v.age || "-"}</td>
                            <td style={{ padding: "6px 8px" }}>{v.booth}</td>
                            <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{v.epic}</td>
                            <td style={{ padding: "6px 8px" }}>{v.phone || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="outline"
                  onClick={() => {
                    setSaUploadCand(null);
                    setSaUploadFileName("");
                    setSaParsedVoters([]);
                  }}
                >
                  ✕ रद्द करें (Cancel)
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={saParsedVoters.length === 0}
                  style={{
                    opacity: saParsedVoters.length === 0 ? 0.6 : 1,
                    cursor: saParsedVoters.length === 0 ? "not-allowed" : "pointer",
                    background: "#026aa7",
                    color: "#ffffff",
                    fontWeight: 600,
                  }}
                  onClick={handleSaveSaExcel}
                >
                  💾 {saParsedVoters.length > 0 ? `${saParsedVoters.length} मतदाता सुरक्षित करें (Save)` : "मतदाता सुरक्षित करें"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin - Dedicated Add Single Voter Modal for Existing Candidate */}
      {saAddVoterCand && (
        <div className="modalOverlay" onClick={() => setSaAddVoterCand(null)}>
          <div className="modalBox" style={{ maxWidth: "680px", width: "95%" }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHead" style={{ background: "#0b224e", color: "#ffffff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Plus size={20} color="#38bdf8" />
                <div>
                  <h3 style={{ margin: 0, color: "#ffffff", fontSize: "16px" }}>
                    + नया मतदाता जोड़ें (Super Admin)
                  </h3>
                  <small style={{ color: "#94a3b8" }}>
                    प्रत्याशी: {saAddVoterCand.name} ({saAddVoterCand.wardConstituency})
                  </small>
                </div>
              </div>
              <button onClick={() => setSaAddVoterCand(null)} style={{ color: "#ffffff" }}><X /></button>
            </div>

            <form onSubmit={handleSaveSaSingleVoter} className="modalBody" style={{ padding: "20px" }}>
              <div className="inputGrid">
                <div className="formGroup">
                  <label>मतदाता का पूरा नाम (Full Name) *</label>
                  <input
                    required
                    placeholder="उदा. रमेश कुमार शर्मा"
                    value={saVoterForm.name}
                    onChange={(e) => setSaVoterForm({ ...saVoterForm, name: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>EPIC (Voter ID / पहचान पत्र क्र.)</label>
                  <input
                    placeholder="उदा. RJX1029384 (खाली रहने पर स्वतः जेनरेट होगा)"
                    value={saVoterForm.epic}
                    onChange={(e) => setSaVoterForm({ ...saVoterForm, epic: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="formGroup">
                <label>पिता / पति / अभिभावक का नाम (Guardian)</label>
                <input
                  placeholder="उदा. सोहन लाल"
                  value={saVoterForm.guardian}
                  onChange={(e) => setSaVoterForm({ ...saVoterForm, guardian: e.target.value })}
                />
              </div>

              <div className="inputGrid">
                <div className="formGroup">
                  <label>आयु (Age)</label>
                  <input
                    type="number"
                    value={saVoterForm.age}
                    onChange={(e) => setSaVoterForm({ ...saVoterForm, age: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>लिंग (Gender)</label>
                  <select
                    value={saVoterForm.gender}
                    onChange={(e) => setSaVoterForm({ ...saVoterForm, gender: e.target.value })}
                  >
                    <option value="Male">पुरुष (Male)</option>
                    <option value="Female">महिला (Female)</option>
                    <option value="Other">अन्य (Other)</option>
                  </select>
                </div>
              </div>

              <div className="inputGrid">
                <div className="formGroup">
                  <label>बूथ / भाग संख्या (Booth Number) *</label>
                  <input
                    required
                    placeholder="उदा. 1"
                    value={saVoterForm.booth}
                    onChange={(e) => setSaVoterForm({ ...saVoterForm, booth: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>क्रम संख्या (Serial Number)</label>
                  <input
                    type="number"
                    placeholder="उदा. 101 (खाली रहने पर स्वतः)"
                    value={saVoterForm.serialNo}
                    onChange={(e) => setSaVoterForm({ ...saVoterForm, serialNo: e.target.value })}
                  />
                </div>
              </div>

              <div className="inputGrid">
                <div className="formGroup">
                  <label>मकान नंबर (House No.)</label>
                  <input
                    placeholder="उदा. 42-A"
                    value={saVoterForm.house}
                    onChange={(e) => setSaVoterForm({ ...saVoterForm, house: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>मोबाइल नंबर (Mobile No.)</label>
                  <input
                    placeholder="उदा. 9829012345"
                    value={saVoterForm.phone}
                    onChange={(e) => setSaVoterForm({ ...saVoterForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="inputGrid">
                <div className="formGroup">
                  <label>पता / वार्ड (Address / Ward)</label>
                  <input
                    placeholder="उदा. वार्ड 12, मेन मार्केट"
                    value={saVoterForm.address}
                    onChange={(e) => setSaVoterForm({ ...saVoterForm, address: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>मतदान केंद्र पता (Booth Address)</label>
                  <input
                    placeholder="उदा. रा.उ.मा.वि., कमरा नं 1"
                    value={saVoterForm.boothAddress}
                    onChange={(e) => setSaVoterForm({ ...saVoterForm, boothAddress: e.target.value })}
                  />
                </div>
              </div>

              <div className="inputGrid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <div className="formGroup">
                  <label>🗳️ वोट डाला (Voted)</label>
                  <select
                    value={saVoterForm.voted}
                    onChange={(e) => setSaVoterForm({ ...saVoterForm, voted: e.target.value })}
                  >
                    <option value="नहीं">नहीं (No)</option>
                    <option value="हाँ">हाँ (Yes)</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>⭐ सपोर्टर है (Supporter)</label>
                  <select
                    value={saVoterForm.isSupporter}
                    onChange={(e) => setSaVoterForm({ ...saVoterForm, isSupporter: e.target.value })}
                  >
                    <option value="हाँ">हाँ (Yes)</option>
                    <option value="नहीं">नहीं (No)</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>🚌 बाहर है (Is Outside)</label>
                  <select
                    value={saVoterForm.isOutside}
                    onChange={(e) => setSaVoterForm({ ...saVoterForm, isOutside: e.target.value })}
                  >
                    <option value="नहीं">नहीं (No)</option>
                    <option value="हाँ">हाँ (Yes)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="outline" onClick={() => setSaAddVoterCand(null)}>
                  ✕ रद्द करें (Cancel)
                </button>
                <button type="submit" className="primary" style={{ background: "#026aa7", color: "#ffffff", fontWeight: 600 }}>
                  + नया मतदाता जोड़ें (Add Voter)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <label>Mobile Number / Login ID *</label>
                  <input
                    required
                    placeholder="e.g. 9829012345"
                    value={newCand.phone}
                    onChange={(e) => setNewCand({ ...newCand, phone: e.target.value })}
                  />
                </div>
                <div className="formGroup">
                  <label>Account Status</label>
                  <select
                    value={newCand.status}
                    onChange={(e) => setNewCand({ ...newCand, status: e.target.value as AccountStatus })}
                  >
                    <option value="ACTIVE">✅ Active</option>
                    <option value="SUSPENDED">⏸️ Suspended</option>
                    <option value="DISABLED">❌ Disabled</option>
                  </select>
                </div>
              </div>

              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 12px", borderRadius: "8px", fontSize: "12px", color: "#166534", marginBottom: "16px" }}>
                🔒 <b>सुरक्षा निर्देश:</b> प्रत्याशी के लिए 8-अंकीय रैंडम संख्यात्मक पासवर्ड सर्वर द्वारा स्वतः जनरेट होगा तथा खाता बनने पर केवल एक बार स्क्रीन पर सुरक्षित शेयर करने हेतु प्रदर्शित होगा।
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
  const [selectedFamilyVoterIds, setSelectedFamilyVoterIds] = useState<string[]>([]);
  const [showFamilySlipModal, setShowFamilySlipModal] = useState(false);
  const [isGeneratingFamilyImage, setIsGeneratingFamilyImage] = useState(false);
  const [familySlipGridCols, setFamilySlipGridCols] = useState<number>(2);
  const [isGeneratingSingleImage, setIsGeneratingSingleImage] = useState(false);

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

  // Age column sorting state (Ascending, Descending, None)
  const [ageSortOrder, setAgeSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [showAgeSortMenu, setShowAgeSortMenu] = useState(false);

  // Name column alphabetical sorting state (A-Z / ABCD, Descending, None)
  const [nameSortOrder, setNameSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [showNameSortMenu, setShowNameSortMenu] = useState(false);

  // Candidate Menu dropdown state (Current Page Download, All Voters Download, etc.)
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  // Dynamic extra columns from uploaded Excel sheet
  const extraExcelColumns = useMemo(() => {
    const standardKeys = new Set([
      "id", "candidateId", "booth", "serialNo", "name", "guardian", "age", "gender",
      "house", "address", "boothAddress", "phone", "epic", "voted", "isSupporter",
      "isOutside", "status", "worker", "notes", "slipMessage", "survey", "extraData",
      "voterCount", "createdAt", "updatedAt"
    ]);

    const colsSet = new Set<string>();
    for (const v of voters) {
      if (v.extraData && typeof v.extraData === "object") {
        for (const k of Object.keys(v.extraData)) {
          if (!standardKeys.has(k)) {
            colsSet.add(k);
          }
        }
      }
      for (const k of Object.keys(v)) {
        const val = (v as Record<string, any>)[k];
        if (!standardKeys.has(k) && typeof val !== "object" && typeof val !== "function") {
          colsSet.add(k);
        }
      }
    }
    return Array.from(colsSet);
  }, [voters]);

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
  // LIVE KARYAKARTA GPS LOCATION TRACKER STATES & LOGIC
  // -------------------------------------------------------------
  const [workerLocations, setWorkerLocations] = useState<WorkerLocation[]>([]);
  const [isFetchingLocations, setIsFetchingLocations] = useState<boolean>(false);
  const [locationTab, setLocationTab] = useState<"workers" | "booth">("workers");
  const [focusedWorkerId, setFocusedWorkerId] = useState<string | null>(null);
  const [myGps, setMyGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatusText, setGpsStatusText] = useState<string>("जीपीएस सक्रिय किया जा रहा है...");

  // Broadcast current worker/user GPS to server
  const broadcastMyGps = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsStatusText("जीपीएस उपलब्ध नहीं है");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setMyGps({ lat: latitude, lng: longitude });
        setGpsStatusText(`लाइव सक्रिय (±${Math.round(accuracy)}m)`);
        try {
          await fetch("/api/team/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workerName: user.name || "कार्यकर्ता (Active)",
              workerId: user.id || "worker_current",
              phone: user.phone || "+91 98290 12345",
              roleTitle: user.role === "CANDIDATE_ADMIN" ? "कैंडिडेट (प्रत्याशी)" : "बूथ कार्यकर्ता",
              assignedBooths: [partFilter === "ALL" ? "1" : partFilter],
              candidateId: candidateId || "cand_1",
              lat: latitude,
              lng: longitude,
              accuracy: Math.round(accuracy),
            }),
          });
        } catch (err) {
          console.error("GPS broadcast error:", err);
        }
      },
      (err) => {
        if (err.code === 1) {
          setGpsStatusText("जीपीएस अनुमति नहीं दी गई (डिफ़ॉल्ट वार्ड लोकेशन सक्रिय)");
        } else {
          setGpsStatusText("जीपीएस सिग्नल खोजा जा रहा है...");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [user.id, user.name, user.phone, user.role, candidateId, partFilter]);

  // Fetch all worker locations for this candidate
  const fetchWorkerLocations = useCallback(async () => {
    setIsFetchingLocations(true);
    try {
      const res = await fetch(`/api/team/location?candidateId=${candidateId || "cand_1"}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.locations)) {
          setWorkerLocations(data.locations);
        }
      }
    } catch (err) {
      console.error("Error fetching worker locations:", err);
    } finally {
      setIsFetchingLocations(false);
    }
  }, [candidateId]);

  // Initial broadcast and background watch
  useEffect(() => {
    broadcastMyGps();
    if (typeof window !== "undefined" && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setMyGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatusText(`लाइव सक्रिय (±${Math.round(pos.coords.accuracy)}m)`);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [broadcastMyGps]);

  // When location modal is open, fetch immediately and poll every 8 seconds
  useEffect(() => {
    if (showLocationModal) {
      fetchWorkerLocations();
      broadcastMyGps();
      const interval = setInterval(fetchWorkerLocations, 8000);
      return () => clearInterval(interval);
    }
  }, [showLocationModal, fetchWorkerLocations, broadcastMyGps]);

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

  // Print single voter slip handler
  const handlePrintVoterSlip = () => {
    if (typeof document !== "undefined") {
      document.body.classList.add("printing-single-slip");
    }
    setTimeout(() => {
      window.print();
    }, 50);
  };

  // Sync body class when single slip screen is opened/closed
  useEffect(() => {
    if (showPrintSlipScreen || showSlipModal) {
      document.body.classList.add("printing-single-slip");
    } else {
      document.body.classList.remove("printing-single-slip");
    }
    const handleAfterPrint = () => {
      if (!showPrintSlipScreen && !showSlipModal) {
        document.body.classList.remove("printing-single-slip");
      }
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      document.body.classList.remove("printing-single-slip");
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [showPrintSlipScreen, showSlipModal]);

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
    const h = activeActionVoter.house || "";
    const b = activeActionVoter.booth;
    setFamilyFilter({ house: h, booth: b });

    // Pre-select matching family members up to 6
    const matching = voters.filter((v) => v.booth === b && (v.house || "") === h);
    setSelectedFamilyVoterIds(matching.slice(0, 6).map((v) => v.id));

    setActiveActionVoter(null);
    setLocalToast(`👨‍👩‍👧‍👦 मकान नं. ${h || "—"} के परिवारजन फ़िल्टर हो गए! (${matching.length} सदस्य)`);
    setTimeout(() => setLocalToast(""), 3500);
  };

  const selectedFamilyVoters = useMemo(() => {
    return voters.filter((v) => selectedFamilyVoterIds.includes(v.id));
  }, [voters, selectedFamilyVoterIds]);

  // Sync body class when A4 family slip modal is open
  useEffect(() => {
    if (showFamilySlipModal) {
      document.body.classList.add("printing-a4-family-slip");
    } else {
      document.body.classList.remove("printing-a4-family-slip");
    }
    const handleAfterPrint = () => {
      if (!showFamilySlipModal) {
        document.body.classList.remove("printing-a4-family-slip");
      }
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      document.body.classList.remove("printing-a4-family-slip");
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [showFamilySlipModal]);

  // A4 Family Voter Slip Print
  const handlePrintFamilyA4 = () => {
    if (typeof document !== "undefined") {
      document.body.classList.add("printing-a4-family-slip");
    }
    setTimeout(() => {
      window.print();
    }, 50);
  };

  // High-Resolution A4 Image Generator (Top A5 Poster + Bottom A5 Slips) via HTML5 Canvas
  const handleDownloadFamilyA4Image = async () => {
    if (selectedFamilyVoters.length === 0) {
      alert("कृपया पहले कम से कम 1 फैमिली मेंबर चेक करें!");
      return;
    }
    setIsGeneratingFamilyImage(true);

    try {
      const canvas = document.createElement("canvas");
      // Standard A4 dimensions at 150 DPI: 1240 x 1754 px
      const w = 1240;
      const h = 1754;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      // 1. Fill white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);

      // 2. Load and draw Top A5 Poster (0 to 860px)
      const posterSrc = candidate?.posterUrl || "/images/campaign-poster.jpg";
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = posterSrc;

      await new Promise<void>((resolve) => {
        img.onload = () => {
          try {
            const topW = w;
            const topH = 860;
            const imgAspect = (img.naturalWidth || img.width || topW) / (img.naturalHeight || img.height || topH);
            const areaAspect = topW / topH;

            let drawW = topW;
            let drawH = topH;
            let drawX = 0;
            let drawY = 0;

            if (imgAspect > areaAspect) {
              // Image is wider than 1.44:1
              drawW = topW;
              drawH = topW / imgAspect;
              drawY = (topH - drawH) / 2;
            } else {
              // Image is taller than 1.44:1 (e.g. portrait or square)
              drawH = topH;
              drawW = topH * imgAspect;
              drawX = (topW - drawW) / 2;
            }

            // Fill clean light background for letterbox padding
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(0, 0, topW, topH);

            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          } catch {}
          resolve();
        };
        img.onerror = () => {
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(0, 0, w, 860);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 48px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(candidate?.name || "प्रत्याशी चुनाव प्रचार", w / 2, 420);
          ctx.font = "bold 28px sans-serif";
          ctx.fillText(candidate?.party ? `पार्टी: ${candidate.party}` : "मतदाता सेवा", w / 2, 480);
          resolve();
        };
      });

      // 3. Draw Cut Line (Divider between Top A5 and Bottom A5)
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(20, 875);
      ctx.lineTo(w - 20, 875);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // Cut badge
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(w / 2 - 100, 862, 200, 26);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w / 2 - 100, 862, 200, 26);
      ctx.fillStyle = "#475569";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✂ यहाँ से काटें / Cut Here", w / 2, 881);

      // 4. Bottom A5: Family Voter Slips (895 to 1735)
      // Header Banner
      ctx.fillStyle = "#0284c7";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`👨‍👩‍👧‍👦 परिवार मतदाता पर्ची / FAMILY VOTER SLIP (मकान नं: ${familyFilter?.house || "—"})`, 40, 920);

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`भाग संख्या: ${familyFilter?.booth || "1"} | कुल सदस्य: ${selectedFamilyVoters.length}`, w - 40, 920);

      // Thin separator line
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 935);
      ctx.lineTo(w - 40, 935);
      ctx.stroke();

      // Slips Grid: 2 columns x 3 rows (ALWAYS 6 slots, empty slots remain blank)
      const slips = selectedFamilyVoters.slice(0, 6);
      const startX = 40;
      const startY = 955;
      const cardW = 565;
      const cardH = 240;
      const gapX = 30;
      const gapY = 20;

      for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
        const col = slotIndex % 2;
        const row = Math.floor(slotIndex / 2);
        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);

        const v = slips[slotIndex];

        if (v) {
          // Draw card background
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x, y, cardW, cardH);

          // Draw dotted border
          ctx.strokeStyle = "#0062cc";
          ctx.lineWidth = 2.5;
          ctx.setLineDash([8, 5]);
          ctx.strokeRect(x, y, cardW, cardH);
          ctx.setLineDash([]); // reset

          // Top blue banner inside card
          ctx.fillStyle = "#eff6ff";
          ctx.fillRect(x + 4, y + 4, cardW - 8, 38);

          ctx.fillStyle = "#1e40af";
          ctx.font = "bold 18px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(`क्रम सं : ${v.serialNo !== undefined ? v.serialNo : slotIndex + 1}`, x + 16, y + 29);
          ctx.textAlign = "right";
          ctx.fillText(`भाग सं : ${v.booth || "—"}`, x + cardW - 16, y + 29);

          // Name
          ctx.fillStyle = "#0f172a";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(`नाम : ${v.name}`, x + 16, y + 74);

          // Guardian
          ctx.fillStyle = "#334155";
          ctx.font = "18px sans-serif";
          ctx.fillText(`पिता/पति : ${v.guardian || "—"}`, x + 16, y + 106);

          // Age & House
          ctx.fillStyle = "#334155";
          ctx.font = "bold 17px sans-serif";
          ctx.fillText(`उम्र : ${v.age ? `${v.age} वर्ष` : "—"}`, x + 16, y + 138);
          ctx.textAlign = "right";
          ctx.fillText(`मकान नं : ${v.house || "—"}`, x + cardW - 16, y + 138);

          // Voter ID (EPIC)
          ctx.textAlign = "left";
          ctx.fillStyle = "#0369a1";
          ctx.font = "bold 18px monospace";
          ctx.fillText(`वोटर ID : ${v.epic}`, x + 16, y + 172);

          // Divider
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 12, y + 186);
          ctx.lineTo(x + cardW - 12, y + 186);
          ctx.stroke();

          // Polling Station / Booth Address
          ctx.fillStyle = "#64748b";
          ctx.font = "14px sans-serif";
          const addrText = `केंद्र : ${v.boothAddress || "रा.उ.मा.वि. मतदान केंद्र"}`;
          ctx.fillText(addrText.length > 48 ? addrText.substring(0, 48) + "..." : addrText, x + 16, y + 214);
        } else {
          // Draw empty / blank card placeholder (preserving the 6-slot geometry, leaving slot blank)
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x, y, cardW, cardH);
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([8, 6]);
          ctx.strokeRect(x, y, cardW, cardH);
          ctx.setLineDash([]);
        }
      }

      // 5. Trigger download as PNG
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const fileName = `Family_Voter_Slip_House_${familyFilter?.house || "Family"}_Part_${familyFilter?.booth || "1"}.png`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setLocalToast(`✅ A4 फैमिली वोटर स्लिप डाउनलोड हो गई! (${fileName})`);
      setTimeout(() => setLocalToast(""), 3500);
    } catch (err) {
      alert("इमेज जनरेट करने में त्रुटि: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGeneratingFamilyImage(false);
    }
  };

  // High-Resolution Single Voter Slip Image Generator (Candidate Poster + Dotted Voter Slip) via HTML5 Canvas
  const generateSingleVoterSlipImage = async (v: VoterRecord): Promise<{ blob: Blob; dataUrl: string } | null> => {
    try {
      const canvas = document.createElement("canvas");
      // Mobile-optimized high-res canvas (850 x 1250 px)
      const w = 850;
      const h = 1250;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // 1. White Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);

      // 2. Top Portion: Candidate Election Poster (0 to 650px)
      const posterSrc = candidate?.posterUrl || "/images/campaign-poster.jpg";
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = posterSrc;

      await new Promise<void>((resolve) => {
        img.onload = () => {
          try {
            const topW = w;
            const topH = 650;
            const imgAspect = (img.naturalWidth || img.width || topW) / (img.naturalHeight || img.height || topH);
            const areaAspect = topW / topH;

            let drawW = topW;
            let drawH = topH;
            let drawX = 0;
            let drawY = 0;

            if (imgAspect > areaAspect) {
              drawW = topW;
              drawH = topW / imgAspect;
              drawY = (topH - drawH) / 2;
            } else {
              drawH = topH;
              drawW = topH * imgAspect;
              drawX = (topW - drawW) / 2;
            }

            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(0, 0, topW, topH);
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          } catch {}
          resolve();
        };
        img.onerror = () => {
          ctx.fillStyle = "#0284c7";
          ctx.fillRect(0, 0, w, 650);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 42px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(candidate?.name || "प्रत्याशी चुनाव प्रचार", w / 2, 300);
          ctx.font = "bold 24px sans-serif";
          ctx.fillText(candidate?.party ? `पार्टी: ${candidate.party}` : "मतदाता सेवा", w / 2, 360);
          resolve();
        };
      });

      // 3. Campaign Message Strip (650 to 710px)
      ctx.fillStyle = "#0b224e";
      ctx.fillRect(0, 650, w, 60);
      ctx.fillStyle = "#fef08a";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      const msg = activeVoterSlipMsg || `vote for ${candidate?.name || "प्रत्याशी"}`;
      ctx.fillText(msg.length > 55 ? msg.substring(0, 55) + "..." : msg, w / 2, 688);

      // 4. Divider / Cut Line (710 to 730px)
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.moveTo(30, 725);
      ctx.lineTo(w - 30, 725);
      ctx.stroke();
      ctx.setLineDash([]);

      // 5. Voter Slip Header Card (745 to 1215px)
      const cardX = 35;
      const cardY = 745;
      const cardW = w - 70;
      const cardH = 475;

      // Card background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cardX, cardY, cardW, cardH);

      // Card Dotted Border
      ctx.strokeStyle = "#0062cc";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 6]);
      ctx.strokeRect(cardX, cardY, cardW, cardH);
      ctx.setLineDash([]);

      // Card Top Ribbon: Serial No (Left) & Part/Booth No (Right)
      ctx.fillStyle = "#eff6ff";
      ctx.fillRect(cardX + 4, cardY + 4, cardW - 8, 55);

      ctx.fillStyle = "#1e40af";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`क्रम सं : ${v.serialNo || "—"}`, cardX + 20, cardY + 40);
      ctx.textAlign = "right";
      ctx.fillText(`भाग सं : ${v.booth || "—"}`, cardX + cardW - 20, cardY + 40);

      // Name (Large Bold)
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`नाम : ${v.name}`, cardX + 20, cardY + 115);

      // Guardian
      ctx.fillStyle = "#334155";
      ctx.font = "24px sans-serif";
      ctx.fillText(`पिता/पति : ${v.guardian || "—"}`, cardX + 20, cardY + 160);

      // Voter ID (EPIC)
      ctx.fillStyle = "#0369a1";
      ctx.font = "bold 26px monospace";
      ctx.fillText(`वोटर ID : ${v.epic}`, cardX + 20, cardY + 205);

      // Age (Left) & House No (Right)
      ctx.fillStyle = "#334155";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(`उम्र : ${v.age ? `${v.age} वर्ष` : "—"}`, cardX + 20, cardY + 250);
      ctx.textAlign = "right";
      ctx.fillText(`मकान नंबर : ${v.house || "—"}`, cardX + cardW - 20, cardY + 250);

      // Thin separator line
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cardX + 16, cardY + 278);
      ctx.lineTo(cardX + cardW - 16, cardY + 278);
      ctx.stroke();

      // Booth Address / Polling Station
      ctx.textAlign = "left";
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("बुथ पता :", cardX + 20, cardY + 312);

      ctx.fillStyle = "#1e293b";
      ctx.font = "20px sans-serif";
      const boothAddr = v.boothAddress || "184 - महात्मा गांधी राजकीय विद्यालय इंग्लिश मीडियम का कमरा नं. 2 चौरसियावास अजमेर";
      if (boothAddr.length > 45) {
        ctx.fillText(boothAddr.substring(0, 45), cardX + 20, cardY + 345);
        ctx.fillText(boothAddr.substring(45, 90), cardX + 20, cardY + 375);
      } else {
        ctx.fillText(boothAddr, cardX + 20, cardY + 345);
      }

      // Bottom appeal strip inside card
      ctx.fillStyle = "#f0fdf4";
      ctx.fillRect(cardX + 4, cardY + cardH - 50, cardW - 8, 46);
      ctx.fillStyle = "#15803d";
      ctx.font = "bold 19px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🗳️ कृपया अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं 🙏", cardX + cardW / 2, cardY + cardH - 20);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      const dataUrl = canvas.toDataURL("image/png");
      if (!blob) return null;
      return { blob, dataUrl };
    } catch (err) {
      console.error("Single voter slip image error:", err);
      return null;
    }
  };

  // 1. Send Single Voter Slip as Text on WhatsApp
  const handleSendSingleVoterSlipText = (v: VoterRecord, targetPhone?: string) => {
    const ph = (targetPhone || activeVoterPhone || v.phone || "").replace(/[^0-9]/g, "");
    const candName = candidate ? candidate.name : "प्रत्याशी";
    const candParty = candidate ? candidate.party : "निर्दलीय";
    const campaignMsg = activeVoterSlipMsg || customSlipMsg.trim() || `vote for "${candName}"`;

    const text = `*🇮🇳 मतदाता पर्ची (OFFICIAL VOTER SLIP) 🇮🇳*
*उम्मीदवार:* ${candName} (${candParty})
🗳️ *${campaignMsg}*
----------------------------------------
*क्रम सं (Sr No) :* ${v.serialNo || "—"}     *भाग सं (Part) :* ${v.booth}
*नाम (Name) :* ${v.name}
*पिता/पति (Guardian) :* ${v.guardian || "—"}
*वोटर ID (EPIC) :* ${v.epic}
*उम्र (Age) :* ${v.age ? `${v.age} वर्ष` : "—"}     *मकान नं :* ${v.house || "—"}
*बुथ पता :* ${v.boothAddress || "184 - महात्मा गांधी राजकीय विद्यालय इंग्लिश मीडियम का कमरा नं. 2 चौरसियावास अजमेर"}
----------------------------------------
🙏 कृपया अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं 🙏`;

    if (ph) {
      const cleanPh = ph.length === 10 ? `91${ph}` : ph;
      window.open(`https://wa.me/${cleanPh}?text=${encodeURIComponent(text)}`, "_blank");
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  // 2. Send Single Voter Slip as Image on WhatsApp
  const handleSendSingleVoterSlipImage = async (v: VoterRecord, targetPhone?: string) => {
    setIsGeneratingSingleImage(true);
    setLocalToast("⏳ वोटर स्लिप इमेज तैयार हो रही है...");
    try {
      const res = await generateSingleVoterSlipImage(v);
      if (!res) {
        alert("इमेज तैयार करने में विफल रहे। कृपया पुनः प्रयास करें।");
        return;
      }

      const ph = (targetPhone || activeVoterPhone || v.phone || "").replace(/[^0-9]/g, "");
      const cleanPh = ph.length === 10 ? `91${ph}` : ph;
      const caption = `*🇮🇳 मतदाता पर्ची (VOTER SLIP) 🇮🇳*\n*उम्मीदवार:* ${candidate?.name || "प्रत्याशी"}\n*मतदाता:* ${v.name}\n*वोटर ID:* ${v.epic}\n*भाग सं:* ${v.booth} | *क्रम सं:* ${v.serialNo || "—"}`;
      const fileName = `VoterSlip_${v.name.replace(/\s+/g, "_")}_Part${v.booth}.png`;
      const file = new File([res.blob], fileName, { type: "image/png" });

      // If Web Share API supports sharing files (Mobile browsers like Android Chrome / iOS Safari)
      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `वोटर पर्ची - ${v.name}`,
            text: caption,
          });
          setLocalToast("✅ पर्ची सफलतापूर्वक शेयर की गई!");
          setTimeout(() => setLocalToast(""), 3000);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === "AbortError") {
            return;
          }
        }
      }

      // Fallback for Desktop / unsupported browsers:
      // 1. Auto-download the high-res image
      const a = document.createElement("a");
      a.href = res.dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // 2. Open WhatsApp with prefilled text and image prompt
      const waUrl = cleanPh
        ? `https://wa.me/${cleanPh}?text=${encodeURIComponent(caption + "\n\n(✅ पर्ची इमेज आपके डिवाइस में डाउनलोड हो गई है, कृपया चैट में अटैच करके भेजें)")}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(caption + "\n\n(✅ पर्ची इमेज आपके डिवाइस में डाउनलोड हो गई है, कृपया चैट में अटैच करके भेजें)")}`;

      window.open(waUrl, "_blank");
      setLocalToast(`✅ पर्ची इमेज डाउनलोड हो गई! व्हाट्सएप खुल रहा है...`);
      setTimeout(() => setLocalToast(""), 4000);
    } catch (err) {
      alert("इमेज भेजने में त्रुटि: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGeneratingSingleImage(false);
    }
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
    let list = voters.filter((v) => {
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

    // Apply Alphabetical Name Sorting strictly according to English Roman ABCD (A-Z / Z-A)
    // Works for both Hindi Devanagari (transliterated to English phonetics) and English names
    if (nameSortOrder !== "none") {
      list = [...list].sort((a, b) => {
        const keyA = getEnglishSortKey(a.name);
        const keyB = getEnglishSortKey(b.name);
        if (!keyA && !keyB) return 0;
        if (!keyA) return 1;
        if (!keyB) return -1;
        const comp = keyA.localeCompare(keyB, "en", { sensitivity: "base", numeric: true });
        if (comp !== 0) {
          return nameSortOrder === "asc" ? comp : -comp;
        }
        return nameSortOrder === "asc"
          ? (a.name || "").localeCompare(b.name || "")
          : (b.name || "").localeCompare(a.name || "");
      });
    }

    // Apply numerical Age Sorting (Ascending / Descending)
    if (ageSortOrder !== "none" && nameSortOrder === "none") {
      const getNumericAge = (v: VoterRecord) => {
        if (!v.age) return -1;
        const num = parseInt(String(v.age).replace(/\D/g, ""), 10);
        return isNaN(num) ? -1 : num;
      };

      list = [...list].sort((a, b) => {
        const ageA = getNumericAge(a);
        const ageB = getNumericAge(b);
        if (ageSortOrder === "asc") {
          if (ageA === -1 && ageB === -1) return 0;
          if (ageA === -1) return 1;
          if (ageB === -1) return -1;
          return ageA - ageB;
        } else {
          // Descending (High to Low)
          if (ageA === -1 && ageB === -1) return 0;
          if (ageA === -1) return 1;
          if (ageB === -1) return -1;
          return ageB - ageA;
        }
      });
    }

    return list;
  }, [voters, user, partFilter, search, advName, advFather, advAddress, advEpic, familyFilter, ageSortOrder, nameSortOrder]);

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

  // -------------------------------------------------------------
  // CURRENT PAGE EXCEL DOWNLOAD (.xlsx) & ALL VOTERS DOWNLOAD
  // -------------------------------------------------------------
  const handleDownloadCurrentPageExcel = () => {
    if (filteredVoters.length === 0) {
      setLocalToast("⚠️ डाउनलोड करने के लिए कोई मतदाता डेटा उपलब्ध नहीं है!");
      setTimeout(() => setLocalToast(""), 3500);
      return;
    }
    try {
      const exportRows = filteredVoters.map((v, idx) => {
        const row: Record<string, any> = {
          "भाग संख्या (Part No)": v.booth || "—",
          "क्रम संख्या (Serial No)": v.serialNo !== undefined && v.serialNo !== "" ? v.serialNo : idx + 1,
          "मतदाता का नाम (Name)": v.name || "",
          "पिता/पति का नाम (Guardian)": v.guardian || "—",
          "वोट डाला (Voted)": (v.voted === "हाँ" || v.voted === "Yes" || v.voted === true) ? "हाँ" : "नहीं",
          "समर्थक (Supporter)": (v.isSupporter === "हाँ" || v.isSupporter === "Yes" || v.isSupporter === true || v.status === "In-Favor") ? "हाँ" : "नहीं",
          "बाहर है (Outside)": (v.isOutside === "हाँ" || v.isOutside === "Yes" || v.isOutside === true) ? "हाँ" : "नहीं",
          "आयु (Age)": v.age || "—",
          "मोबाइल नंबर (Mobile)": v.phone || "—",
          "वोटर ID / पहचान पत्र (EPIC)": v.epic || "—",
          "मकान नंबर (House No)": v.house || "—",
          "पता (Address)": v.address || "—",
          "मतदान केंद्र (Booth Address)": v.boothAddress || "—",
          "लिंग (Gender)": v.gender || "—",
          "स्थिति (Status)": v.status || "Pending",
          "कार्यकर्ता (Worker)": v.worker || "—",
        };

        if (extraExcelColumns && extraExcelColumns.length > 0) {
          extraExcelColumns.forEach((col) => {
            let val = v.extraData && typeof v.extraData === "object" ? v.extraData[col] : undefined;
            if (val === undefined) {
              val = (v as Record<string, any>)[col];
            }
            row[col] = val !== undefined && val !== null ? val : "—";
          });
        }
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const colWidths = Object.keys(exportRows[0] || {}).map((key) => {
        const maxContentLen = Math.max(
          key.length,
          ...exportRows.slice(0, 40).map((r) => String(r[key] || "").length)
        );
        return { wch: Math.min(45, Math.max(12, maxContentLen + 3)) };
      });
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered_Voters");

      let filePrefix = "Current_Page";
      if (search.trim()) {
        filePrefix = `Search_${search.trim().replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, "_")}`;
      } else if (advName.trim()) {
        filePrefix = `Name_${advName.trim().replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, "_")}`;
      } else if (familyFilter) {
        filePrefix = `Family_House_${(familyFilter.house || "Unknown").replace(/[^a-zA-Z0-9_]/g, "_")}`;
      } else if (partFilter !== "ALL") {
        filePrefix = `Part_${partFilter}`;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `VoterDesk_${filePrefix}_${filteredVoters.length}_voters_${dateStr}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      setLocalToast(`✅ ${filteredVoters.length} मतदाताओं की Excel (.xlsx) फाइल डाउनलोड हो गई!`);
      setTimeout(() => setLocalToast(""), 4000);
    } catch (err) {
      alert("Excel डाउनलोड में त्रुटि: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDownloadAllVotersExcel = () => {
    if (voters.length === 0) {
      setLocalToast("⚠️ कोई मतदाता डेटा उपलब्ध नहीं है!");
      setTimeout(() => setLocalToast(""), 3500);
      return;
    }
    try {
      const exportRows = voters.map((v, idx) => {
        const row: Record<string, any> = {
          "भाग संख्या (Part No)": v.booth || "—",
          "क्रम संख्या (Serial No)": v.serialNo !== undefined && v.serialNo !== "" ? v.serialNo : idx + 1,
          "मतदाता का नाम (Name)": v.name || "",
          "पिता/पति का नाम (Guardian)": v.guardian || "—",
          "वोट डाला (Voted)": (v.voted === "हाँ" || v.voted === "Yes" || v.voted === true) ? "हाँ" : "नहीं",
          "समर्थक (Supporter)": (v.isSupporter === "हाँ" || v.isSupporter === "Yes" || v.isSupporter === true || v.status === "In-Favor") ? "हाँ" : "नहीं",
          "बाहर है (Outside)": (v.isOutside === "हाँ" || v.isOutside === "Yes" || v.isOutside === true) ? "हाँ" : "नहीं",
          "आयु (Age)": v.age || "—",
          "मोबाइल नंबर (Mobile)": v.phone || "—",
          "वोटर ID / पहचान पत्र (EPIC)": v.epic || "—",
          "मकान नंबर (House No)": v.house || "—",
          "पता (Address)": v.address || "—",
          "मतदान केंद्र (Booth Address)": v.boothAddress || "—",
          "लिंग (Gender)": v.gender || "—",
          "स्थिति (Status)": v.status || "Pending",
          "कार्यकर्ता (Worker)": v.worker || "—",
        };

        if (extraExcelColumns && extraExcelColumns.length > 0) {
          extraExcelColumns.forEach((col) => {
            let val = v.extraData && typeof v.extraData === "object" ? v.extraData[col] : undefined;
            if (val === undefined) {
              val = (v as Record<string, any>)[col];
            }
            row[col] = val !== undefined && val !== null ? val : "—";
          });
        }
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      const colWidths = Object.keys(exportRows[0] || {}).map((key) => {
        const maxContentLen = Math.max(
          key.length,
          ...exportRows.slice(0, 40).map((r) => String(r[key] || "").length)
        );
        return { wch: Math.min(45, Math.max(12, maxContentLen + 3)) };
      });
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "All_Voters");

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `VoterDesk_All_${voters.length}_voters_${dateStr}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      setLocalToast(`✅ सभी ${voters.length} मतदाताओं की Excel (.xlsx) फाइल डाउनलोड हो गई!`);
      setTimeout(() => setLocalToast(""), 4000);
    } catch (err) {
      alert("Excel डाउनलोड में त्रुटि: " + (err instanceof Error ? err.message : String(err)));
    }
  };

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
      const mappedColNames = new Set(Object.values(mapping).filter(Boolean));
      const toImport = parsed.rows.map((row, idx) => {
        const boothVal = String(row[mapping.booth] || "1").trim();
        const serialVal = mapping.serialNo && row[mapping.serialNo] ? Number(row[mapping.serialNo]) : (idx + 1);
        const ageVal = mapping.age && row[mapping.age] !== undefined && String(row[mapping.age]).trim() !== ""
          ? String(row[mapping.age]).trim()
          : "35";
        let epicVal = mapping.epic && row[mapping.epic] !== undefined && String(row[mapping.epic]).trim() !== ""
          ? String(row[mapping.epic]).trim().toUpperCase()
          : "";
        if (!epicVal) {
          epicVal = `RJX${boothVal.padStart(2, "0")}${String(serialVal).padStart(5, "0")}`;
        }

        const isSupp = String(row[mapping.isSupporter] || "").trim();
        const votedVal = String(row[mapping.voted] || "").trim();
        const outsideVal = String(row[mapping.isOutside] || "").trim();

        // Preserve all extra columns from Excel sheet
        const extraData: Record<string, any> = {};
        for (const [key, val] of Object.entries(row)) {
          if (!mappedColNames.has(key)) {
            extraData[key] = val;
          }
        }

        return {
          name: String(row[mapping.name] || "").trim(),
          epic: epicVal,
          guardian: String(row[mapping.guardian] || "").trim(),
          age: ageVal,
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
          extraData,
          ...extraData,
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

        <div className="bmHeaderRight" style={{ position: "relative" }}>
          {/* Candidate Menu Button with Dropdown */}
          <button
            type="button"
            onClick={() => setShowMenuDropdown((prev) => !prev)}
            className={`bmMenuBtn ${showMenuDropdown ? "active" : ""}`}
            title={lang === "hi" ? "कैंडिडेट मेनू (डाउनलोड व सेटिंग्स)" : "Candidate Menu (Download & Settings)"}
          >
            <Menu size={13} />
            <span>{lang === "hi" ? "मेनू" : "Menu"}</span>
            <ChevronDown size={11} style={{ transform: showMenuDropdown ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>

          {/* Menu Dropdown Modal / Popup */}
          {showMenuDropdown && (
            <>
              {/* Invisible Backdrop for click-outside */}
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 90,
                  background: "transparent",
                }}
                onClick={() => setShowMenuDropdown(false)}
              />

              {/* Menu Dropdown Card */}
              <div
                style={{
                  position: "absolute",
                  top: "36px",
                  right: "0",
                  zIndex: 100,
                  background: "#ffffff",
                  borderRadius: "12px",
                  boxShadow: "0 12px 35px -4px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15)",
                  border: "1.5px solid #e2e8f0",
                  width: "295px",
                  maxWidth: "92vw",
                  padding: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  color: "#0f172a",
                  animation: "fadeIn 0.15s ease-out",
                }}
              >
                {/* Menu Header with Candidate context */}
                <div style={{ padding: "6px 8px 8px", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      📋 {lang === "hi" ? "कैंडिडेट मेनू" : "Candidate Menu"}
                    </span>
                    <span style={{ fontSize: "10px", background: "#e0f2fe", color: "#0369a1", padding: "1px 6px", borderRadius: "10px", fontWeight: 700 }}>
                      {user.role === "SUPER_ADMIN" ? "Super Admin" : "Candidate"}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {candidate ? candidate.name : user.name}
                  </div>
                </div>

                {/* Primary Action 1: Current Page Download (Excel .xlsx) */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenuDropdown(false);
                    handleDownloadCurrentPageExcel();
                  }}
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    textAlign: "left",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.35)",
                  }}
                >
                  <Download size={20} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 800, lineHeight: 1.2 }}>
                      {lang === "hi" ? "📥 करंट पेज डाउनलोड (Excel)" : "📥 Current Page Download (.xlsx)"}
                    </div>
                    <div style={{ fontSize: "11px", opacity: 0.92, marginTop: "2px", lineHeight: 1.2 }}>
                      {search.trim()
                        ? `"${search.trim()}" के ${filteredVoters.length} मतदाता (.xlsx)`
                        : advName.trim()
                        ? `"${advName.trim()}" के ${filteredVoters.length} मतदाता (.xlsx)`
                        : `${filteredVoters.length} मतदाता Excel (.xlsx)`}
                    </div>
                  </div>
                </button>

                {/* Action 2: Master Download - All Voters Excel */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenuDropdown(false);
                    handleDownloadAllVotersExcel();
                  }}
                  style={{
                    background: "#f8fafc",
                    color: "#0f172a",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <FileSpreadsheet size={18} color="#0284c7" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, lineHeight: 1.2 }}>
                      {lang === "hi" ? "पूरी मतदाता सूची डाउनलोड (All)" : "Download All Voters (.xlsx)"}
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px" }}>
                      {voters.length} {lang === "hi" ? "कुल मतदाता (मास्टर फाइल)" : "total voters master"}
                    </div>
                  </div>
                </button>

                {/* Action 3: Print Options */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenuDropdown(false);
                    setShowPrintModal(true);
                  }}
                  style={{
                    background: "#f8fafc",
                    color: "#0f172a",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Printer size={18} color="#ea580c" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, lineHeight: 1.2 }}>
                      {lang === "hi" ? "प्रिंट विकल्प (Print Options)" : "Print Options"}
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px" }}>
                      {lang === "hi" ? "नामावली व पर्ची प्रिंट करें" : "Print voter roll & slips"}
                    </div>
                  </div>
                </button>

                {/* Action 4: Data Sync & Refresh */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenuDropdown(false);
                    onRefreshData(true);
                  }}
                  style={{
                    background: "#f8fafc",
                    color: "#0f172a",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <RefreshCw size={17} color="#10b981" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, lineHeight: 1.2 }}>
                      {lang === "hi" ? "डेटा रिफ्रेश व सिंक" : "Refresh & Live Sync"}
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px" }}>
                      {onlineWorkersCount > 1 ? `${onlineWorkersCount} डिवाइस कनेक्टेड` : "15 मोबाइल्स में रियल-टाइम सिंक"}
                    </div>
                  </div>
                </button>

                {/* Action 5: Location Modal */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenuDropdown(false);
                    setShowLocationModal(true);
                  }}
                  style={{
                    background: "#f8fafc",
                    color: "#0f172a",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Building2 size={17} color="#6366f1" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, lineHeight: 1.2 }}>
                      {lang === "hi" ? "कार्यकर्ता लोकेशन ट्रैकर" : "Worker Live Locations"}
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#64748b", marginTop: "1px" }}>
                      {lang === "hi" ? "मैप पर लाइव लोकेशन देखें" : "Track team on Google Map"}
                    </div>
                  </div>
                </button>

                {/* Action 6: Admin Panel (if authorized) */}
                {onOpenAdminPanel && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenuDropdown(false);
                      onOpenAdminPanel();
                    }}
                    style={{
                      background: "#e0f2fe",
                      color: "#0369a1",
                      border: "1px solid #7dd3fc",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Settings size={17} color="#0284c7" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, lineHeight: 1.2 }}>
                        {lang === "hi" ? "एडमिन डैशबोर्ड (Admin)" : "Admin Dashboard"}
                      </div>
                      <div style={{ fontSize: "10.5px", color: "#0284c7", marginTop: "1px" }}>
                        {lang === "hi" ? "कार्यकर्ता पासवर्ड, Excel अपलोड व रिपोर्ट" : "Manage team, ward & reports"}
                      </div>
                    </div>
                  </button>
                )}

                {/* Action 7: Logout */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMenuDropdown(false);
                    onLogout();
                  }}
                  style={{
                    background: "#fff1f2",
                    color: "#be123c",
                    border: "1px solid #fecdd3",
                    borderRadius: "8px",
                    padding: "7px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    textAlign: "left",
                    marginTop: "2px",
                  }}
                >
                  <LogOut size={16} color="#be123c" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: "12px", fontWeight: 700 }}>
                    {lang === "hi" ? "लॉग आउट करें" : "Sign Out"}
                  </div>
                </button>
              </div>
            </>
          )}

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
          title={lang === "hi" ? (user.role === "SUPER_ADMIN" ? "डेटा रिफ्रेश व अपडेट करें" : "डेटा रिफ्रेश व लाइव सिंक करें") : (user.role === "SUPER_ADMIN" ? "Data Update & Sync" : "Live Data Refresh & Sync")}
        >
          <span>{lang === "hi" ? "डेटा" : "Data"}</span>
          <span>{lang === "hi" ? (user.role === "SUPER_ADMIN" ? "अपडेट" : "सिंक") : (user.role === "SUPER_ADMIN" ? "Update" : "Sync")}</span>
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

            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
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

              <button
                type="button"
                onClick={handleDownloadCurrentPageExcel}
                title={lang === "hi" ? `करंट पेज के ${filteredVoters.length} मतदाता Excel (.xlsx) में डाउनलोड करें` : `Download current page ${filteredVoters.length} voters (.xlsx)`}
                style={{
                  height: "36px",
                  padding: "0 10px",
                  borderRadius: "8px",
                  border: "none",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 5px rgba(16, 185, 129, 0.25)",
                }}
              >
                <Download size={14} />
                <span>{lang === "hi" ? `डाउनलोड (${filteredVoters.length})` : `Download (${filteredVoters.length})`}</span>
              </button>
            </div>
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

              {/* Helper tip with live match count & download button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px", color: "#64748b", borderTop: "1px dashed #e2e8f0", paddingTop: "8px", flexWrap: "wrap", gap: "6px" }}>
                <span>
                  💡 <b>{lang === "hi" ? "सुझाव:" : "Tip:"}</b> {lang === "hi" ? "नाम में 'Gau' और पिता के कॉलम में 'San' लिखते ही सटीक मतदाता तुरंत सामने आ जाएगा।" : "Typing 'Gau' in Name and 'San' in Father immediately pinpoints the voter."}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontWeight: 700, color: "#0369a1", background: "#f0f9ff", padding: "2px 8px", borderRadius: "6px" }}>
                    {filteredVoters.length} {lang === "hi" ? "मतदाता मिले" : "voters found"}
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadCurrentPageExcel}
                    style={{
                      background: "#10b981",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Download size={12} />
                    <span>Excel</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Active Family List Filter Badge & Generator Button */}
      {familyFilter && (
        <div
          style={{
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
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: 800 }}>👨‍👩‍👧‍👦 {lang === "hi" ? "फैमिली लिस्ट:" : "Family List:"}</span>
            <span
              style={{
                background: "#ffffff",
                padding: "2px 8px",
                borderRadius: "6px",
                fontSize: "12.5px",
                fontWeight: 700,
                color: "#991b1b",
                border: "1px solid #fca5a5",
              }}
            >
              भाग {familyFilter.booth} • मकान नं {familyFilter.house || "—"}
            </span>
            <span style={{ fontSize: "12.5px", color: "#7f1d1d", fontWeight: 600 }}>
              ({selectedFamilyVoterIds.length}/{filteredVoters.length}{" "}
              {lang === "hi" ? "सदस्य चुने गए, अधिकतम 6" : "selected, max 6"})
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                if (selectedFamilyVoters.length === 0) {
                  setLocalToast("⚠️ कृपया पहले नीचे चेकबॉक्स से कम से कम 1 सदस्य चुनें!");
                  setTimeout(() => setLocalToast(""), 3500);
                  return;
                }
                setShowFamilySlipModal(true);
              }}
              style={{
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                color: "#ffffff",
                border: "none",
                borderRadius: "7px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 6px rgba(2, 132, 199, 0.35)",
              }}
              title="A4 साइज फैमिली वोटर स्लिप जनरेट करें"
            >
              <Sparkles size={15} />
              <span>Generate Family Voter Slip ({selectedFamilyVoterIds.length}/6)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFamilyFilter(null);
                setSelectedFamilyVoterIds([]);
              }}
              style={{
                background: "#dc2626",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕ {lang === "hi" ? "फ़िल्टर हटाएं" : "Clear Filter"}
            </button>
          </div>
        </div>
      )}

      {/* 4. Tabular Voter Roll (Exact Layout from Screenshot) */}
      <div className={`bmTableContainer ${showPrintSlipScreen || showSlipModal ? "noPrint" : "printableArea"}`}>
        <table className="bmTable">
          <thead>
            <tr>
              {/* Checkbox column when Family List filter is active */}
              {familyFilter && (
                <th style={{ width: "45px", textAlign: "center", background: "#fee2e2" }}>
                  <input
                    type="checkbox"
                    checked={filteredVoters.length > 0 && selectedFamilyVoterIds.length === Math.min(6, filteredVoters.length)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFamilyVoterIds(filteredVoters.slice(0, 6).map((v) => v.id));
                      } else {
                        setSelectedFamilyVoterIds([]);
                      }
                    }}
                    style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#0284c7" }}
                    title={lang === "hi" ? "सभी सदस्य चुनें (अधिकतम 6)" : "Select all (max 6)"}
                  />
                </th>
              )}
              <th style={{ width: "55px" }}>{t.colPart}</th>
              <th style={{ width: "55px" }}>{t.colSerial}</th>

              {/* 3. नाम (Name) with Alphabetical ABCD Sort Button */}
              <th className="thLeft" style={{ minWidth: "160px", position: "relative" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>{t.colName}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNameSortMenu((prev) => !prev);
                      setShowAgeSortMenu(false);
                    }}
                    style={{
                      background: nameSortOrder !== "none" ? "#0284c7" : "#ffffff",
                      color: nameSortOrder !== "none" ? "#ffffff" : "#475569",
                      border: "1px solid",
                      borderColor: nameSortOrder !== "none" ? "#0284c7" : "#cbd5e1",
                      borderRadius: "4px",
                      padding: "2px 6px",
                      cursor: "pointer",
                      fontSize: "10.5px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                    title={lang === "hi" ? "अंग्रेज़ी ABCD वर्णमाला क्रम में सेट करें" : "Sort by English ABCD Order"}
                  >
                    <ArrowUpDown size={11} />
                    <span>A-Z</span>
                    {nameSortOrder === "asc" && " ↑"}
                    {nameSortOrder === "desc" && " ↓"}
                  </button>
                </div>

                {/* Dropdown Menu for Name Alphabetical Sorting */}
                {showNameSortMenu && (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 100 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNameSortMenu(false);
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        marginTop: "4px",
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                        padding: "6px",
                        zIndex: 101,
                        minWidth: "220px",
                        textAlign: "left",
                        color: "#0f172a",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", padding: "4px 8px", borderBottom: "1px solid #f1f5f9", marginBottom: "4px" }}>
                        {lang === "hi" ? "अंग्रेज़ी ABCD क्रम (English Alphabetical)" : "English Alphabetical Sort"}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNameSortOrder("asc");
                          setAgeSortOrder("none");
                          setShowNameSortMenu(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          padding: "7px 10px",
                          border: "none",
                          borderRadius: "6px",
                          background: nameSortOrder === "asc" ? "#e0f2fe" : "transparent",
                          color: nameSortOrder === "asc" ? "#0369a1" : "#1e293b",
                          fontSize: "12px",
                          fontWeight: nameSortOrder === "asc" ? 700 : 500,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span>🔤</span>
                        <span>{lang === "hi" ? "A to Z (English ABCD क्रम)" : "A to Z (English ABCD)"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNameSortOrder("desc");
                          setAgeSortOrder("none");
                          setShowNameSortMenu(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          padding: "7px 10px",
                          border: "none",
                          borderRadius: "6px",
                          background: nameSortOrder === "desc" ? "#e0f2fe" : "transparent",
                          color: nameSortOrder === "desc" ? "#0369a1" : "#1e293b",
                          fontSize: "12px",
                          fontWeight: nameSortOrder === "desc" ? 700 : 500,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span>🔠</span>
                        <span>{lang === "hi" ? "Z to A (English DCBA क्रम)" : "Z to A (English DCBA)"}</span>
                      </button>
                      {nameSortOrder !== "none" && (
                        <button
                          type="button"
                          onClick={() => {
                            setNameSortOrder("none");
                            setShowNameSortMenu(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            width: "100%",
                            padding: "6px 10px",
                            marginTop: "4px",
                            borderTop: "1px solid #f1f5f9",
                            borderLeft: "none",
                            borderRight: "none",
                            borderBottom: "none",
                            borderRadius: "0 0 6px 6px",
                            background: "transparent",
                            color: "#ef4444",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span>✕</span>
                          <span>{lang === "hi" ? "क्रम हटाएं (डिफ़ॉल्ट क्रम)" : "Reset / Default Order"}</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </th>

              <th className="thLeft" style={{ minWidth: "140px" }}>{t.colGuardian}</th>
              <th style={{ minWidth: "85px" }}>{t.colVoted}</th>
              <th style={{ minWidth: "85px" }}>{t.colSupporter}</th>
              <th style={{ minWidth: "85px" }}>{t.colOutside}</th>
              {/* 8. आयु (Age) - Placed BEFORE Mobile No with Sort Button */}
              <th style={{ minWidth: "105px", position: "relative", textAlign: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                  <span>{lang === "hi" ? "आयु" : "Age"}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAgeSortMenu((prev) => !prev);
                      setShowNameSortMenu(false);
                    }}
                    style={{
                      background: ageSortOrder !== "none" ? "#0284c7" : "#ffffff",
                      color: ageSortOrder !== "none" ? "#ffffff" : "#475569",
                      border: "1px solid",
                      borderColor: ageSortOrder !== "none" ? "#0284c7" : "#cbd5e1",
                      borderRadius: "4px",
                      padding: "2px 5px",
                      cursor: "pointer",
                      fontSize: "10.5px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                    title={lang === "hi" ? "आयु अनुसार क्रमबद्ध करें" : "Sort by Age"}
                  >
                    <ArrowUpDown size={11} />
                    {ageSortOrder === "asc" && " ↑"}
                    {ageSortOrder === "desc" && " ↓"}
                  </button>
                </div>

                {/* Dropdown Menu for Age Sorting */}
                {showAgeSortMenu && (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 100 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAgeSortMenu(false);
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        marginTop: "4px",
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                        padding: "6px",
                        zIndex: 101,
                        minWidth: "190px",
                        textAlign: "left",
                        color: "#0f172a",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", padding: "4px 8px", borderBottom: "1px solid #f1f5f9", marginBottom: "4px" }}>
                        {lang === "hi" ? "आयु के अनुसार क्रम (Sort Age)" : "Sort by Age"}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAgeSortOrder("desc");
                          setNameSortOrder("none");
                          setShowAgeSortMenu(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          padding: "7px 10px",
                          border: "none",
                          borderRadius: "6px",
                          background: ageSortOrder === "desc" ? "#e0f2fe" : "transparent",
                          color: ageSortOrder === "desc" ? "#0369a1" : "#1e293b",
                          fontSize: "12px",
                          fontWeight: ageSortOrder === "desc" ? 700 : 500,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span>⬇️</span>
                        <span>{lang === "hi" ? "घटते क्रम में (Descending)" : "Descending Order"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAgeSortOrder("asc");
                          setNameSortOrder("none");
                          setShowAgeSortMenu(false);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          padding: "7px 10px",
                          border: "none",
                          borderRadius: "6px",
                          background: ageSortOrder === "asc" ? "#e0f2fe" : "transparent",
                          color: ageSortOrder === "asc" ? "#0369a1" : "#1e293b",
                          fontSize: "12px",
                          fontWeight: ageSortOrder === "asc" ? 700 : 500,
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span>⬆️</span>
                        <span>{lang === "hi" ? "बढ़ते क्रम में (Ascending)" : "Ascending Order"}</span>
                      </button>
                      {ageSortOrder !== "none" && (
                        <button
                          type="button"
                          onClick={() => {
                            setAgeSortOrder("none");
                            setShowAgeSortMenu(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            width: "100%",
                            padding: "6px 10px",
                            marginTop: "4px",
                            borderTop: "1px solid #f1f5f9",
                            background: "transparent",
                            color: "#ef4444",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          <span>✕</span>
                          <span>{lang === "hi" ? "सामान्य क्रम (Reset)" : "Reset Default"}</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </th>
              {/* 9. मोबाइल नो */}
              <th style={{ minWidth: "115px" }}>{t.colPhone}</th>
              {/* 10. वोटर ID / पहचान पत्र - Placed AFTER Mobile No */}
              <th style={{ minWidth: "115px" }}>{lang === "hi" ? "वोटर ID" : "Voter ID"}</th>
              {/* 11. हाउस No */}
              <th style={{ width: "75px" }}>{t.colHouse}</th>
              {/* 12. एड्रेस */}
              <th className="thLeft" style={{ minWidth: "150px" }}>{t.colAddress}</th>
              {/* 13. Booth Address */}
              <th className="thLeft" style={{ minWidth: "170px" }}>{t.colBoothAddress}</th>
              {/* 14+. Dynamic extra columns from Excel */}
              {extraExcelColumns.map((colName) => (
                <th key={colName} className="thLeft" style={{ minWidth: "120px" }}>
                  {colName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredVoters.length === 0 ? (
              <tr>
                <td colSpan={(familyFilter ? 14 : 13) + extraExcelColumns.length} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
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
                    {/* Checkbox cell when Family List filter is active */}
                    {familyFilter && (
                      <td
                        className="colCenter"
                        onClick={(e) => e.stopPropagation()}
                        style={{ background: selectedFamilyVoterIds.includes(v.id) ? "#f0f9ff" : undefined }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFamilyVoterIds.includes(v.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (selectedFamilyVoterIds.includes(v.id)) {
                              setSelectedFamilyVoterIds((prev) => prev.filter((id) => id !== v.id));
                            } else {
                              if (selectedFamilyVoterIds.length >= 6) {
                                setLocalToast("⚠️ एक A4 शीट पर अधिकतम 6 फैमिली मेंबर्स की वोटर स्लिप आ सकती है!");
                                setTimeout(() => setLocalToast(""), 3500);
                                return;
                              }
                              setSelectedFamilyVoterIds((prev) => [...prev, v.id]);
                            }
                          }}
                          style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#0284c7" }}
                        />
                      </td>
                    )}

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

                    {/* 8. आयु (Age) - BEFORE Mobile No */}
                    <td className="colCenter" style={{ fontWeight: 700, color: "#1e293b", fontSize: "12.5px" }}>
                      {v.age ? `${v.age} वर्ष` : "—"}
                    </td>

                    {/* 9. मोबाइल नो */}
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

                    {/* 10. वोटर ID (EPIC) - AFTER Mobile No */}
                    <td className="colCenter" style={{ fontFamily: "monospace", fontWeight: 700, color: "#0369a1", fontSize: "12px" }}>
                      {v.epic || "—"}
                    </td>

                    {/* 11. हाउस No */}
                    <td className="colHouse">{v.house || "—"}</td>

                    {/* 12. एड्रेस */}
                    <td className="colAddress">{v.address || "—"}</td>

                    {/* 13. Booth Address */}
                    <td className="colBoothAddress">{v.boothAddress || "—"}</td>

                    {/* 14+. All Dynamic Extra Columns from Excel */}
                    {extraExcelColumns.map((colName) => {
                      const val = (v.extraData && v.extraData[colName] !== undefined)
                        ? v.extraData[colName]
                        : (v as Record<string, any>)[colName];
                      return (
                        <td key={colName} style={{ fontSize: "12px", color: "#334155" }}>
                          {val !== undefined && val !== null && String(val).trim() !== "" ? String(val) : "—"}
                        </td>
                      );
                    })}
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
        <div className="bmFullscreenModalOverlay">
          <div className="bmHeaderBlue noPrint">
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
            <div className="bmPrinterCard noPrint">
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
              className="bmAddPrinterLink noPrint"
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

            {/* Dotted Voter Slip Card (Only this prints) */}
            <div
              className={`bmDottedSlipCard printableArea printableSlip ${
                selectedPrinter.includes("58mm")
                  ? "printer58mm"
                  : selectedPrinter.includes("80mm")
                  ? "printer80mm"
                  : ""
              }`}
            >
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
              className="bmBottomPrintBtn noPrint"
              onClick={handlePrintVoterSlip}
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
              src={candidate?.posterUrl || "/images/campaign-poster.jpg"}
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

            {/* Recipient Phone Preview / Input */}
            <div style={{ marginTop: "12px", background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#475569", fontWeight: 600 }}>
                📱 प्राप्तकर्ता मोबाइल (WhatsApp No):
              </span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", fontFamily: "monospace" }}>
                {activeVoterPhone || activeActionVoter.phone || "नंबर दर्ज नहीं"}
              </span>
            </div>

            {/* WhatsApp Send Options: 💬 Text vs 🖼️ Image */}
            <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {/* 1. Text Button */}
                <button
                  type="button"
                  onClick={() => handleSendSingleVoterSlipText(activeActionVoter)}
                  style={{
                    background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "13px 8px",
                    fontSize: "14px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    boxShadow: "0 3px 10px rgba(22, 163, 74, 0.35)",
                    transition: "transform 0.1s ease",
                  }}
                  title="मतदाता पर्ची उम्मीदवार के नाम व विवरण के साथ टेक्स्ट फॉर्मेट में भेजें"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Share2 size={17} />
                    <span>💬 टेक्स्ट पर्ची</span>
                  </div>
                  <small style={{ fontSize: "11px", fontWeight: 500, opacity: 0.9 }}>
                    (Text Format में भेजें)
                  </small>
                </button>

                {/* 2. Image Button */}
                <button
                  type="button"
                  disabled={isGeneratingSingleImage}
                  onClick={() => handleSendSingleVoterSlipImage(activeActionVoter)}
                  style={{
                    background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "13px 8px",
                    fontSize: "14px",
                    fontWeight: 800,
                    cursor: isGeneratingSingleImage ? "wait" : "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    boxShadow: "0 3px 10px rgba(2, 132, 199, 0.35)",
                    opacity: isGeneratingSingleImage ? 0.8 : 1,
                    transition: "transform 0.1s ease",
                  }}
                  title="उम्मीदवार के पोस्टर सहित सिंगल वोटर स्लिप फोटो इमेज बनाकर भेजें"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <ImageIcon size={17} />
                    <span>{isGeneratingSingleImage ? "⏳ बन रही है..." : "🖼️ इमेज पर्ची"}</span>
                  </div>
                  <small style={{ fontSize: "11px", fontWeight: 500, opacity: 0.9 }}>
                    (पोस्टर + पर्ची फोटो)
                  </small>
                </button>
              </div>

              {/* Helper explanation note */}
              <p style={{ margin: "2px 0 0", textAlign: "center", fontSize: "11.5px", color: "#64748b" }}>
                💡 <b>टेक्स्ट पर्ची:</b> उम्मीदवार व वोटर विवरण सीधे टेक्स्ट में जाएगा | <b>इमेज पर्ची:</b> पोस्टर सहित फ़ोटो जाएगी
              </p>
            </div>
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
        <div className="modalOverlay">
          <div className="modalBox">
            <div className="modalHead noPrint">
              <h3>{t.officialVoterSlip}</h3>
              <button onClick={() => setShowSlipModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modalBody">
              {/* Official Slip Preview Card */}
              <div
                className="printableArea printableSlip"
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

              {/* Recipient Phone Input & WhatsApp Send Buttons */}
              <div className="formGroup noPrint" style={{ marginTop: "14px" }}>
                <label style={{ fontWeight: 600, fontSize: "13px", color: "#334155" }}>
                  📱 {t.updateMobile} (WhatsApp)
                </label>
                <div style={{ marginTop: "4px" }}>
                  <input
                    type="tel"
                    placeholder="98290XXXXX"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                  {/* 1. Text Button */}
                  <button
                    type="button"
                    style={{
                      background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                      color: "#fff",
                      border: 0,
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontWeight: 700,
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(22, 163, 74, 0.3)",
                    }}
                    onClick={() => handleSendSingleVoterSlipText(activeVoterForSlip, recipientPhone)}
                    title="मतदाता पर्ची टेक्स्ट रूप में WhatsApp पर भेजें"
                  >
                    <Share2 size={16} /> 💬 टेक्स्ट पर्ची
                  </button>

                  {/* 2. Image Button */}
                  <button
                    type="button"
                    disabled={isGeneratingSingleImage}
                    style={{
                      background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                      color: "#fff",
                      border: 0,
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontWeight: 700,
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: isGeneratingSingleImage ? "wait" : "pointer",
                      opacity: isGeneratingSingleImage ? 0.8 : 1,
                      boxShadow: "0 2px 6px rgba(2, 132, 199, 0.3)",
                    }}
                    onClick={() => handleSendSingleVoterSlipImage(activeVoterForSlip, recipientPhone)}
                    title="उम्मीदवार के पोस्टर सहित वोटर स्लिप इमेज WhatsApp पर भेजें"
                  >
                    <ImageIcon size={16} /> {isGeneratingSingleImage ? "⏳ बन रही है..." : "🖼️ इमेज पर्ची"}
                  </button>
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "5px", textAlign: "center" }}>
                  💡 <b>टेक्स्ट पर्ची:</b> केवल विवरण व अपील | <b>इमेज पर्ची:</b> उम्मीदवार पोस्टर सहित फ़ोटो
                </div>
              </div>

              <div className="noPrint" style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
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
                  onClick={handlePrintVoterSlip}
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
              <h3>
                {user.role === "SUPER_ADMIN"
                  ? t.btnDataUpdate
                  : (lang === "hi" ? "⚡ लाइव डेटा सिंक व रिफ्रेश" : "Live Data Sync & Refresh")}
              </h3>
              <button onClick={() => setShowUpdateModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Tabs - ONLY available for Super Admin */}
            {user.role === "SUPER_ADMIN" && (
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
            )}

            <div className="modalBody">
              {updateTab === "sync" || user.role !== "SUPER_ADMIN" ? (
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
                    {user.role === "SUPER_ADMIN" && (
                      <button type="button" className="primary" onClick={() => setUpdateTab("add")}>
                        + {lang === "hi" ? "नया मतदाता जोड़ें" : "Add Voter"}
                      </button>
                    )}
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

      {/* 8. Modal: Location (लोकेशन - Live Karyakarta GPS Tracker & Polling Station) */}
      {showLocationModal && (
        <div className="bmTrackerOverlay noPrint">
          <div className="bmTrackerBox">
            {/* Header */}
            <div className="bmTrackerHeader">
              <div className="bmTrackerTitleGroup">
                <div style={{ fontSize: "24px", lineHeight: 1 }}>📍</div>
                <div>
                  <h3 className="bmTrackerTitle">
                    {lang === "hi" ? "कार्यकर्ता लाइव लोकेशन ट्रैकर" : "Live Karyakarta GPS Tracker"}
                  </h3>
                  <div className="bmTrackerSub">
                    {lang === "hi"
                      ? "गूगल लाइव लोकेशन • सभी कार्यकर्ताओं की वास्तविक स्थिति"
                      : "Google Live Location • Real-Time Karyakarta Tracking"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={fetchWorkerLocations}
                  title={lang === "hi" ? "लोकेशन रिफ्रेश करें" : "Refresh Locations"}
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "none",
                    color: "#ffffff",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={15} className={isFetchingLocations ? "spin" : ""} />
                </button>
                <button
                  type="button"
                  className="bmTrackerCloseBtn"
                  onClick={() => setShowLocationModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Tab Bar */}
            <div className="bmTrackerTabBar">
              <button
                type="button"
                className={`bmTrackerTabBtn ${locationTab === "workers" ? "active" : ""}`}
                onClick={() => setLocationTab("workers")}
              >
                👥 {lang === "hi" ? `कार्यकर्ता लोकेशन (${workerLocations.length})` : `Workers GPS (${workerLocations.length})`}
              </button>
              <button
                type="button"
                className={`bmTrackerTabBtn ${locationTab === "booth" ? "active" : ""}`}
                onClick={() => setLocationTab("booth")}
              >
                🏛️ {lang === "hi" ? "मतदान केंद्र / बूथ पता" : "Polling Station"}
              </button>
            </div>

            {/* Modal Body */}
            <div className="bmTrackerBody">
              {locationTab === "workers" ? (
                <>
                  {/* GPS Broadcast Bar */}
                  <div className="bmGpsBroadcastBanner">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="bmLivePulseDot" style={{ position: "static", display: "inline-block" }}></span>
                      <span>
                        <b>{lang === "hi" ? "आपकी जीपीएस स्थिति" : "Your GPS"}:</b> {gpsStatusText}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="bmGpsRefreshBtn"
                      onClick={broadcastMyGps}
                    >
                      <RefreshCw size={11} /> {lang === "hi" ? "अपडेट करें" : "Broadcast"}
                    </button>
                  </div>

                  {/* Stats Bar */}
                  <div className="bmTrackerStatsBar">
                    <div className="bmTrackerStatBadge">
                      <span>👥</span>
                      <span>{lang === "hi" ? "कुल कार्यकर्ता" : "Workers"}: <b>{workerLocations.length}</b></span>
                    </div>
                    <div className="bmTrackerStatBadge" style={{ borderColor: "#86efac", background: "#f0fdf4" }}>
                      <span>🟢</span>
                      <span>{lang === "hi" ? "लाइव ऑनलाइन" : "Online"}: <b style={{ color: "#15803d" }}>{workerLocations.filter((w) => w.isOnline).length}</b></span>
                    </div>
                    <div className="bmTrackerStatBadge">
                      <span>🗳️</span>
                      <span>{lang === "hi" ? "बूथ" : "Booth"}: <b>{partFilter === "ALL" ? "सभी (वार्ड 34)" : `बूथ ${partFilter}`}</b></span>
                    </div>
                  </div>

                  {/* Embedded Google Map Preview */}
                  {(() => {
                    const activeWorker =
                      workerLocations.find((w) => w.workerId === focusedWorkerId) ||
                      workerLocations[0];
                    const centerLat = activeWorker ? activeWorker.lat : (myGps?.lat ?? 25.3485);
                    const centerLng = activeWorker ? activeWorker.lng : (myGps?.lng ?? 74.6342);
                    const activeName = activeWorker ? activeWorker.name : "कार्यकर्ता";

                    return (
                      <div className="bmMapContainer">
                        {/* Map Header / Filter Chips */}
                        <div
                          style={{
                            padding: "8px 12px",
                            background: "#f8fafc",
                            borderBottom: "1px solid #e2e8f0",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            overflowX: "auto",
                          }}
                        >
                          <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", whiteSpace: "nowrap" }}>
                            🎯 {lang === "hi" ? "मैप पर देखें:" : "View on Map:"}
                          </span>
                          {workerLocations.map((w) => {
                            const isSelected =
                              (focusedWorkerId === w.workerId) ||
                              (!focusedWorkerId && w.workerId === activeWorker?.workerId);
                            return (
                              <button
                                key={w.workerId}
                                type="button"
                                onClick={() => setFocusedWorkerId(w.workerId)}
                                style={{
                                  padding: "3px 8px",
                                  borderRadius: "14px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                  cursor: "pointer",
                                  border: isSelected ? "1.5px solid #0062cc" : "1px solid #cbd5e1",
                                  background: isSelected ? "#e0f2fe" : "#ffffff",
                                  color: isSelected ? "#0284c7" : "#334155",
                                }}
                              >
                                {w.isOnline ? "🟢" : "⚪"} {w.name}
                              </button>
                            );
                          })}
                        </div>

                        {/* Interactive Google Map Iframe */}
                        <iframe
                          title="Google Live Location Map"
                          className="bmMapIframe"
                          src={`https://maps.google.com/maps?q=${centerLat},${centerLng}&z=15&output=embed`}
                          loading="lazy"
                          allowFullScreen
                        />

                        {/* Map Bottom Bar */}
                        <div className="bmMapActionOverlay">
                          <span style={{ color: "#334155" }}>
                            📍 <b>{activeName}</b> की लाइव स्थिति ({centerLat.toFixed(4)}, {centerLng.toFixed(4)})
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${centerLat},${centerLng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bmOpenAllMapsBtn"
                          >
                            🗺️ {lang === "hi" ? "Google Maps ऐप में खोलें" : "Open in Google Maps"}
                          </a>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Worker Cards List */}
                  <div style={{ marginBottom: "12px", fontSize: "13.5px", fontWeight: 800, color: "#1e293b" }}>
                    📋 {lang === "hi" ? "सभी कार्यकर्ताओं की स्थिति व संपर्क" : "All Workers Status & Direct Contact"}
                  </div>

                  {workerLocations.map((w) => {
                    const isFocused = focusedWorkerId === w.workerId;
                    return (
                      <div
                        key={w.workerId}
                        className="bmWorkerLocationCard"
                        style={{
                          borderColor: isFocused ? "#0284c7" : "#e2e8f0",
                          backgroundColor: isFocused ? "#f0f9ff" : "#ffffff",
                        }}
                      >
                        <div className="bmWorkerCardTop">
                          <div className="bmWorkerNameCol">
                            <div className="bmWorkerAvatar">
                              {w.name.charAt(0)}
                              {w.isOnline && <span className="bmLivePulseDot" />}
                            </div>
                            <div>
                              <div style={{ fontSize: "14.5px", fontWeight: 800, color: "#0f172a" }}>{w.name}</div>
                              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginTop: "2px" }}>
                                <span style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  background: "#f1f5f9",
                                  color: "#475569",
                                  padding: "2px 6px",
                                  borderRadius: "4px"
                                }}>
                                  {w.roleTitle || "बूथ कार्यकर्ता"}
                                </span>
                                <span className={`bmLiveStatusBadge ${w.isOnline ? "online" : "offline"}`}>
                                  {w.isOnline ? "🟢 लाइव ऑनलाइन" : "⚪ ऑफलाइन"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFocusedWorkerId(w.workerId)}
                            style={{
                              border: "1px solid #0284c7",
                              background: "#e0f2fe",
                              color: "#0284c7",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            🎯 मैप पर पिन
                          </button>
                        </div>

                        <div className="bmWorkerAddressBox">
                          <div>📍 <b>स्थान:</b> {w.address || "वार्ड 34, भीलवाड़ा क्षेत्र"}</div>
                          <div>🗳️ <b>आवंटित बूथ:</b> बूथ {w.assignedBooths?.join(", ") || "1"}</div>
                          <div>🌐 <b>GPS:</b> {w.lat.toFixed(5)}, {w.lng.toFixed(5)} (±{w.accuracy || 10}m)</div>
                          <div>
                            🕒 <b>अंतिम अपडेट:</b>{" "}
                            {(() => {
                              const diffSec = Math.floor((Date.now() - (w.lastUpdated || Date.now())) / 1000);
                              if (diffSec < 60) return "अभी (Live)";
                              const diffMin = Math.floor(diffSec / 60);
                              if (diffMin < 60) return `${diffMin} मिनट पहले`;
                              return `${Math.floor(diffMin / 60)} घंटे पहले`;
                            })()}
                          </div>
                        </div>

                        {/* 4 Action Buttons for each Worker */}
                        <div className="bmWorkerActionRow">
                          <a
                            href={`https://www.google.com/maps?q=${w.lat},${w.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bmWorkerBtn bmBtnMapTrack"
                            title="Google Maps पर लाइव स्थान देखें"
                          >
                            🗺️ {lang === "hi" ? "गूगल मैप्स" : "Maps"}
                          </a>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${w.lat},${w.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bmWorkerBtn bmBtnDirections"
                            title="कार्यकर्ता तक पहुंचने का रास्ता नेविगेट करें"
                          >
                            🧭 {lang === "hi" ? "दिशा-निर्देश" : "Directions"}
                          </a>
                          <a
                            href={`tel:${w.phone}`}
                            className="bmWorkerBtn bmBtnWorkerCall"
                            title="कार्यकर्ता को सीधे फोन कॉल करें"
                          >
                            📞 {lang === "hi" ? "कॉल करें" : "Call"}
                          </a>
                          <a
                            href={`https://wa.me/${w.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                              `नमस्ते ${w.name} जी, आपकी वर्तमान लाइव लोकेशन और बूथ स्थिति क्या है?`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bmWorkerBtn bmBtnWorkerWA"
                            title="व्हाट्सएप पर मैसेज भेजें"
                          >
                            💬 {lang === "hi" ? "व्हाट्सएप" : "WhatsApp"}
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                /* Polling Station Tab */
                <div>
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1.5px solid #bae6fd",
                      borderRadius: "12px",
                      padding: "16px",
                      marginBottom: "16px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#0284c7", textTransform: "uppercase" }}>
                      POLLING STATION / मतदान केंद्र
                    </span>
                    <h4 style={{ margin: "6px 0 4px", fontSize: "17px", color: "#0f172a" }}>
                      {t.pollingStationName}
                    </h4>
                    <p style={{ margin: "0 0 10px", fontSize: "13.5px", color: "#475467" }}>
                      {t.pollingStationAddress}
                    </p>
                    <div style={{ fontSize: "12.5px", color: "#0369a1", fontWeight: 600 }}>
                      🕒 {t.pollingTime}
                    </div>
                  </div>

                  {/* Polling Station Map Embed */}
                  <div className="bmMapContainer" style={{ marginBottom: "16px" }}>
                    <iframe
                      title="Polling Station Map"
                      className="bmMapIframe"
                      src="https://maps.google.com/maps?q=25.3485,74.6342&z=16&output=embed"
                      loading="lazy"
                    />
                    <div className="bmMapActionOverlay">
                      <span>🏛️ {t.pollingStationName}</span>
                      <a
                        href="https://maps.google.com/?q=Govt+Senior+Secondary+School+Bhilwara"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bmOpenAllMapsBtn"
                      >
                        🗺️ {t.openInMaps}
                      </a>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "14px",
                      marginBottom: "16px",
                      fontSize: "13.5px",
                      color: "#334155",
                    }}
                  >
                    <p style={{ margin: "0 0 8px" }}>
                      👤 <b>बूथ प्रभारी (Supervisor):</b> Amit Joshi (+91 98290 12345)
                    </p>
                    <p style={{ margin: "0 0 8px" }}>
                      🗳️ <b>भाग / बूथ संख्या:</b> {partFilter === "ALL" ? "1 (वार्ड 34)" : `भाग सं. ${partFilter}`}
                    </p>
                    <p style={{ margin: "0" }}>
                      📍 <b>निकटतम लैंडमार्क:</b> सुभाष नगर चौराहा, भीलवाड़ा
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
              )}
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

                <button
                  type="button"
                  style={{
                    padding: "16px",
                    border: "1.5px solid #10b981",
                    borderRadius: "10px",
                    background: "#f0fdf4",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                  onClick={() => {
                    setShowPrintModal(false);
                    handleDownloadCurrentPageExcel();
                  }}
                >
                  <Download size={24} color="#059669" />
                  <div>
                    <b style={{ fontSize: "14px", display: "block", color: "#065f46" }}>
                      {lang === "hi" ? "करंट पेज Excel (.xlsx) डाउनलोड" : "Current Page Excel (.xlsx) Download"}
                    </b>
                    <small style={{ color: "#047857", fontSize: "11px" }}>
                      वर्तमान में दिख रहे {filteredVoters.length} मतदाताओं का पूरा डेटा Excel फाइल में डाउनलोड करें
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

      {/* 10. Modal: A4 Family Voter Slip Preview & Generator (Top A5 Poster + Bottom A5 Slips) */}
      {showFamilySlipModal && selectedFamilyVoters.length > 0 && (
        <div className="a4ModalOverlay">
          {/* Top Bar with Responsive Actions */}
          <div className="a4ModalHeader noPrint">
            <div className="a4ModalHeaderTop">
              <div className="a4ModalTitle">
                <Sparkles size={18} color="#0284c7" />
                <span>
                  {lang === "hi" ? "A4 परिवार मतदाता पर्ची" : "A4 Family Voter Slip"}
                  <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600, marginLeft: "6px" }}>
                    ({selectedFamilyVoters.length} {lang === "hi" ? "सदस्य चुने गए, 6 स्लॉट" : "selected, 6 slots"})
                  </span>
                </span>
              </div>
              <button
                type="button"
                className="a4ModalCloseBtn"
                onClick={() => setShowFamilySlipModal(false)}
                title="बंद करें"
              >
                ✕ {lang === "hi" ? "बंद करें" : "Close"}
              </button>
            </div>

            <div className="a4ModalActions">
              <button
                type="button"
                onClick={handleDownloadFamilyA4Image}
                disabled={isGeneratingFamilyImage}
                style={{
                  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "7px",
                  padding: "7px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: isGeneratingFamilyImage ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 6px rgba(22, 163, 74, 0.35)",
                  flex: 1,
                }}
              >
                <Download size={14} />
                <span>{isGeneratingFamilyImage ? (lang === "hi" ? "बन रही है..." : "Generating...") : (lang === "hi" ? "A4 इमेज (.png)" : "Download A4")}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintFamilyA4}
                style={{
                  background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "7px",
                  padding: "7px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 6px rgba(2, 132, 199, 0.35)",
                  flex: 1,
                }}
              >
                <Printer size={14} />
                <span>{lang === "hi" ? "A4 प्रिंट करें" : "Print A4"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const slipSummary = selectedFamilyVoters
                    .map((v, i) => `${i + 1}. ${v.name} (क्र. ${v.serialNo !== undefined ? v.serialNo : i + 1}, EPIC: ${v.epic})`)
                    .join("\n");
                  const text = `*परिवार मतदाता पर्ची / Family Voter Slip*\n\n` +
                    `*प्रत्याशी:* ${candidate?.name || "सम्मानित प्रत्याशी"}\n` +
                    `*भाग संख्या:* ${familyFilter?.booth || "—"} | *मकान नं:* ${familyFilter?.house || "—"}\n\n` +
                    `*परिवार के मतदाता:*\n${slipSummary}\n\n` +
                    `*मतदान केंद्र:* ${selectedFamilyVoters[0]?.boothAddress || "रा.उ.मा.वि. मतदान केंद्र"}\n\n` +
                    `कृपया अपना मतदान अवश्य करें! 🗳️`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                }}
                style={{
                  background: "#25d366",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "7px",
                  padding: "7px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 6px rgba(37, 211, 102, 0.35)",
                  flex: 1,
                }}
              >
                <Share2 size={14} />
                <span>WhatsApp</span>
              </button>

              {/* Mobile View Mode: 1-Column vs 2-Column A4 */}
              <button
                type="button"
                onClick={() => setFamilySlipGridCols((prev) => (prev === 2 ? 1 : 2))}
                style={{
                  background: "#f8fafc",
                  color: "#0369a1",
                  border: "1px solid #cbd5e1",
                  borderRadius: "7px",
                  padding: "7px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  flex: 1,
                }}
                title="कॉलम लेआउट बदलें"
              >
                <span>{familySlipGridCols === 2 ? "📱 1-कॉलम" : "📄 2-कॉलम"}</span>
              </button>
            </div>
          </div>

          {/* A4 Sheet Container (Top A5 Poster + Cut Line + Bottom A5 Slips) */}
          <div className="a4SheetWrapper">
            <div className="a4FamilySheet">
              {/* TOP A5: Candidate Poster */}
              <div className="a4TopPoster">
                <img
                  src={candidate?.posterUrl || "/images/campaign-poster.jpg"}
                  alt={candidate?.name || "प्रत्याशी पोस्टर"}
                  className="a4PosterImg"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    const fb = document.getElementById("a4PosterFallback");
                    if (fb) fb.style.display = "flex";
                  }}
                />
                <div
                  id="a4PosterFallback"
                  style={{
                    display: "none",
                    width: "100%",
                    minHeight: "160px",
                    background: "linear-gradient(135deg, #0284c7 0%, #1e3a8a 100%)",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    padding: "20px 14px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "22px", fontWeight: 900, marginBottom: "6px" }}>
                    {candidate?.name || "प्रत्याशी चुनाव प्रचार"}
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 700, opacity: 0.9, marginBottom: "8px" }}>
                    {candidate?.party ? `पार्टी: ${candidate.party}` : "मतदाता सेवा"}
                  </div>
                  <div style={{ fontSize: "13px", opacity: 0.85 }}>
                    वार्ड / क्षेत्र के सर्वांगीण विकास हेतु आपका अमूल्य वोट
                  </div>
                </div>
                <div className="a4CutLine noPrint">
                  <span className="a4CutLineBadge">✂ यहाँ से काटें / Cut Here</span>
                </div>
              </div>

              {/* BOTTOM A5: Family Voter Slips */}
              <div className="a4BottomSlips">
                <div className="a4BottomHeader">
                  <div>
                    <span className="a4BottomTitle">
                      👨‍👩‍👧‍👦 {lang === "hi" ? "परिवार मतदाता पर्ची" : "FAMILY VOTER SLIP"} (मकान नं: {familyFilter?.house || "—"})
                    </span>
                  </div>
                  <div>
                    <span className="a4BottomSub">
                      भाग सं: {familyFilter?.booth || "—"} • {selectedFamilyVoters.length} सदस्य ({6 - selectedFamilyVoters.length} रिक्त स्थान)
                    </span>
                  </div>
                </div>

                {/* 6 Slots Grid: 2 columns x 3 rows (or 1-column on mobile) */}
                <div className={`a4SlipsGrid ${familySlipGridCols === 1 ? "a4SlipsGridSingleCol" : ""}`}>
                  {[0, 1, 2, 3, 4, 5].map((slotIdx) => {
                    const v = selectedFamilyVoters[slotIdx];
                    if (v) {
                      return (
                        <div key={v.id} className="a4MiniSlipCard">
                          <div>
                            <div className="a4SlipTopRow">
                              <span>क्रम सं : {v.serialNo !== undefined ? v.serialNo : slotIdx + 1}</span>
                              <span>भाग सं : {v.booth || "—"}</span>
                            </div>
                            <div className="a4SlipNameRow">
                              <span>नाम : <b>{v.name}</b></span>
                            </div>
                            <div className="a4SlipGuardianRow">
                              <span>पिता/पति : {v.guardian || "—"}</span>
                            </div>
                            <div className="a4SlipMidRow">
                              <span>उम्र : {v.age ? `${v.age} वर्ष` : "—"}</span>
                              <span>मकान नं : {v.house || "—"}</span>
                            </div>
                            <div className="a4SlipEpicRow">
                              <span>वोटर ID : {v.epic}</span>
                            </div>
                          </div>
                          <div className="a4SlipBoothAddress">
                            केंद्र : {v.boothAddress || "रा.उ.मा.वि. मतदान केंद्र"}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={`empty-slot-${slotIdx}`} className="a4MiniSlipCard a4EmptySlipCard">
                        <div className="a4EmptyCardInner">
                          <span style={{ fontSize: "16px", opacity: 0.4 }}>◻️</span>
                          <span>{lang === "hi" ? `पर्ची ${slotIdx + 1} (रिक्त स्थान)` : `Slip ${slotIdx + 1} (Blank)`}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
function CandidateDashboard({
  go,
  candidate,
  voters,
  t,
  user,
}: {
  go: (p: string) => void;
  candidate: CandidateAccount;
  voters: VoterRecord[];
  t: (typeof translations)["hi"];
  user?: UserAccount | null;
}) {
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
        {user?.role === "SUPER_ADMIN" ? (
          <button className="primary" onClick={() => go("import")}>
            <Upload size={16} />
            <span className="desktopOnly">{t.importVotersFull}</span>
            <span className="mobileOnly">{t.importVoters}</span>
          </button>
        ) : (
          <button className="primary" onClick={() => go("boothmanager")}>
            <Vote size={16} />
            <span>{t.boothManager} ›</span>
          </button>
        )}
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
            {user?.role === "SUPER_ADMIN" && (
              <button onClick={() => go("import")}>
                <i className="blue"><FileSpreadsheet /></i>
                <span>
                  <b>{t.uploadNewList}</b>
                  <small>{t.uploadSub}</small>
                </span>
                ›
              </button>
            )}
            <button onClick={() => go("boothmanager")}>
              <i className="blue"><Vote /></i>
              <span>
                <b>{t.boothManager}</b>
                <small>वोटर लिस्ट, सर्च, पर्ची व स्लिप प्रबंधन</small>
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
  user,
}: {
  candidateId: string;
  voters: VoterRecord[];
  onUpdate: () => void;
  t: (typeof translations)["hi"];
  user?: UserAccount | null;
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

  const [ageSortOrder, setAgeSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [showAgeSortMenu, setShowAgeSortMenu] = useState(false);
  const [nameSortOrder, setNameSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [showNameSortMenu, setShowNameSortMenu] = useState(false);

  const extraExcelColumns = useMemo(() => {
    const standardKeys = new Set([
      "id", "candidateId", "booth", "serialNo", "name", "guardian", "age", "gender",
      "house", "address", "boothAddress", "phone", "epic", "voted", "isSupporter",
      "isOutside", "status", "worker", "notes", "slipMessage", "survey", "extraData",
      "voterCount", "createdAt", "updatedAt"
    ]);

    const colsSet = new Set<string>();
    for (const v of voters) {
      if (v.extraData && typeof v.extraData === "object") {
        for (const k of Object.keys(v.extraData)) {
          if (!standardKeys.has(k)) {
            colsSet.add(k);
          }
        }
      }
      for (const k of Object.keys(v)) {
        const val = (v as Record<string, any>)[k];
        if (!standardKeys.has(k) && typeof val !== "object" && typeof val !== "function") {
          colsSet.add(k);
        }
      }
    }
    return Array.from(colsSet);
  }, [voters]);

  const filtered = useMemo(() => {
    let list = voters.filter((v) => {
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

    // Apply Alphabetical Name Sorting strictly according to English Roman ABCD (A-Z / Z-A)
    // Works for both Hindi Devanagari (transliterated to English phonetics) and English names
    if (nameSortOrder !== "none") {
      list = [...list].sort((a, b) => {
        const keyA = getEnglishSortKey(a.name);
        const keyB = getEnglishSortKey(b.name);
        if (!keyA && !keyB) return 0;
        if (!keyA) return 1;
        if (!keyB) return -1;
        const comp = keyA.localeCompare(keyB, "en", { sensitivity: "base", numeric: true });
        if (comp !== 0) {
          return nameSortOrder === "asc" ? comp : -comp;
        }
        return nameSortOrder === "asc"
          ? (a.name || "").localeCompare(b.name || "")
          : (b.name || "").localeCompare(a.name || "");
      });
    } else if (ageSortOrder !== "none") {
      const getNumAge = (v: VoterRecord) => {
        if (!v.age) return -1;
        const n = parseInt(String(v.age).replace(/\D/g, ""), 10);
        return isNaN(n) ? -1 : n;
      };

      list = [...list].sort((a, b) => {
        const ageA = getNumAge(a);
        const ageB = getNumAge(b);
        if (ageSortOrder === "asc") {
          if (ageA === -1 && ageB === -1) return 0;
          if (ageA === -1) return 1;
          if (ageB === -1) return -1;
          return ageA - ageB;
        } else {
          if (ageA === -1 && ageB === -1) return 0;
          if (ageA === -1) return 1;
          if (ageB === -1) return -1;
          return ageB - ageA;
        }
      });
    }

    return list;
  }, [voters, boothFilter, statusFilter, q, advName, advFather, advAddress, advEpic, ageSortOrder, nameSortOrder]);

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

  const handleExportExcel = () => {
    if (filtered.length === 0) return;
    try {
      const exportRows = filtered.map((v, idx) => {
        const row: Record<string, any> = {
          "भाग संख्या (Part No)": v.booth || "—",
          "क्रम संख्या (Serial No)": v.serialNo !== undefined && v.serialNo !== "" ? v.serialNo : idx + 1,
          "मतदाता का नाम (Name)": v.name || "",
          "पिता/पति का नाम (Guardian)": v.guardian || "—",
          "वोट डाला (Voted)": (v.voted === "हाँ" || v.voted === "Yes" || v.voted === true) ? "हाँ" : "नहीं",
          "समर्थक (Supporter)": (v.isSupporter === "हाँ" || v.isSupporter === "Yes" || v.isSupporter === true || v.status === "In-Favor") ? "हाँ" : "नहीं",
          "बाहर है (Outside)": (v.isOutside === "हाँ" || v.isOutside === "Yes" || v.isOutside === true) ? "हाँ" : "नहीं",
          "आयु (Age)": v.age || "—",
          "मोबाइल नंबर (Mobile)": v.phone || "—",
          "वोटर ID / पहचान पत्र (EPIC)": v.epic || "—",
          "मकान नंबर (House No)": v.house || "—",
          "पता (Address)": v.address || "—",
          "मतदान केंद्र (Booth Address)": v.boothAddress || "—",
          "लिंग (Gender)": v.gender || "—",
          "स्थिति (Status)": v.status || "Pending",
          "कार्यकर्ता (Worker)": v.worker || "—",
        };

        if (extraExcelColumns && extraExcelColumns.length > 0) {
          extraExcelColumns.forEach((col) => {
            let val = v.extraData && typeof v.extraData === "object" ? v.extraData[col] : undefined;
            if (val === undefined) {
              val = (v as Record<string, any>)[col];
            }
            row[col] = val !== undefined && val !== null ? val : "—";
          });
        }
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const colWidths = Object.keys(exportRows[0] || {}).map((key) => {
        const maxContentLen = Math.max(
          key.length,
          ...exportRows.slice(0, 40).map((r) => String(r[key] || "").length)
        );
        return { wch: Math.min(45, Math.max(12, maxContentLen + 3)) };
      });
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Current_Page_Voters");

      let filePrefix = "Current_Page";
      if (q.trim()) {
        filePrefix = `Search_${q.trim().replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, "_")}`;
      } else if (advName.trim()) {
        filePrefix = `Name_${advName.trim().replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, "_")}`;
      } else if (boothFilter !== "ALL") {
        filePrefix = `Booth_${boothFilter}`;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `VoterDesk_${filePrefix}_${filtered.length}_voters_${dateStr}.xlsx`);
    } catch (err) {
      alert("Excel download error: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <>
      <Title
        tag="VOTER DATABASE"
        title="Voter Registry"
        sub={`Total ${filtered.length} voters match your filters.`}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="outline"
            onClick={handleExportExcel}
            style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46", fontWeight: 700 }}
            title="करंट पेज का पूरा डेटा Excel (.xlsx) में डाउनलोड करें"
          >
            <Download size={16} /> Current Page Excel ({filtered.length})
          </button>
          {user?.role === "SUPER_ADMIN" && (
            <button className="outline" onClick={downloadSampleExcelTemplate} title="11 कॉलम वाला एक्सेल टेम्पलेट डाउनलोड करें">
              <Download size={16} /> Download Template (.xlsx)
            </button>
          )}
          <button className="outline" onClick={handleExportCSV}>
            <Download size={16} /> Export CSV
          </button>
          {user?.role === "SUPER_ADMIN" && (
            <button className="primary" onClick={() => setShowAddModal(true)}>
              <Plus /> Add Single Voter
            </button>
          )}
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
                  👤 Voter Name
                </label>
                <input
                  type="text"
                  value={advName}
                  onChange={(e) => setAdvName(e.target.value)}
                  style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>
                  👨‍👧 Father / Husband
                </label>
                <input
                  type="text"
                  value={advFather}
                  onChange={(e) => setAdvFather(e.target.value)}
                  style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>
                  🏠 Address / House
                </label>
                <input
                  type="text"
                  value={advAddress}
                  onChange={(e) => setAdvAddress(e.target.value)}
                  style={{ width: "100%", height: "34px", padding: "0 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#334155", marginBottom: "3px" }}>
                  🆔 EPIC Number
                </label>
                <input
                  type="text"
                  value={advEpic}
                  onChange={(e) => setAdvEpic(e.target.value)}
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
                {/* 3. नाम (Name) with Alphabetical ABCD Sort Button */}
                <th style={{ minWidth: "160px", position: "relative" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span>नाम</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowNameSortMenu((prev) => !prev);
                        setShowAgeSortMenu(false);
                      }}
                      style={{
                        background: nameSortOrder !== "none" ? "#0284c7" : "#ffffff",
                        color: nameSortOrder !== "none" ? "#ffffff" : "#475569",
                        border: "1px solid",
                        borderColor: nameSortOrder !== "none" ? "#0284c7" : "#cbd5e1",
                        borderRadius: "4px",
                        padding: "2px 6px",
                        cursor: "pointer",
                        fontSize: "10.5px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                      title="अंग्रेज़ी ABCD वर्णमाला क्रम में सेट करें"
                    >
                      <ArrowUpDown size={11} />
                      <span>A-Z</span>
                      {nameSortOrder === "asc" && " ↑"}
                      {nameSortOrder === "desc" && " ↓"}
                    </button>
                  </div>

                  {/* Dropdown Menu for Name Alphabetical Sorting */}
                  {showNameSortMenu && (
                    <>
                      <div
                        style={{ position: "fixed", inset: 0, zIndex: 100 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNameSortMenu(false);
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          marginTop: "4px",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                          padding: "6px",
                          zIndex: 101,
                          minWidth: "220px",
                          textAlign: "left",
                          color: "#0f172a",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", padding: "4px 8px", borderBottom: "1px solid #f1f5f9", marginBottom: "4px" }}>
                          अंग्रेज़ी ABCD क्रम (English Alphabetical)
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNameSortOrder("asc");
                            setAgeSortOrder("none");
                            setShowNameSortMenu(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            width: "100%",
                            padding: "7px 10px",
                            border: "none",
                            borderRadius: "6px",
                            background: nameSortOrder === "asc" ? "#e0f2fe" : "transparent",
                            color: nameSortOrder === "asc" ? "#0369a1" : "#1e293b",
                            fontSize: "12px",
                            fontWeight: nameSortOrder === "asc" ? 700 : 500,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span>🔤</span>
                          <span>A to Z (English ABCD क्रम)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNameSortOrder("desc");
                            setAgeSortOrder("none");
                            setShowNameSortMenu(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            width: "100%",
                            padding: "7px 10px",
                            border: "none",
                            borderRadius: "6px",
                            background: nameSortOrder === "desc" ? "#e0f2fe" : "transparent",
                            color: nameSortOrder === "desc" ? "#0369a1" : "#1e293b",
                            fontSize: "12px",
                            fontWeight: nameSortOrder === "desc" ? 700 : 500,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span>🔠</span>
                          <span>Z to A (English DCBA क्रम)</span>
                        </button>
                        {nameSortOrder !== "none" && (
                          <button
                            type="button"
                            onClick={() => {
                              setNameSortOrder("none");
                              setShowNameSortMenu(false);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              width: "100%",
                              padding: "6px 10px",
                              marginTop: "4px",
                              borderTop: "1px solid #f1f5f9",
                              borderLeft: "none",
                              borderRight: "none",
                              borderBottom: "none",
                              borderRadius: "0 0 6px 6px",
                              background: "transparent",
                              color: "#ef4444",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <span>✕</span>
                            <span>क्रम हटाएं (डिफ़ॉल्ट क्रम)</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </th>

                <th style={{ minWidth: "130px" }}>पिता/पति</th>
                <th style={{ minWidth: "85px" }}>वोट डाला</th>
                <th style={{ minWidth: "85px" }}>सपोर्टर है</th>
                <th style={{ minWidth: "85px" }}>बाहर है</th>
                {/* 8. आयु (Age) - BEFORE Mobile No with Sort Button */}
                <th style={{ minWidth: "105px", position: "relative", textAlign: "center" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                    <span>आयु</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAgeSortMenu((prev) => !prev);
                        setShowNameSortMenu(false);
                      }}
                      style={{
                        background: ageSortOrder !== "none" ? "#0284c7" : "#ffffff",
                        color: ageSortOrder !== "none" ? "#ffffff" : "#475569",
                        border: "1px solid",
                        borderColor: ageSortOrder !== "none" ? "#0284c7" : "#cbd5e1",
                        borderRadius: "4px",
                        padding: "2px 5px",
                        cursor: "pointer",
                        fontSize: "10.5px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "2px",
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                      title="आयु अनुसार क्रमबद्ध करें"
                    >
                      <ArrowUpDown size={11} />
                      {ageSortOrder === "asc" && " ↑"}
                      {ageSortOrder === "desc" && " ↓"}
                    </button>
                  </div>

                  {showAgeSortMenu && (
                    <>
                      <div
                        style={{ position: "fixed", inset: 0, zIndex: 100 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAgeSortMenu(false);
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: "50%",
                          transform: "translateX(-50%)",
                          marginTop: "4px",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          borderRadius: "8px",
                          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                          padding: "6px",
                          zIndex: 101,
                          minWidth: "190px",
                          textAlign: "left",
                          color: "#0f172a",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", padding: "4px 8px", borderBottom: "1px solid #f1f5f9", marginBottom: "4px" }}>
                          आयु के अनुसार क्रम
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAgeSortOrder("desc");
                            setNameSortOrder("none");
                            setShowAgeSortMenu(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            width: "100%",
                            padding: "7px 10px",
                            border: "none",
                            borderRadius: "6px",
                            background: ageSortOrder === "desc" ? "#e0f2fe" : "transparent",
                            color: ageSortOrder === "desc" ? "#0369a1" : "#1e293b",
                            fontSize: "12px",
                            fontWeight: ageSortOrder === "desc" ? 700 : 500,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span>⬇️</span>
                          <span>घटते क्रम में (Descending)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAgeSortOrder("asc");
                            setNameSortOrder("none");
                            setShowAgeSortMenu(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            width: "100%",
                            padding: "7px 10px",
                            border: "none",
                            borderRadius: "6px",
                            background: ageSortOrder === "asc" ? "#e0f2fe" : "transparent",
                            color: ageSortOrder === "asc" ? "#0369a1" : "#1e293b",
                            fontSize: "12px",
                            fontWeight: ageSortOrder === "asc" ? 700 : 500,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span>⬆️</span>
                          <span>बढ़ते क्रम में (Ascending)</span>
                        </button>
                        {ageSortOrder !== "none" && (
                          <button
                            type="button"
                            onClick={() => {
                              setAgeSortOrder("none");
                              setShowAgeSortMenu(false);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              width: "100%",
                              padding: "6px 10px",
                              marginTop: "4px",
                              borderTop: "1px solid #f1f5f9",
                              background: "transparent",
                              color: "#ef4444",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            <span>✕</span>
                            <span>सामान्य क्रम (Reset)</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </th>
                {/* 9. मोबाइल नो */}
                <th style={{ minWidth: "115px" }}>मोबाइल नो</th>
                {/* 10. वोटर ID (EPIC) - AFTER Mobile No */}
                <th style={{ width: "110px" }}>वोटर ID</th>
                {/* 11. हाउस No */}
                <th style={{ width: "75px" }}>हाउस No</th>
                {/* 12. एड्रेस */}
                <th style={{ minWidth: "140px" }}>एड्रेस</th>
                {/* 13. Booth Address */}
                <th style={{ minWidth: "160px" }}>Booth Address</th>
                {/* 14+. Dynamic extra columns from Excel */}
                {extraExcelColumns.map((colName) => (
                  <th key={colName} className="thLeft" style={{ minWidth: "120px" }}>
                    {colName}
                  </th>
                ))}
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

                    {/* 8. आयु (Age) - BEFORE Mobile No */}
                    <td style={{ textAlign: "center", fontWeight: 700, color: "#1e293b", fontSize: "12.5px" }}>
                      {v.age ? `${v.age} वर्ष` : "—"}
                    </td>

                    {/* 9. मोबाइल नो */}
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

                    {/* 10. वोटर ID (EPIC) - AFTER Mobile No */}
                    <td style={{ textAlign: "center" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--blue)", fontSize: "12px" }}>{v.epic || "—"}</span>
                    </td>

                    {/* 11. हाउस No */}
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{v.house || "—"}</td>

                    {/* 12. एड्रेस */}
                    <td style={{ fontSize: "12px", color: "#334155" }}>{v.address || "—"}</td>

                    {/* 13. Booth Address */}
                    <td style={{ fontSize: "12px", color: "#0369a1" }}>{v.boothAddress || "—"}</td>

                    {/* 14+. All Dynamic Extra Columns from Excel */}
                    {extraExcelColumns.map((colName) => {
                      const val = (v.extraData && v.extraData[colName] !== undefined)
                        ? v.extraData[colName]
                        : (v as Record<string, any>)[colName];
                      return (
                        <td key={colName} style={{ fontSize: "12px", color: "#334155" }}>
                          {val !== undefined && val !== null && String(val).trim() !== "" ? String(val) : "—"}
                        </td>
                      );
                    })}

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

      {/* Add Single Voter Modal - Super Admin Only */}
      {showAddModal && user?.role === "SUPER_ADMIN" && (
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

    const mappedColNames = new Set(Object.values(fieldMap).filter(Boolean));
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
      const ageVal = fieldMap.age && row[fieldMap.age] !== undefined && String(row[fieldMap.age]).trim() !== ""
        ? String(row[fieldMap.age]).trim()
        : "35";

      // Preserve all extra columns from Excel sheet
      const extraData: Record<string, any> = {};
      for (const [key, val] of Object.entries(row)) {
        if (!mappedColNames.has(key)) {
          extraData[key] = val;
        }
      }

      return {
        name,
        epic,
        guardian: String(row[fieldMap.guardian] || "").trim(),
        age: ageVal,
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
        extraData,
        ...extraData,
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
  });
  const [createdCreds, setCreatedCreds] = useState<{
    name: string;
    phone: string;
    tempPassword: string;
    roleTitle: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.phone) return;

    const boothsArray = newMember.assignedBooths
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);

    try {
      const res = store.addTeamMember({
        name: newMember.name.trim(),
        phone: newMember.phone.trim(),
        roleTitle: newMember.roleTitle,
        assignedBooths: boothsArray,
        status: "Active",
        candidateId,
      });

      setShowAddModal(false);
      setNewMember({
        name: "",
        phone: "",
        roleTitle: "Booth Supervisor",
        assignedBooths: "12, 13",
      });
      onUpdate();

      setCreatedCreds({
        name: res.member.name,
        phone: res.member.phone,
        tempPassword: res.tempPassword,
        roleTitle: res.member.roleTitle,
      });
    } catch (err: unknown) {
      alert("कार्यकर्ता जोड़ने में त्रुटि: " + (err instanceof Error ? err.message : String(err)));
    }
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

              <div className="formGroup">
                <label>Mobile Number (For Login ID) *</label>
                <input
                  required
                  placeholder="e.g. 9829012345"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                />
              </div>

              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 12px", borderRadius: "8px", fontSize: "12px", color: "#166534" }}>
                🔒 <b>सुरक्षा निर्देश:</b> कार्यकर्ता के लिए 8-अंकीय रैंडम संख्यात्मक पासवर्ड स्वतः जनरेट होगा तथा केवल एक बार स्क्रीन पर सुरक्षित कॉपी करने हेतु प्रदर्शित होगा।
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

      {/* One-Time Temporary Credentials Display Modal for newly created Karyakarta */}
      {createdCreds && (
        <div className="modalOverlay" style={{ zIndex: 9999999 }}>
          <div
            className="modalBox"
            style={{
              maxWidth: "500px",
              width: "95%",
              textAlign: "center",
              border: "2px solid #2563eb",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "4px" }}>🔐</div>
            <h3 style={{ fontSize: "18px", fontWeight: 900, color: "#0f172a", margin: "0 0 6px" }}>
              कार्यकर्ता अस्थायी क्रेडेंशियल
            </h3>

            <div
              style={{
                background: "#fef3c7",
                border: "1.5px solid #f59e0b",
                color: "#92400e",
                padding: "10px 12px",
                borderRadius: "8px",
                fontSize: "12.5px",
                fontWeight: 600,
                textAlign: "left",
                margin: "10px 0 14px",
              }}
            >
              ⚠️ <b>Security Notice:</b>
              <p style={{ margin: "2px 0 0", fontSize: "12px" }}>
                These temporary credentials will be shown only once. Please share them securely with the authorized user.
              </p>
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "14px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontSize: "12px" }}>नाम:</span>
                <b style={{ color: "#0f172a" }}>{createdCreds.name}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontSize: "12px" }}>भूमिका:</span>
                <span style={{ color: "#1d4ed8", fontWeight: 700 }}>{createdCreds.roleTitle}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b", fontSize: "12px" }}>लॉगिन मोबाइल:</span>
                <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#0f172a" }}>{createdCreds.phone}</span>
              </div>
              <div style={{ marginTop: "4px", paddingTop: "8px", borderTop: "1px dashed #cbd5e1" }}>
                <span style={{ color: "#b91c1c", fontSize: "12px", fontWeight: 800 }}>🔒 अस्थायी पासवर्ड:</span>
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1.5px solid #10b981",
                    borderRadius: "6px",
                    padding: "8px",
                    fontSize: "22px",
                    fontWeight: 900,
                    fontFamily: "monospace",
                    letterSpacing: "4px",
                    color: "#065f46",
                    textAlign: "center",
                    marginTop: "4px",
                  }}
                >
                  {createdCreds.tempPassword}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => {
                  const msg =
                    `🇮🇳 *VoterDesk कार्यकर्ता लॉगिन*\n` +
                    `👤 *नाम:* ${createdCreds.name}\n` +
                    `📱 *लॉगिन आईडी:* ${createdCreds.phone}\n` +
                    `🔒 *अस्थायी पासवर्ड:* ${createdCreds.tempPassword}\n` +
                    `🌐 *वेबसाइट:* ${window.location.origin}\n` +
                    `⚠️ *नोट:* प्रथम लॉगिन पर पासवर्ड बदलना अनिवार्य होगा।`;
                  navigator.clipboard.writeText(msg);
                  setCopiedCreds(true);
                  setTimeout(() => setCopiedCreds(false), 3000);
                }}
                style={{
                  flex: 1,
                  background: "#16a34a",
                  color: "#ffffff",
                  border: 0,
                  borderRadius: "8px",
                  padding: "10px",
                  fontWeight: 800,
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <Copy size={15} /> {copiedCreds ? "✓ कॉपी हो गया!" : "Copy Credentials"}
              </button>
              <button
                type="button"
                onClick={() => setCreatedCreds(null)}
                style={{
                  background: "#1e293b",
                  color: "#ffffff",
                  border: 0,
                  borderRadius: "8px",
                  padding: "10px 16px",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                बंद करें
              </button>
            </div>
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
