"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Image as ImageIcon,
  Key,
  Lock,
  Plus,
  RefreshCw,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
  User,
  Users,
  Vote
} from "lucide-react";
import { BoothCredential, VoterRecord, WardConfig } from "@/types";
import {
  exportCredentialsCSV,
  formatCredentialsForWhatsApp,
  generateBoothCredentials
} from "@/lib/credentialGenerator";
import {
  generateSampleVotersForWard,
  PRESET_POSTERS,
  saveStoredCredentials,
  saveStoredVoters,
  saveStoredWards
} from "@/lib/storage";

interface WardSetupCardProps {
  onCancel: () => void;
  onSaved: (ward: WardConfig, credentials: BoothCredential[]) => void;
  existingWards: WardConfig[];
  existingCredentials: BoothCredential[];
  existingVoters: VoterRecord[];
}

export function WardSetupCard({
  onCancel,
  onSaved,
  existingWards,
  existingCredentials,
  existingVoters
}: WardSetupCardProps) {
  // Step navigation (1: Details, 2: Voter Data, 3: Poster, 4: Passwords)
  const [step, setStep] = useState<number>(1);

  // Form State
  const [wardNumber, setWardNumber] = useState<string>("Ward 12");
  const [wardName, setWardName] = useState<string>("Shastri Nagar");
  const [electionName, setElectionName] = useState<string>("Bhilwara Municipal Corporation 2026");
  const [candidateName, setCandidateName] = useState<string>("Ramesh Sharma");
  const [candidatePhone, setCandidatePhone] = useState<string>("98290 12345");
  const [partyName, setPartyName] = useState<string>("Jan Kalyan Morcha / Independent");
  const [symbolName, setSymbolName] = useState<string>("Rising Sun (उगता सूरज)");
  const [totalBooths, setTotalBooths] = useState<number>(2); // Default 2 booths = 8 passwords

  // Voter Data State
  const [voterFile, setVoterFile] = useState<{ name: string; size: string } | null>(null);
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);

  // Poster State
  const [posterUrl, setPosterUrl] = useState<string>(PRESET_POSTERS[1].url);
  const [customPosterName, setCustomPosterName] = useState<string>("");

  // Password State
  const [generatedCredentials, setGeneratedCredentials] = useState<BoothCredential[]>([]);
  const [showPasswords, setShowPasswords] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState<boolean>(false);

  // Derived ward ID
  const wardId = `ward-${wardNumber.toLowerCase().replace(/[^a-z0-9]/g, "-") || "new"}-${Date.now()}`;

  // Handle booth count change
  const handleBoothChange = (count: number) => {
    const valid = Math.max(1, Math.min(20, count));
    setTotalBooths(valid);
    // If passwords were already generated, regenerate with new booth count
    if (generatedCredentials.length > 0) {
      const newCreds = generateBoothCredentials(wardId, wardNumber, valid);
      setGeneratedCredentials(newCreds);
    }
  };

  // Load sample voter list for this ward
  const loadSampleVoterData = () => {
    const sample = generateSampleVotersForWard(wardId, totalBooths);
    setVoters(sample);
    setVoterFile({ name: `${wardNumber.replace(/\s+/g, "_")}_Voter_List.xlsx`, size: "48 KB" });
    setIsDataLoaded(true);
  };

  // Handle custom voter file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVoterFile({ name: file.name, size: `${(file.size / 1024).toFixed(1)} KB` });

    // Read CSV or generate realistic records mapped to booths
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && file.name.endsWith(".csv")) {
        const lines = content.split("\n").filter((l) => l.trim().length > 0);
        const parsed: VoterRecord[] = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
          if (parts.length >= 2) {
            const bNum = Math.min(totalBooths, Math.max(1, parseInt(parts[4] || "1", 10) || ((i % totalBooths) + 1)));
            parsed.push({
              id: `v-${wardId}-${i}`,
              wardId,
              name: parts[0] || `Voter ${i}`,
              epic: parts[1] || `RJX${1000000 + i}`,
              guardian: parts[2] || "Relative",
              age: parts[3] || "35",
              gender: (i % 2 === 0 ? "Male" : "Female"),
              house: parts[5] || `${i}-A`,
              booth: bNum,
              status: "Pending"
            });
          }
        }
        if (parsed.length > 0) {
          setVoters(parsed);
          setIsDataLoaded(true);
          return;
        }
      }
      // Fallback or excel simulation
      loadSampleVoterData();
    };
    reader.readAsText(file);
  };

  // Handle custom poster upload
  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomPosterName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setPosterUrl(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Generate Booth Passwords (1 booth = 4, 2 booths = 8, 3 booths = 12)
  const handleGenerateCredentials = () => {
    const creds = generateBoothCredentials(wardId, wardNumber, totalBooths);
    setGeneratedCredentials(creds);
  };

  // Copy single credential
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy all for WhatsApp
  const handleCopyWhatsApp = () => {
    const msg = formatCredentialsForWhatsApp(
      `${wardNumber} - ${wardName}`,
      candidateName,
      generatedCredentials,
      typeof window !== "undefined" ? window.location.origin : "https://voterdesk.in"
    );
    navigator.clipboard.writeText(msg);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  // Download CSV
  const handleDownloadCSV = () => {
    const csv = exportCredentialsCSV(`${wardNumber} - ${wardName}`, generatedCredentials);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${wardNumber.replace(/\s+/g, "_")}_Booth_Credentials.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Final Save & Activate Ward
  const handleSaveAndActivate = () => {
    let finalCreds = generatedCredentials;
    if (finalCreds.length === 0) {
      finalCreds = generateBoothCredentials(wardId, wardNumber, totalBooths);
    }

    let finalVoters = voters;
    if (finalVoters.length === 0) {
      finalVoters = generateSampleVotersForWard(wardId, totalBooths);
    }

    const boothsData = Array.from({ length: totalBooths }, (_, idx) => {
      const bNum = idx + 1;
      const bVoters = finalVoters.filter((v) => v.booth === bNum).length;
      return {
        boothNumber: bNum,
        name: `Booth ${bNum} - Polling Station`,
        location: `Ward ${wardNumber} Community Center ${bNum}`,
        voterCount: bVoters || 450
      };
    });

    const newWard: WardConfig = {
      id: wardId,
      wardNumber,
      wardName,
      electionName,
      candidateName,
      candidatePhone,
      partyName,
      posterUrl,
      symbolName,
      totalBooths,
      booths: boothsData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to storage
    const updatedWards = [newWard, ...existingWards.filter((w) => w.id !== wardId)];
    const updatedCreds = [...existingCredentials.filter((c) => c.wardId !== wardId), ...finalCreds];
    const updatedVoters = [...existingVoters.filter((v) => v.wardId !== wardId), ...finalVoters];

    saveStoredWards(updatedWards);
    saveStoredCredentials(updatedCreds);
    saveStoredVoters(updatedVoters);

    onSaved(newWard, finalCreds);
  };

  return (
    <div className="wardSetupCardWrap">
      {/* Card Header */}
      <div className="setupCardHeader">
        <div className="setupTitleArea">
          <button className="backBtn" onClick={onCancel}>
            <ArrowLeft />
          </button>
          <div>
            <div className="setupBadge">
              <Sparkles size={13} />
              <span>SUPER ADMIN SETUP CARD</span>
            </div>
            <h1>Ward & Candidate Provisioning</h1>
            <p>Upload voter list, candidate poster, and generate booth-wise passwords.</p>
          </div>
        </div>

        {/* Live Password Math Pill */}
        <div className="mathPill">
          <div className="mathNumber">{totalBooths}</div>
          <div>
            <div className="mathLabel">Booths Configured</div>
            <div className="mathDetail">
              <b>{totalBooths * 4} Passwords</b> ({totalBooths} Candidate + {totalBooths * 3} Karyakarta)
            </div>
          </div>
        </div>
      </div>

      {/* Stepper Tabs */}
      <div className="setupSteps">
        {[
          { num: 1, title: "1. Ward & Candidate", sub: "Ward, booths & details" },
          { num: 2, title: "2. Ward Voter Data", sub: "Upload Excel or CSV" },
          { num: 3, title: "3. Candidate Poster", sub: "Upload banner & preview" },
          { num: 4, title: "4. Generate Passwords", sub: `${totalBooths * 4} Passwords` }
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => {
              if (s.num === 4 && generatedCredentials.length === 0) {
                handleGenerateCredentials();
              }
              setStep(s.num);
            }}
            className={`setupStepBtn ${step === s.num ? "active" : step > s.num ? "completed" : ""}`}
          >
            <div className="stepIcon">{step > s.num ? <Check size={14} /> : s.num}</div>
            <div className="stepTexts">
              <b>{s.title}</b>
              <span>{s.sub}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="setupCardBody">
        {/* STEP 1: Ward & Candidate Details */}
        {step === 1 && (
          <div className="setupSection">
            <div className="sectionIntro">
              <h3>Ward & Election Profile</h3>
              <p>Configure the ward identification and candidate details for this campaign.</p>
            </div>

            <div className="formGrid">
              <div className="formField">
                <label>Ward Number / ID *</label>
                <input
                  type="text"
                  value={wardNumber}
                  onChange={(e) => setWardNumber(e.target.value)}
                  placeholder="e.g. Ward 12 or Ward 34"
                />
              </div>

              <div className="formField">
                <label>Ward / Locality Name *</label>
                <input
                  type="text"
                  value={wardName}
                  onChange={(e) => setWardName(e.target.value)}
                  placeholder="e.g. Shastri Nagar / Civil Lines"
                />
              </div>

              <div className="formField full">
                <label>Election / Municipality Name *</label>
                <input
                  type="text"
                  value={electionName}
                  onChange={(e) => setElectionName(e.target.value)}
                  placeholder="e.g. Bhilwara Municipal Corporation 2026"
                />
              </div>

              <div className="formField">
                <label>Candidate Name *</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Ramesh Sharma"
                />
              </div>

              <div className="formField">
                <label>Candidate Mobile Number</label>
                <input
                  type="text"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  placeholder="e.g. 98290 12345"
                />
              </div>

              <div className="formField">
                <label>Party / Campaign Tagline</label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="e.g. Independent / Vikas Morcha"
                />
              </div>

              <div className="formField">
                <label>Election Symbol / Slogan</label>
                <input
                  type="text"
                  value={symbolName}
                  onChange={(e) => setSymbolName(e.target.value)}
                  placeholder="e.g. Rising Sun / Kite"
                />
              </div>
            </div>

            {/* Booth Count & Password Formula Box */}
            <div className="boothFormulaCard">
              <div className="boothFormulaHead">
                <div>
                  <h4>Select Total Booths in this Ward</h4>
                  <p>Passwords are automatically calculated: <b>1 Booth = 4 Passwords</b> (1 Candidate + 3 Karyakarta).</p>
                </div>
                <div className="boothPill">
                  Formula: <b>{totalBooths} × 4 = {totalBooths * 4} Passwords</b>
                </div>
              </div>

              <div className="boothQuickSelector">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleBoothChange(num)}
                    className={`boothBtn ${totalBooths === num ? "active" : ""}`}
                  >
                    <span>Booth {num}</span>
                    <b>{num * 4} Passes</b>
                  </button>
                ))}
              </div>

              <div className="boothExplanation">
                <ShieldCheck size={18} className="shieldIcon" />
                <div>
                  <b>Password Distribution for {totalBooths} Booth{totalBooths > 1 ? "s" : ""}:</b>
                  <div className="distList">
                    {Array.from({ length: totalBooths }, (_, idx) => (
                      <span key={idx} className="distBadge">
                        Booth {idx + 1}: <b>1 Candidate</b> + <b>3 Karyakarta</b> (4 Passwords)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="setupFooter">
              <button className="outline" onClick={onCancel}>
                Cancel
              </button>
              <button
                className="primary"
                onClick={() => {
                  if (!isDataLoaded && voters.length === 0) {
                    loadSampleVoterData();
                  }
                  setStep(2);
                }}
              >
                Next: Upload Ward Data <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Ward Voter Data Upload */}
        {step === 2 && (
          <div className="setupSection">
            <div className="sectionIntro">
              <h3>Upload Ward Voter Data</h3>
              <p>Upload the Excel (.xlsx) or CSV voter list for {wardNumber} ({wardName}).</p>
            </div>

            <div className="uploadCard">
              <div className="dropZone">
                <div className="dropIcon">
                  <FileSpreadsheet size={32} />
                </div>
                <h4>Select Ward Voter List File</h4>
                <p>Drag and drop Excel (.xlsx, .xls) or CSV voter file here, or browse from computer.</p>

                <div className="dropActions">
                  <label className="primary fileLabel">
                    <Upload size={16} />
                    <span>Choose Excel / CSV File</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                  <button type="button" className="outline" onClick={loadSampleVoterData}>
                    <Sparkles size={16} />
                    Load Sample Ward Data ({totalBooths * 8} Voters)
                  </button>
                </div>

                <span className="dropHint">Supports columns: Elector Name, EPIC No., Relation Name, Age, Gender, House No., Booth No.</span>
              </div>

              {/* Uploaded File Status */}
              {isDataLoaded && (
                <div className="uploadedSuccess">
                  <div className="fileMeta">
                    <CheckCircle2 size={20} className="checkIcon" />
                    <div>
                      <b>{voterFile?.name || `${wardNumber}_Voter_Database.xlsx`}</b>
                      <span>{voterFile?.size || "48 KB"} • {voters.length} Voters Parsed across {totalBooths} Booths</span>
                    </div>
                  </div>
                  <span className="badgeSuccess">Ready for App</span>
                </div>
              )}
            </div>

            {/* Data Preview Table */}
            {voters.length > 0 && (
              <div className="previewBox">
                <div className="previewHead">
                  <div>
                    <h4>Data Preview ({voters.length} Voters Extracted)</h4>
                    <p>Verified data mapped to designated booths in {wardNumber}.</p>
                  </div>
                  <span className="boothTag">{totalBooths} Booths Active</span>
                </div>

                <div className="previewTableWrap">
                  <table className="previewTable">
                    <thead>
                      <tr>
                        <th>Voter Name</th>
                        <th>EPIC / ID</th>
                        <th>Guardian</th>
                        <th>Age / Gender</th>
                        <th>House No.</th>
                        <th>Assigned Booth</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voters.slice(0, 6).map((v) => (
                        <tr key={v.id}>
                          <td><b>{v.name}</b></td>
                          <td><code>{v.epic}</code></td>
                          <td>{v.guardian}</td>
                          <td>{v.age} / {v.gender}</td>
                          <td>{v.house}</td>
                          <td><span className="boothPillSmall">Booth {v.booth}</span></td>
                          <td><span className={`statusPill ${v.status.toLowerCase()}`}>{v.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {voters.length > 6 && (
                  <p className="previewFooterText">+ {voters.length - 6} more voter records loaded into database.</p>
                )}
              </div>
            )}

            <div className="setupFooter">
              <button className="outline" onClick={() => setStep(1)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="primary" onClick={() => setStep(3)}>
                Next: Upload Candidate Poster <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Candidate Poster Upload */}
        {step === 3 && (
          <div className="setupSection">
            <div className="sectionIntro">
              <h3>Candidate Campaign Poster</h3>
              <p>Upload the official candidate poster or banner that will appear inside the Candidate and Karyakarta apps.</p>
            </div>

            <div className="posterLayout">
              {/* Left: Upload controls & presets */}
              <div className="posterControls">
                <div className="controlCard">
                  <h4>Upload Custom Poster</h4>
                  <p>Upload official high-resolution image banner (PNG, JPG, WebP).</p>

                  <label className="posterUploadBox">
                    <ImageIcon size={28} />
                    <span>{customPosterName || "Click to upload poster image"}</span>
                    <small>Recommended size: 800 × 1040 px</small>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePosterUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                <div className="controlCard">
                  <h4>Or Select Ready Campaign Poster Theme</h4>
                  <p>Choose an election poster preset pre-configured for {wardNumber}.</p>

                  <div className="presetGrid">
                    {PRESET_POSTERS.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setPosterUrl(p.url);
                          setCustomPosterName("");
                        }}
                        className={`presetCard ${posterUrl === p.url ? "selected" : ""}`}
                      >
                        <div className="presetThumb">
                          <img src={p.url} alt={p.title} />
                        </div>
                        <div className="presetInfo">
                          <b>{p.title}</b>
                          <small>{p.tagline}</small>
                        </div>
                        {posterUrl === p.url && <div className="presetCheck"><Check size={12} /></div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Live Mockup Preview */}
              <div className="posterLivePreview">
                <div className="mockupHeader">
                  <Smartphone size={16} />
                  <span>Live App Banner Preview</span>
                </div>
                <div className="posterFrame">
                  <img src={posterUrl} alt="Candidate Poster Preview" className="posterImage" />
                  <div className="posterOverlay">
                    <div className="overlayBadge">
                      <Vote size={14} />
                      <span>{wardNumber} • {wardName}</span>
                    </div>
                    <div className="overlayCandidate">{candidateName}</div>
                    <div className="overlayParty">{partyName} • {symbolName}</div>
                  </div>
                </div>
                <div className="mockupNote">
                  <Sparkles size={14} />
                  <span>Yeh poster Candidate Admin aur Karyakarta mobile screen par live display hoga.</span>
                </div>
              </div>
            </div>

            <div className="setupFooter">
              <button className="outline" onClick={() => setStep(2)}>
                <ArrowLeft size={16} /> Back
              </button>
              <button
                className="primary"
                onClick={() => {
                  if (generatedCredentials.length === 0) {
                    handleGenerateCredentials();
                  }
                  setStep(4);
                }}
              >
                Next: Generate Passwords ({totalBooths * 4}) <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Password Generation Engine */}
        {step === 4 && (
          <div className="setupSection">
            <div className="sectionIntro">
              <div className="passwordHeaderRow">
                <div>
                  <h3>Generated Candidate & Karyakarta Passwords</h3>
                  <p>
                    Formula Applied: <b>{totalBooths} Booth{totalBooths > 1 ? "s" : ""} = {totalBooths * 4} Passwords</b> (Har booth par 1 Candidate + 3 Karyakarta).
                  </p>
                </div>
                <div className="credToolbar">
                  <button
                    type="button"
                    className="outline"
                    onClick={() => setShowPasswords(!showPasswords)}
                  >
                    {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
                    <span>{showPasswords ? "Hide" : "Show"} Passwords</span>
                  </button>
                  <button
                    type="button"
                    className="outline"
                    onClick={handleGenerateCredentials}
                  >
                    <RefreshCw size={15} />
                    <span>Regenerate All</span>
                  </button>
                  <button
                    type="button"
                    className="outline"
                    onClick={handleDownloadCSV}
                  >
                    <Download size={15} />
                    <span>CSV Export</span>
                  </button>
                  <button
                    type="button"
                    className="whatsAppBtn"
                    onClick={handleCopyWhatsApp}
                  >
                    {copiedWhatsApp ? <Check size={16} /> : <Share2 size={16} />}
                    <span>{copiedWhatsApp ? "Copied for WhatsApp!" : "Share on WhatsApp"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Booth-Wise Grouped Password Cards */}
            <div className="boothsCredContainer">
              {Array.from({ length: totalBooths }, (_, idx) => {
                const bNum = idx + 1;
                const boothCreds = (generatedCredentials.length > 0
                  ? generatedCredentials
                  : generateBoothCredentials(wardId, wardNumber, totalBooths)
                ).filter((c) => c.boothNumber === bNum);

                const candCred = boothCreds.find((c) => c.role === "candidate");
                const karyCreds = boothCreds.filter((c) => c.role === "karyakarta");

                return (
                  <div key={bNum} className="boothCredGroup">
                    <div className="boothGroupHeader">
                      <div className="boothGroupTitle">
                        <span className="boothNumberBadge">BOOTH {bNum}</span>
                        <h4>Polling Station {bNum} — 4 Passwords Allocated</h4>
                      </div>
                      <div className="boothGroupSummary">
                        <span className="candCount">1 Candidate</span>
                        <span className="karyCount">3 Karyakarta</span>
                      </div>
                    </div>

                    <div className="credCardsGrid">
                      {/* 1 Candidate Card */}
                      {candCred && (
                        <div className="credCard candidateCard">
                          <div className="credCardTop">
                            <div className="roleTag candTag">
                              <ShieldCheck size={14} />
                              <span>Candidate Password</span>
                            </div>
                            <span className="boothTagSmall">Booth {bNum}</span>
                          </div>

                          <div className="credField">
                            <label>Login ID / Username</label>
                            <div className="credCopyRow">
                              <code>{candCred.username}</code>
                              <button
                                type="button"
                                onClick={() => handleCopy(candCred.username, `user-${candCred.id}`)}
                                title="Copy Username"
                              >
                                {copiedId === `user-${candCred.id}` ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>

                          <div className="credField">
                            <label>Access Password</label>
                            <div className="credCopyRow highlight">
                              <b>{showPasswords ? candCred.password : "••••••••"}</b>
                              <button
                                type="button"
                                onClick={() => handleCopy(candCred.password, `pass-${candCred.id}`)}
                                title="Copy Password"
                              >
                                {copiedId === `pass-${candCred.id}` ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>

                          <div className="credPerms">
                            <span>Access: Full Ward & Booth {bNum} Admin, Stats, Voter list</span>
                          </div>
                        </div>
                      )}

                      {/* 3 Karyakarta Cards */}
                      {karyCreds.map((k) => (
                        <div key={k.id} className="credCard karyakartaCard">
                          <div className="credCardTop">
                            <div className="roleTag karyTag">
                              <Users size={14} />
                              <span>Karyakarta {k.workerIndex} Password</span>
                            </div>
                            <span className="boothTagSmall">Booth {bNum}</span>
                          </div>

                          <div className="credField">
                            <label>Login ID</label>
                            <div className="credCopyRow">
                              <code>{k.username}</code>
                              <button
                                type="button"
                                onClick={() => handleCopy(k.username, `user-${k.id}`)}
                                title="Copy Username"
                              >
                                {copiedId === `user-${k.id}` ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>

                          <div className="credField">
                            <label>Field Password</label>
                            <div className="credCopyRow">
                              <b>{showPasswords ? k.password : "••••••••"}</b>
                              <button
                                type="button"
                                onClick={() => handleCopy(k.password, `pass-${k.id}`)}
                                title="Copy Password"
                              >
                                {copiedId === `pass-${k.id}` ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>

                          <div className="credPerms">
                            <span>Access: Mobile Field App, Booth {bNum} Search, Voter Slip</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Activation Summary Box */}
            <div className="activationBox">
              <div className="activationInfo">
                <CheckCircle2 size={24} className="greenCheck" />
                <div>
                  <h4>Ready to Activate {wardNumber} ({wardName})</h4>
                  <p>
                    {totalBooths} booths configured with {voters.length || totalBooths * 8} voters, candidate poster, and {totalBooths * 4} secure credentials.
                  </p>
                </div>
              </div>
              <div className="activationButtons">
                <button className="outline" onClick={() => setStep(3)}>
                  <ArrowLeft size={16} /> Back to Poster
                </button>
                <button className="primary bigPulse" onClick={handleSaveAndActivate}>
                  <Sparkles size={18} /> Save &amp; Activate Ward App
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
