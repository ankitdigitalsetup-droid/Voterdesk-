import { BoothAccessPassword } from "./types";

const SPECIAL_CHARS = ["@", "#", "$", "%", "&", "*", "!", "?"];

/**
 * Generates a password consisting of exactly 9 numeric digits + 1 random special character.
 * Example: "363705912@" or "404158673#"
 */
export function generateBoothPassword(): string {
  const digits = Math.floor(100000000 + Math.random() * 900000000).toString();
  const special = SPECIAL_CHARS[Math.floor(Math.random() * SPECIAL_CHARS.length)];
  return `${digits}${special}`;
}

/**
 * STRICT PASSWORD RULES:
 * 1. 10 wards or fewer:
 *    - Each ward gets 1 ADMIN + 3 MEMBERS (4 passwords per ward, e.g. 10 wards = 40 passwords, 7 wards = 28 passwords).
 * 2. More than 10 wards (e.g. 15 wards, 16 wards, 20 wards):
 *    - Maximum limit is STRICTLY 40 PASSWORDS TOTAL.
 *    - ALL ADMIN PASSWORDS TOGETHER FIRST (1 Admin for each ward: Ward 1 to Ward N).
 *    - Followed by ALL REMAINING MEMBER PASSWORDS (40 - N) distributed across wards.
 * 3. Every password consists of exactly 9 digits + 1 special character and is 100% globally unique.
 */
export function generateCandidateBoothPasswords(
  boothCount: number,
  candidateId = "cand_1",
  existingPasswords?: Set<string>
): BoothAccessPassword[] {
  const count = Math.max(1, Number(boothCount) || 1);
  const list: BoothAccessPassword[] = [];
  const usedPasswords = new Set<string>(existingPasswords || []);

  const adminCount = Math.min(count, 40);
  const totalLimit = count <= 10 ? count * 4 : 40;
  const memberCount = Math.max(0, totalLimit - adminCount);

  let serial = 1;

  // 1. ALL ADMIN PASSWORDS TOGETHER FIRST (Ward 1 to Ward adminCount)
  for (let b = 1; b <= adminCount; b++) {
    const boothStr = String(b);
    let adminPass = generateBoothPassword();
    while (usedPasswords.has(adminPass)) {
      adminPass = generateBoothPassword();
    }
    usedPasswords.add(adminPass);

    list.push({
      id: `pwd_b${b}_admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      serialNumber: serial++,
      password: adminPass,
      role: "CANDIDATE_ADMIN",
      roleTitle: "ADMIN",
      boothNumber: boothStr,
      candidateId,
    });
  }

  // 2. ALL REMAINING MEMBER PASSWORDS TOGETHER (Remaining up to 40)
  for (let m = 0; m < memberCount; m++) {
    const boothNum = (m % count) + 1;
    const boothStr = String(boothNum);
    const memberIndex = Math.floor(m / count) + 1;

    let memberPass = generateBoothPassword();
    while (usedPasswords.has(memberPass)) {
      memberPass = generateBoothPassword();
    }
    usedPasswords.add(memberPass);

    list.push({
      id: `pwd_b${boothStr}_member_${memberIndex}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      serialNumber: serial++,
      password: memberPass,
      role: "KARYAKARTA",
      roleTitle: "MEMBER",
      boothNumber: boothStr,
      candidateId,
    });
  }

  return list;
}
