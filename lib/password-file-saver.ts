import fs from "fs";
import path from "path";
import { CandidateAccount, BoothAccessPassword } from "./types";

/**
 * Automatically saves candidate passwords into a local text file in `candidate_passwords_txt/` folder.
 * Includes complete candidate details, admin passwords, member passwords, and login rules.
 */
export function saveCandidatePasswordsToFile(
  cand: {
    id: string;
    name: string;
    phone: string;
    party?: string;
    electionName?: string;
    wardConstituency?: string;
    nikay?: string;
    symbolName?: string;
    boothCount?: number;
    createdAt?: string;
    electionType?: string;
  },
  passwords: BoothAccessPassword[]
): string {
  try {
    const dir = path.join(process.cwd(), "candidate_passwords_txt");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const isPanchayat =
      cand.electionType === "PANCHAYAT" || cand.electionName?.includes("पंचायत");
    const wardLabel = isPanchayat ? "वार्ड" : "बूथ";
    const totalCount = passwords.length;
    const dateStr = cand.createdAt
      ? new Date(cand.createdAt).toLocaleDateString("hi-IN")
      : new Date().toLocaleDateString("hi-IN");

    const admins = passwords.filter((p) => p.role === "CANDIDATE_ADMIN");
    const members = passwords.filter((p) => p.role === "KARYAKARTA");

    let text = `================================================================================\n`;
    text += `🗳️ VOTERDESK - OFFICIAL CANDIDATE PASSWORDS CARD (पासवर्ड कार्ड)\n`;
    text += `================================================================================\n`;
    text += `प्रत्याशी नाम (Candidate Name):  ${cand.name}\n`;
    text += `पद / चुनाव (Election Name):      ${cand.electionName || (isPanchayat ? "पंचायत चुनाव 2026" : "निकाय चुनाव 2026")}\n`;
    text += `${isPanchayat ? "ग्राम पंचायत" : "वार्ड / क्षेत्र"}:           ${cand.wardConstituency || "—"}\n`;
    text += `${isPanchayat ? "पंचायत समिति" : "निकाय"}:              ${cand.nikay || "—"}\n`;
    text += `पार्टी (Party):                  ${cand.party || "निर्दलीय"}\n`;
    text += `चुनाव चिन्ह (Election Symbol):  ${cand.symbolName || "—"}\n`;
    text += `संपर्क मोबाइल (Phone):          ${cand.phone}\n`;
    text += `कुल ${wardLabel} संख्या (Total ${wardLabel}s):  ${cand.boothCount || admins.length}\n`;
    text += `कुल पासवर्ड (Total Passwords):   ${totalCount}\n`;
    text += `तारीख (Generated Date):         ${dateStr}\n`;
    text += `अभियान ID (Campaign ID):        ${cand.id}\n`;
    text += `================================================================================\n`;
    text += `🔑 ALL OFFICIAL LOGIN PASSWORDS (सभी लॉगिन पासवर्ड)\n`;
    text += `================================================================================\n\n`;

    if (admins.length > 0) {
      text += `[ADMIN PASSWORDS / एडमिन पासवर्ड (कुल: ${admins.length})]\n`;
      text += `--------------------------------------------------------------------------------\n`;
      admins.forEach((a, idx) => {
        const serial = a.serialNumber || idx + 1;
        text += `#${String(serial).padEnd(3)} [ADMIN]  : ${a.password} (${wardLabel} ${a.boothNumber})\n`;
      });
      text += `\n`;
    }

    if (members.length > 0) {
      text += `[MEMBER PASSWORDS / कार्यकर्ता सदस्य पासवर्ड (कुल: ${members.length})]\n`;
      text += `--------------------------------------------------------------------------------\n`;
      members.forEach((m, idx) => {
        const serial = m.serialNumber || (admins.length + idx + 1);
        text += `#${String(serial).padEnd(3)} [MEMBER] : ${m.password} (${wardLabel} ${m.boothNumber})\n`;
      });
      text += `\n`;
    }

    text += `================================================================================\n`;
    text += `📱 लॉगिन नियम (Login Instructions):\n`;
    text += `वेबसाइट URL: https://voterdesk.vercel.app\n`;
    text += `1. अपना नाम और 10-अंकों का मोबाइल नंबर दर्ज करें।\n`;
    text += `2. ऊपर दिए गए कार्ड से संबंधित ${wardLabel} का पासवर्ड दर्ज करें।\n`;
    text += `3. पासवर्ड ही तय करेगा कि लॉगिन ADMIN है या MEMBER, और कौन-सा ${wardLabel} असाइन है।\n`;
    text += `4. एक प्रत्याशी के पासवर्ड से केवल उसी प्रत्याशी का डेटा एक्सेस होगा।\n`;
    text += `================================================================================\n`;

    // Sanitize candidate name for filename
    const cleanName = cand.name.replace(/[/\\?%*:|"<>]/g, "").trim().replace(/\s+/g, "_");
    const cleanWard = (cand.wardConstituency || "").replace(/[/\\?%*:|"<>]/g, "").trim().replace(/\s+/g, "_");
    const fileName = `${cleanName}_${cleanWard || "Campaign"}_Passwords.txt`;
    const filePath = path.join(dir, fileName);

    fs.writeFileSync(filePath, text, "utf-8");
    console.log(`[PasswordFileSaver] Successfully saved passwords to: ${filePath}`);
    return filePath;
  } catch (err) {
    console.warn("[PasswordFileSaver] Notice while saving text file:", err);
    return "";
  }
}
