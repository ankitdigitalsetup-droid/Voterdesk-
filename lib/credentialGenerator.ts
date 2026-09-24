import { BoothCredential } from "@/types";

// Random password generator with memorable but secure format (e.g., VD#8341, VD@9215)
function generateRandomPassword(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const specials = ["#", "@", "!", "$"];
  const special = specials[Math.floor(Math.random() * specials.length)];
  let numPart = "";
  for (let i = 0; i < 4; i++) {
    numPart += Math.floor(Math.random() * 10).toString();
  }
  return `VD${special}${numPart}`;
}

/**
 * Generates credentials according to user specification:
 * - 1 Booth = 4 passwords: 1 Candidate password + 3 Karyakarta passwords
 * - 2 Booths = 8 passwords: Booth 1 (1 Cand + 3 Karyakarta), Booth 2 (1 Cand + 3 Karyakarta)
 * - 3 Booths = 12 passwords: Each booth has 1 Candidate + 3 Karyakarta
 * Total = Booths * 4
 */
export function generateBoothCredentials(
  wardId: string,
  wardNumber: string,
  totalBooths: number,
  existingCredentials?: BoothCredential[]
): BoothCredential[] {
  const credentials: BoothCredential[] = [];
  const cleanWard = wardNumber.replace(/[^0-9a-zA-Z]/g, "").toUpperCase() || "W1";

  for (let booth = 1; booth <= totalBooths; booth++) {
    // 1. Candidate Password for this booth
    const candUsername = `${cleanWard}-B${booth}-CAND`;
    const existingCand = existingCredentials?.find(
      (c) => c.wardId === wardId && c.boothNumber === booth && c.role === "candidate"
    );

    credentials.push({
      id: `${wardId}-b${booth}-cand`,
      wardId,
      boothNumber: booth,
      role: "candidate",
      label: `Candidate Access — Booth ${booth}`,
      username: candUsername,
      password: existingCand ? existingCand.password : generateRandomPassword(),
      active: true,
    });

    // 2. 3 Karyakarta Passwords for this booth
    for (let k = 1; k <= 3; k++) {
      const karyUsername = `${cleanWard}-B${booth}-K${k}`;
      const existingKary = existingCredentials?.find(
        (c) => c.wardId === wardId && c.boothNumber === booth && c.role === "karyakarta" && c.workerIndex === k
      );

      credentials.push({
        id: `${wardId}-b${booth}-k${k}`,
        wardId,
        boothNumber: booth,
        role: "karyakarta",
        workerIndex: k,
        label: `Karyakarta ${k} — Booth ${booth}`,
        username: karyUsername,
        password: existingKary ? existingKary.password : generateRandomPassword(),
        active: true,
      });
    }
  }

  return credentials;
}

/**
 * Format credentials for instant WhatsApp sharing
 */
export function formatCredentialsForWhatsApp(
  wardName: string,
  candidateName: string,
  credentials: BoothCredential[],
  appUrl: string = "https://voterdesk.in"
): string {
  const boothGroups: { [key: number]: BoothCredential[] } = {};
  credentials.forEach((cred) => {
    if (!boothGroups[cred.boothNumber]) {
      boothGroups[cred.boothNumber] = [];
    }
    boothGroups[cred.boothNumber].push(cred);
  });

  let message = `🗳️ *VOTERDESK — LOGIN CREDENTIALS*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `📍 *Ward:* ${wardName}\n`;
  message += `👤 *Candidate:* ${candidateName}\n`;
  message += `🌐 *App Link:* ${appUrl}\n\n`;

  Object.keys(boothGroups)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((boothKey) => {
      const boothNum = Number(boothKey);
      const list = boothGroups[boothNum];
      const cand = list.find((c) => c.role === "candidate");
      const karyakartas = list.filter((c) => c.role === "karyakarta");

      message += `📌 *BOOTH ${boothNum} PASSWORDS:*\n`;
      if (cand) {
        message += `👑 *Candidate:* User: \`${cand.username}\` | Pass: \`${cand.password}\`\n`;
      }
      karyakartas.forEach((k) => {
        message += `🚩 *Karyakarta ${k.workerIndex}:* User: \`${k.username}\` | Pass: \`${k.password}\`\n`;
      });
      message += `\n`;
    });

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `⚠️ _Yeh passwords confidential hain. Apne designated booth par hi login karein._`;

  return message;
}

/**
 * Export credentials as CSV
 */
export function exportCredentialsCSV(
  wardName: string,
  credentials: BoothCredential[]
): string {
  const headers = ["Ward", "Booth Number", "Role", "Worker Index", "Login ID", "Password", "Status"];
  const rows = credentials.map((c) => [
    `"${wardName}"`,
    c.boothNumber,
    c.role === "candidate" ? "Candidate" : "Karyakarta",
    c.workerIndex || "-",
    c.username,
    c.password,
    c.active ? "Active" : "Inactive",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
