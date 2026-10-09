import React from "react";
import type { Metadata } from "next";
import { getVoterById } from "@/lib/db/voters";
import { getCandidateById } from "@/lib/db/candidates";
import { formatGenderDisplay } from "@/lib/excel-helper";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const { c: candidateId } = await searchParams;
  const voter = await getVoterById(id);
  const cand = voter?.candidateId
    ? await getCandidateById(voter.candidateId)
    : candidateId
    ? await getCandidateById(candidateId)
    : null;

  const voterName = voter?.name || "मतदाता";
  const candName = cand?.name || "प्रत्याशी";
  const epicNo = voter?.epic || "";
  const partNo = voter?.booth || "1";
  const serialNo = voter?.serialNo || "—";

  const title = `🇮🇳 मतदाता पर्ची (Voter Slip) - ${voterName}`;
  const description = `उम्मीदवार: ${candName} | वार्ड सं: ${partNo} | क्रम सं: ${serialNo} | पहचान पत्र: ${epicNo}`;
  const posterUrl = cand?.posterUrl || "https://voterdeskproject.vercel.app/images/campaign-poster.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: posterUrl,
          width: 800,
          height: 600,
          alt: `मतदाता पर्ची - ${voterName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [posterUrl],
    },
  };
}

export default async function VoterSlipPublicPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { c: candidateId } = await searchParams;
  const voter = await getVoterById(id);
  const cand = voter?.candidateId
    ? await getCandidateById(voter.candidateId)
    : candidateId
    ? await getCandidateById(candidateId)
    : null;

  if (!voter) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", background: "#f1f5f9", padding: "20px" }}>
        <div style={{ maxWidth: "480px", background: "#ffffff", padding: "30px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 14px rgba(0,0,0,0.08)" }}>
          <h2 style={{ color: "#0b224e", margin: "0 0 10px" }}>मतदाता पर्ची उपलब्ध नहीं है</h2>
          <p style={{ color: "#64748b", fontSize: "14px" }}>कृपया सही लिंक की जांच करें या अपने चुनाव कार्यकर्ता से संपर्क करें।</p>
        </div>
      </main>
    );
  }

  const candName = cand?.name || "प्रत्याशी";
  const candParty = cand?.party || "निर्दलीय";
  const slipMsg = cand?.slipMessage || `Vote for ${candName}`;
  const posterSrc = cand?.posterUrl || "/images/campaign-poster.jpg";

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "20px 12px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: "540px", margin: "0 auto", background: "#ffffff", borderRadius: "14px", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}>
        
        {/* Poster Top Banner */}
        <div style={{ background: "#0b224e", textAlign: "center", position: "relative" }}>
          <img
            src={posterSrc}
            alt={candName}
            style={{ width: "100%", maxHeight: "380px", objectFit: "cover", display: "block" }}
          />
        </div>

        {/* Message Strip */}
        <div style={{ background: "#0b224e", color: "#fef08a", padding: "10px 16px", textAlign: "center", fontWeight: 700, fontSize: "15px", letterSpacing: "0.5px" }}>
          🗳️ {slipMsg}
        </div>

        {/* Dotted Cut Separator */}
        <div style={{ borderTop: "2px dashed #94a3b8", margin: "0 16px", position: "relative" }}>
          <span style={{ position: "absolute", top: "-11px", left: "50%", transform: "translateX(-50%)", background: "#ffffff", padding: "0 8px", fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
            ✂️ मतदाता पर्ची (VOTER SLIP)
          </span>
        </div>

        {/* Voter Slip Dotted Box */}
        <div style={{ margin: "20px 16px 16px", border: "2px dashed #0062cc", borderRadius: "10px", padding: "14px", background: "#ffffff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", background: "#eff6ff", padding: "6px 12px", borderRadius: "6px", marginBottom: "12px", color: "#1e40af", fontWeight: 800, fontSize: "14px" }}>
            <span>क्रम सं : {voter.serialNo || "—"}</span>
            <span>वार्ड सं : {voter.booth || "1"}</span>
          </div>

          <div style={{ display: "grid", gap: "8px", fontSize: "14.5px", color: "#1e293b" }}>
            <div><b>नाम :</b> <span style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>{voter.name}</span></div>
            <div><b>पिता/पति :</b> {voter.guardian || "—"}</div>
            <div><b>वोटर ID :</b> <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#0369a1" }}>{voter.epic}</span></div>
            
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span><b>उम्र :</b> {voter.age ? `${voter.age} वर्ष` : "—"}</span>
              <span><b>लिंग :</b> {formatGenderDisplay(voter.gender, "hi")}</span>
              <span><b>मकान नं. :</b> {voter.house || "—"}</span>
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "4px" }}>
              <b style={{ color: "#64748b", fontSize: "12px" }}>बुथ पता :</b>
              <div style={{ fontSize: "13px", color: "#334155", fontWeight: 600, marginTop: "2px" }}>
                {voter.boothAddress || "184 - महात्मा गांधी राजकीय विद्यालय इंग्लिश मीडियम का कमरा नं. 2 चौरसियावास अजमेर"}
              </div>
            </div>
          </div>

          <div style={{ marginTop: "12px", background: "#f0fdf4", color: "#15803d", padding: "8px", borderRadius: "6px", textAlign: "center", fontSize: "13px", fontWeight: 800 }}>
            🗳️ कृपया अपना अमूल्य वोट देकर भारी मतों से विजयी बनाएं 🙏
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ padding: "0 16px 20px", display: "flex", gap: "10px" }}>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`*🇮🇳 मतदाता पर्ची - ${voter.name}*\nउम्मीदवार: ${candName} (${candParty})\n🗳️ *${slipMsg}*\nवार्ड सं: ${voter.booth} | क्रम सं: ${voter.serialNo || "—"}\nपहचान पत्र: ${voter.epic}\nउम्र: ${voter.age ? `${voter.age} वर्ष` : "—"} | लिंग: ${formatGenderDisplay(voter.gender, "hi")}\nबुथ पता: ${voter.boothAddress || ""}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              background: "#25d366",
              color: "#ffffff",
              textDecoration: "none",
              padding: "11px",
              borderRadius: "8px",
              textAlign: "center",
              fontWeight: 700,
              fontSize: "14px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: "0 3px 10px rgba(37, 211, 102, 0.35)",
            }}
          >
            💬 WhatsApp पर शेयर करें
          </a>
        </div>
      </div>
    </main>
  );
}
