"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Filter,
  Home,
  LogOut,
  MapPin,
  Phone,
  Search,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
  UserRound,
  Users,
  Vote,
  X
} from "lucide-react";
import { UserSession, VoterRecord, WardConfig } from "@/types";

interface KaryakartaAppProps {
  session: UserSession;
  ward: WardConfig;
  voters: VoterRecord[];
  onUpdateVoterStatus: (voterId: string, newStatus: VoterRecord["status"]) => void;
  onLogout: () => void;
  onSwitchToSuperAdmin: () => void;
}

export function KaryakartaApp({
  session,
  ward,
  voters,
  onUpdateVoterStatus,
  onLogout,
  onSwitchToSuperAdmin
}: KaryakartaAppProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedVoter, setSelectedVoter] = useState<VoterRecord | null>(null);
  const [showPosterModal, setShowPosterModal] = useState<boolean>(false);
  const [copiedSlip, setCopiedSlip] = useState<boolean>(false);

  const boothNum = session.boothNumber || 1;
  const workerIdx = session.workerIndex || 1;

  // Filter voters for this worker's assigned booth
  const boothVoters = useMemo(() => {
    return voters.filter((v) => v.wardId === ward.id && v.booth === boothNum);
  }, [voters, ward.id, boothNum]);

  // Apply search & status filters
  const filteredVoters = useMemo(() => {
    return boothVoters.filter((v) => {
      const matchesSearch = (v.name + v.epic + v.guardian + v.house).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "All" || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [boothVoters, searchTerm, statusFilter]);

  // Metrics
  const contactedCount = boothVoters.filter((v) => v.status === "Contacted" || v.status === "Supporter").length;
  const supporterCount = boothVoters.filter((v) => v.status === "Supporter").length;
  const pendingCount = boothVoters.filter((v) => v.status === "Pending").length;
  const progressPercent = boothVoters.length > 0 ? Math.round((contactedCount / boothVoters.length) * 100) : 0;

  // Generate WhatsApp message for voter slip
  const handleShareVoterSlip = (v: VoterRecord) => {
    const text = `🗳️ *मतदाता पर्ची — ${ward.electionName}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *मतदाता नाम:* ${v.name}\n` +
      `🆔 *EPIC / पहचान पत्र:* ${v.epic}\n` +
      `👨‍👦 *पिता/पति:* ${v.guardian}\n` +
      `🏠 *मकान नं:* ${v.house}\n` +
      `📍 *बूथ क्रमांक:* ${v.booth} (${ward.wardNumber})\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `⭐ *प्रत्याशी:* ${ward.candidateName}\n` +
      `🚩 *चुनाव चिन्ह:* ${ward.symbolName || "उगता सूरज"}\n` +
      `🗳️ _कृपया अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं!_`;

    navigator.clipboard.writeText(text);
    setCopiedSlip(true);
    setTimeout(() => setCopiedSlip(false), 2500);
  };

  return (
    <div className="karyakartaShell">
      {/* Mobile-Friendly Top Bar */}
      <header className="karyHeader">
        <div className="karyHeaderLeft">
          <div className="karyAvatar">
            <span>K{workerIdx}</span>
          </div>
          <div>
            <b>Karyakarta {workerIdx}</b>
            <span>Booth {boothNum} • {ward.wardNumber}</span>
          </div>
        </div>

        <div className="karyHeaderRight">
          <button className="superAdminSwitchBtn" onClick={onSwitchToSuperAdmin} title="Switch to Super Admin">
            Super Admin
          </button>
          <button className="karyLogoutBtn" onClick={onLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="karyMain">
        {/* Candidate Poster Banner Card */}
        <div className="candidateBannerCard">
          <div className="bannerPosterThumb" onClick={() => setShowPosterModal(true)}>
            <img src={ward.posterUrl} alt={ward.candidateName} />
            <div className="thumbZoom"><Sparkles size={12} /> View</div>
          </div>
          <div className="bannerInfo">
            <div className="bannerPill">OFFICIAL CAMPAIGN BANNER</div>
            <h2>{ward.candidateName}</h2>
            <p className="bannerWard">{ward.wardNumber} ({ward.wardName})</p>
            <p className="bannerParty">{ward.partyName} • {ward.symbolName}</p>
          </div>
        </div>

        {/* Booth Progress Stats */}
        <div className="boothProgressCard">
          <div className="progressHead">
            <div>
              <span className="boothPillTitle">BOOTH {boothNum} FIELD PROGRESS</span>
              <h3>{contactedCount} of {boothVoters.length} Voters Contacted</h3>
            </div>
            <div className="progressBadge">{progressPercent}%</div>
          </div>

          <div className="progressBarWrap">
            <div className="progressBarFill" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="miniStatsRow">
            <div className="miniStat green">
              <span>Contacted</span>
              <b>{contactedCount}</b>
            </div>
            <div className="miniStat blue">
              <span>Supporters</span>
              <b>{supporterCount}</b>
            </div>
            <div className="miniStat orange">
              <span>Pending</span>
              <b>{pendingCount}</b>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="karySearchCard">
          <div className="searchBox">
            <Search size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search voter by name, EPIC, house..."
            />
            {searchTerm && (
              <button className="clearBtn" onClick={() => setSearchTerm("")}>
                <X size={15} />
              </button>
            )}
          </div>

          <div className="filterChips">
            {["All", "Pending", "Contacted", "Supporter", "Follow-up"].map((filter) => (
              <button
                key={filter}
                className={`filterChip ${statusFilter === filter ? "active" : ""}`}
                onClick={() => setStatusFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Voter Cards List */}
        <div className="voterListArea">
          <div className="voterListHeader">
            <span>Showing {filteredVoters.length} voters in Booth {boothNum}</span>
          </div>

          {filteredVoters.length === 0 ? (
            <div className="emptyVoterBox">
              <Users size={32} />
              <p>No voters found matching your search.</p>
            </div>
          ) : (
            filteredVoters.map((v) => (
              <div key={v.id} className="karyVoterCard">
                <div className="voterCardTop">
                  <div>
                    <h4>{v.name}</h4>
                    <span className="voterGuardian">S/O, W/O: {v.guardian}</span>
                  </div>
                  <span className={`statusPill ${v.status.toLowerCase()}`}>{v.status}</span>
                </div>

                <div className="voterCardDetails">
                  <div>
                    <small>EPIC Number</small>
                    <code>{v.epic}</code>
                  </div>
                  <div>
                    <small>Age / Sex</small>
                    <span>{v.age} / {v.gender}</span>
                  </div>
                  <div>
                    <small>House No.</small>
                    <span>{v.house}</span>
                  </div>
                </div>

                {/* Quick Status Updater */}
                <div className="statusUpdateRow">
                  <span className="quickLabel">Quick Update:</span>
                  <div className="statusBtnGroup">
                    <button
                      className={`statusActionBtn ${v.status === "Contacted" ? "current green" : ""}`}
                      onClick={() => onUpdateVoterStatus(v.id, "Contacted")}
                    >
                      Contacted
                    </button>
                    <button
                      className={`statusActionBtn ${v.status === "Supporter" ? "current blue" : ""}`}
                      onClick={() => onUpdateVoterStatus(v.id, "Supporter")}
                    >
                      Supporter
                    </button>
                    <button
                      className={`statusActionBtn ${v.status === "Follow-up" ? "current orange" : ""}`}
                      onClick={() => onUpdateVoterStatus(v.id, "Follow-up")}
                    >
                      Follow-up
                    </button>
                  </div>
                  <button
                    className="slipShareBtn"
                    onClick={() => {
                      setSelectedVoter(v);
                      handleShareVoterSlip(v);
                    }}
                    title="Generate & Copy Voter Slip"
                  >
                    <Share2 size={14} />
                    <span>Slip</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Voter Slip Modal */}
      {selectedVoter && (
        <div className="modalBackdrop" onClick={() => setSelectedVoter(null)}>
          <div className="modalCard voterSlipModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <div className="modalBadge">DIGITAL VOTER SLIP</div>
                <h3>{selectedVoter.name}</h3>
              </div>
              <button className="modalCloseBtn" onClick={() => setSelectedVoter(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="slipContentBox">
              <div className="slipPosterBanner">
                <img src={ward.posterUrl} alt={ward.candidateName} />
                <div className="slipCandidateMeta">
                  <b>{ward.candidateName}</b>
                  <span>{ward.electionName} • {ward.wardNumber}</span>
                </div>
              </div>

              <div className="slipGrid">
                <div className="slipField">
                  <small>EPIC Number</small>
                  <b>{selectedVoter.epic}</b>
                </div>
                <div className="slipField">
                  <small>Booth / Part</small>
                  <b>Booth {selectedVoter.booth}</b>
                </div>
                <div className="slipField">
                  <small>House Number</small>
                  <b>{selectedVoter.house}</b>
                </div>
                <div className="slipField">
                  <small>Guardian</small>
                  <b>{selectedVoter.guardian}</b>
                </div>
              </div>
            </div>

            <div className="modalFooter">
              <button
                className="whatsAppBtn fullWidth"
                onClick={() => handleShareVoterSlip(selectedVoter)}
              >
                {copiedSlip ? <Check size={16} /> : <Share2 size={16} />}
                <span>{copiedSlip ? "Slip Copied to Clipboard!" : "Copy Voter Slip for WhatsApp"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Poster Fullview Modal */}
      {showPosterModal && (
        <div className="modalBackdrop" onClick={() => setShowPosterModal(false)}>
          <div className="modalCard posterFullModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>Official Campaign Poster</h3>
              <button className="modalCloseBtn" onClick={() => setShowPosterModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="fullPosterWrap">
              <img src={ward.posterUrl} alt={ward.candidateName} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
