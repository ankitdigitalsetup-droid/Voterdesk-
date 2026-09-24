"use client";

import React, { useState } from "react";
import {
  BarChart3,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FileSpreadsheet,
  Key,
  LogOut,
  Plus,
  RefreshCw,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Users,
  Vote,
  X
} from "lucide-react";
import { BoothCredential, UserSession, VoterRecord, WardConfig } from "@/types";
import {
  exportCredentialsCSV,
  formatCredentialsForWhatsApp
} from "@/lib/credentialGenerator";
import { saveStoredCredentials, saveStoredVoters, saveStoredWards } from "@/lib/storage";

interface SuperAdminDashboardProps {
  wards: WardConfig[];
  credentials: BoothCredential[];
  voters: VoterRecord[];
  onAddNewWard: () => void;
  onLaunchCandidate: (ward: WardConfig, boothNum?: number) => void;
  onLaunchKaryakarta: (ward: WardConfig, boothNum: number, workerIndex: number) => void;
  onUpdateWards: (wards: WardConfig[], creds: BoothCredential[], voters: VoterRecord[]) => void;
  onLogout: () => void;
}

export function SuperAdminDashboard({
  wards,
  credentials,
  voters,
  onAddNewWard,
  onLaunchCandidate,
  onLaunchKaryakarta,
  onUpdateWards,
  onLogout
}: SuperAdminDashboardProps) {
  const [selectedWardForCreds, setSelectedWardForCreds] = useState<WardConfig | null>(null);
  const [showPasswords, setShowPasswords] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState<boolean>(false);

  // Overall metrics
  const totalBooths = wards.reduce((sum, w) => sum + w.totalBooths, 0);
  const totalCreds = credentials.length;
  const totalVoters = voters.length;

  const handleDeleteWard = (wardId: string) => {
    if (confirm("Are you sure you want to remove this Ward? Its credentials and voter list will also be removed.")) {
      const updatedWards = wards.filter((w) => w.id !== wardId);
      const updatedCreds = credentials.filter((c) => c.wardId !== wardId);
      const updatedVoters = voters.filter((v) => v.wardId !== wardId);
      saveStoredWards(updatedWards);
      saveStoredCredentials(updatedCreds);
      saveStoredVoters(updatedVoters);
      onUpdateWards(updatedWards, updatedCreds, updatedVoters);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleWhatsAppShare = (ward: WardConfig) => {
    const wardCreds = credentials.filter((c) => c.wardId === ward.id);
    const msg = formatCredentialsForWhatsApp(
      `${ward.wardNumber} - ${ward.wardName}`,
      ward.candidateName,
      wardCreds,
      typeof window !== "undefined" ? window.location.origin : "https://voterdesk.in"
    );
    navigator.clipboard.writeText(msg);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  const handleDownloadCSV = (ward: WardConfig) => {
    const wardCreds = credentials.filter((c) => c.wardId === ward.id);
    const csv = exportCredentialsCSV(`${ward.wardNumber} - ${ward.wardName}`, wardCreds);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ward.wardNumber.replace(/\s+/g, "_")}_Credentials.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="superAdminWrapper">
      {/* Super Admin Top Header */}
      <header className="superAdminHeader">
        <div className="saBrand">
          <i className="logo">
            <Vote />
          </i>
          <div>
            <b>VoterDesk Super Admin</b>
            <span>Multi-Ward &amp; Candidate Management Console</span>
          </div>
        </div>

        <div className="saHeaderActions">
          <button className="primary highlightBtn" onClick={onAddNewWard}>
            <Plus size={16} />
            <span>Setup New Ward &amp; Candidate</span>
          </button>
          <button className="outline logoutBtn" onClick={onLogout} title="Logout">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <div className="superAdminContent">
        {/* Banner with Overview */}
        <div className="saBanner">
          <div className="saBannerText">
            <em>CAMPAIGN PROVISIONING ENGINE</em>
            <h2>Master Command Center</h2>
            <p>
              Upload Ward voter data, candidate posters, and generate booth-wise passwords (1 Booth = 4 Passwords: 1 Candidate + 3 Karyakartas).
            </p>
          </div>
          <div className="saBannerCta">
            <button className="primary bigBtn" onClick={onAddNewWard}>
              <Sparkles size={18} />
              <span>+ Provision New Ward Card</span>
            </button>
          </div>
        </div>

        {/* Global Statistics Cards */}
        <div className="saStatsGrid">
          <div className="saStatCard">
            <div className="saStatIcon blue">
              <Vote size={22} />
            </div>
            <div className="saStatInfo">
              <span>Configured Wards</span>
              <b>{wards.length}</b>
              <small>Active election workspaces</small>
            </div>
          </div>

          <div className="saStatCard">
            <div className="saStatIcon green">
              <Users size={22} />
            </div>
            <div className="saStatInfo">
              <span>Total Booths</span>
              <b>{totalBooths}</b>
              <small>Polling stations mapped</small>
            </div>
          </div>

          <div className="saStatCard">
            <div className="saStatIcon orange">
              <Key size={22} />
            </div>
            <div className="saStatInfo">
              <span>Issued Passwords</span>
              <b>{totalCreds}</b>
              <small>Booths × 4 (Cand + Karyakartas)</small>
            </div>
          </div>

          <div className="saStatCard">
            <div className="saStatIcon purple">
              <FileSpreadsheet size={22} />
            </div>
            <div className="saStatInfo">
              <span>Voter Records</span>
              <b>{totalVoters.toLocaleString()}</b>
              <small>Loaded across all wards</small>
            </div>
          </div>
        </div>

        {/* Active Wards Section */}
        <div className="saSectionHead">
          <div>
            <h3>Active Ward Cards ({wards.length})</h3>
            <p>Each card represents an active Ward with its custom candidate poster, voter data, and booth credentials.</p>
          </div>
          <button className="primary" onClick={onAddNewWard}>
            <Plus size={16} /> New Ward Setup
          </button>
        </div>

        {/* Wards Grid */}
        <div className="wardsGrid">
          {wards.map((ward) => {
            const wardCreds = credentials.filter((c) => c.wardId === ward.id);
            const wardVoters = voters.filter((v) => v.wardId === ward.id);
            const candCreds = wardCreds.filter((c) => c.role === "candidate");
            const karyCreds = wardCreds.filter((c) => c.role === "karyakarta");

            return (
              <article key={ward.id} className="wardCard">
                {/* Poster & Header */}
                <div className="wardCardTop">
                  <div className="wardPosterThumb">
                    <img src={ward.posterUrl} alt={ward.candidateName} />
                  </div>
                  <div className="wardMainDetails">
                    <div className="wardBadgeRow">
                      <span className="wardNumberPill">{ward.wardNumber}</span>
                      <span className="wardBoothsPill">{ward.totalBooths} Booths</span>
                    </div>
                    <h4>{ward.candidateName}</h4>
                    <p className="wardLocality">{ward.wardName} • {ward.electionName}</p>
                    <p className="wardParty">{ward.partyName}</p>
                  </div>
                  <button
                    className="deleteWardBtn"
                    onClick={() => handleDeleteWard(ward.id)}
                    title="Delete Ward"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Password Breakdown Pill */}
                <div className="wardCredBreakdown">
                  <div className="credBadge candBadge">
                    <ShieldCheck size={14} />
                    <span>{candCreds.length} Candidate Pass</span>
                  </div>
                  <div className="credBadge karyBadge">
                    <Users size={14} />
                    <span>{karyCreds.length} Karyakarta Pass</span>
                  </div>
                  <div className="credTotalBadge">
                    <b>{wardCreds.length} Total</b>
                  </div>
                </div>

                {/* Booth Info Bar */}
                <div className="wardStatsRow">
                  <div className="wardStatItem">
                    <small>Booths</small>
                    <b>{ward.totalBooths}</b>
                  </div>
                  <div className="wardStatItem">
                    <small>Voter List</small>
                    <b>{wardVoters.length} Records</b>
                  </div>
                  <div className="wardStatItem">
                    <small>Formula</small>
                    <b>{ward.totalBooths} × 4 = {ward.totalBooths * 4}</b>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="wardCardActions">
                  <button
                    className="saActionBtn cand"
                    onClick={() => onLaunchCandidate(ward, 1)}
                    title="Launch Candidate Admin"
                  >
                    <ShieldCheck size={15} />
                    <span>Candidate Admin</span>
                  </button>
                  <button
                    className="saActionBtn kary"
                    onClick={() => onLaunchKaryakarta(ward, 1, 1)}
                    title="Launch Karyakarta Field App"
                  >
                    <Smartphone size={15} />
                    <span>Karyakarta App</span>
                  </button>
                  <button
                    className="saActionBtn creds"
                    onClick={() => setSelectedWardForCreds(ward)}
                    title="View & Share Passwords"
                  >
                    <Key size={15} />
                    <span>Passwords ({wardCreds.length})</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Credentials Modal */}
      {selectedWardForCreds && (
        <div className="modalBackdrop" onClick={() => setSelectedWardForCreds(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <div className="modalBadge">
                  <Key size={14} />
                  <span>CREDENTIALS MANAGER</span>
                </div>
                <h3>{selectedWardForCreds.wardNumber} ({selectedWardForCreds.wardName}) Passwords</h3>
                <p>Candidate: <b>{selectedWardForCreds.candidateName}</b> • {selectedWardForCreds.totalBooths} Booths = {selectedWardForCreds.totalBooths * 4} Passwords</p>
              </div>
              <button className="modalCloseBtn" onClick={() => setSelectedWardForCreds(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="modalToolbar">
              <button
                className="outline"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
                <span>{showPasswords ? "Hide" : "Show"} Passwords</span>
              </button>
              <button
                className="outline"
                onClick={() => handleDownloadCSV(selectedWardForCreds)}
              >
                <Download size={15} />
                <span>Export CSV</span>
              </button>
              <button
                className="whatsAppBtn"
                onClick={() => handleWhatsAppShare(selectedWardForCreds)}
              >
                {copiedWhatsApp ? <Check size={16} /> : <Share2 size={16} />}
                <span>{copiedWhatsApp ? "Copied for WhatsApp!" : "Share on WhatsApp"}</span>
              </button>
            </div>

            <div className="modalBody">
              {Array.from({ length: selectedWardForCreds.totalBooths }, (_, idx) => {
                const bNum = idx + 1;
                const bCreds = credentials.filter(
                  (c) => c.wardId === selectedWardForCreds.id && c.boothNumber === bNum
                );
                const cand = bCreds.find((c) => c.role === "candidate");
                const karys = bCreds.filter((c) => c.role === "karyakarta");

                return (
                  <div key={bNum} className="modalBoothGroup">
                    <div className="modalBoothHeader">
                      <span className="boothNumPill">Booth {bNum}</span>
                      <span>4 Passwords (1 Candidate + 3 Karyakarta)</span>
                    </div>

                    <div className="modalCredList">
                      {cand && (
                        <div className="modalCredRow candidate">
                          <div className="rowRole">
                            <ShieldCheck size={16} />
                            <div>
                              <b>Candidate Login</b>
                              <small>Booth {bNum}</small>
                            </div>
                          </div>
                          <div className="rowUser">
                            <small>Username</small>
                            <code>{cand.username}</code>
                          </div>
                          <div className="rowPass">
                            <small>Password</small>
                            <b>{showPasswords ? cand.password : "••••••••"}</b>
                          </div>
                          <button
                            className="copyIconBtn"
                            onClick={() => handleCopy(`${cand.username} / ${cand.password}`, cand.id)}
                            title="Copy Credentials"
                          >
                            {copiedId === cand.id ? <Check size={15} /> : <Copy size={15} />}
                          </button>
                          <button
                            className="launchMiniBtn"
                            onClick={() => {
                              setSelectedWardForCreds(null);
                              onLaunchCandidate(selectedWardForCreds, bNum);
                            }}
                            title="Open App as this Candidate"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      )}

                      {karys.map((k) => (
                        <div key={k.id} className="modalCredRow karyakarta">
                          <div className="rowRole">
                            <Users size={16} />
                            <div>
                              <b>Karyakarta {k.workerIndex}</b>
                              <small>Booth {bNum}</small>
                            </div>
                          </div>
                          <div className="rowUser">
                            <small>Username</small>
                            <code>{k.username}</code>
                          </div>
                          <div className="rowPass">
                            <small>Password</small>
                            <b>{showPasswords ? k.password : "••••••••"}</b>
                          </div>
                          <button
                            className="copyIconBtn"
                            onClick={() => handleCopy(`${k.username} / ${k.password}`, k.id)}
                            title="Copy Credentials"
                          >
                            {copiedId === k.id ? <Check size={15} /> : <Copy size={15} />}
                          </button>
                          <button
                            className="launchMiniBtn"
                            onClick={() => {
                              setSelectedWardForCreds(null);
                              onLaunchKaryakarta(selectedWardForCreds, bNum, k.workerIndex || 1);
                            }}
                            title="Open App as this Karyakarta"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modalFooter">
              <button className="primary" onClick={() => setSelectedWardForCreds(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
