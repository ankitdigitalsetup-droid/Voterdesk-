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
 * Formula:
 * 1 Booth  = 4 Passwords (1 ADMIN + 3 MEMBER)
 * 2 Booths = 8 Passwords (2 ADMIN + 6 MEMBER)
 * N Booths = N * 4 Passwords (N ADMIN + 3N MEMBER)
 *
 * No pre-generated names or numbers. The password itself determines
 * whether the login is ADMIN or MEMBER, and which booth they manage.
 */
export function generateCandidateBoothPasswords(
  boothCount: number,
  candidateId = "cand_1"
): BoothAccessPassword[] {
  const count = Math.max(1, Number(boothCount) || 1);
  const list: BoothAccessPassword[] = [];
  const usedPasswords = new Set<string>();
  let serial = 1;

  for (let b = 1; b <= count; b++) {
    const boothStr = String(b);

    // 1 ADMIN Password for Booth b
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

    // 3 MEMBER Passwords for Booth b
    for (let m = 1; m <= 3; m++) {
      let memberPass = generateBoothPassword();
      while (usedPasswords.has(memberPass)) {
        memberPass = generateBoothPassword();
      }
      usedPasswords.add(memberPass);

      list.push({
        id: `pwd_b${b}_member_${m}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        serialNumber: serial++,
        password: memberPass,
        role: "KARYAKARTA",
        roleTitle: "MEMBER",
        boothNumber: boothStr,
        candidateId,
      });
    }
  }

  return list;
}
