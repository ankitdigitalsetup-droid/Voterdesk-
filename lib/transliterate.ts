/**
 * VoterDesk Bilingual Hindi-English Transliteration & Phonetic Search Matcher
 * Enables searching Hindi voter names, fathers/husbands, addresses using English (Romanized) queries.
 * Example: Searching "rakesh" matches "राकेश", "mangal" matches "मंगल", "zarina" matches "ज़रीना".
 */

import { VoterRecord } from "./types";

const consonants: Record<string, string> = {
  क: "k",
  ख: "kh",
  ग: "g",
  घ: "gh",
  ङ: "ng",
  च: "ch",
  छ: "chh",
  ज: "j",
  झ: "jh",
  ञ: "ny",
  ट: "t",
  ठ: "th",
  ड: "d",
  ढ: "dh",
  ण: "n",
  त: "t",
  थ: "th",
  द: "d",
  ध: "dh",
  न: "n",
  प: "p",
  फ: "ph",
  ब: "b",
  भ: "bh",
  म: "m",
  य: "y",
  र: "r",
  ल: "l",
  व: "v",
  श: "sh",
  ष: "sh",
  स: "s",
  ह: "h",
  क्ष: "ksh",
  त्र: "tr",
  ज्ञ: "gy",
  क़: "q",
  ख़: "kh",
  ग़: "gh",
  ज़: "z",
  ड़: "r",
  ढ़: "rh",
  फ़: "f",
};

const vowels: Record<string, string> = {
  अ: "a",
  आ: "aa",
  इ: "i",
  ई: "ee",
  उ: "u",
  ऊ: "oo",
  ऋ: "ri",
  ए: "e",
  ऐ: "ai",
  ओ: "o",
  औ: "au",
};

const matras: Record<string, string> = {
  "ा": "a",
  "ि": "i",
  "ी": "ee",
  "ु": "u",
  "ू": "oo",
  "ृ": "ri",
  "े": "e",
  "ै": "ai",
  "ो": "o",
  "ौ": "au",
  "ॉ": "o",
  "ॅ": "e",
};

/**
 * Transliterates Devanagari Hindi text to Roman English phonetics.
 * Handles inherent vowels (schwa), matras, halants, anusvara, and nuktas.
 */
export function devanagariToRoman(text: string): string {
  if (!text) return "";

  const str = text;
  let result = "";
  const len = str.length;

  for (let i = 0; i < len; i++) {
    let ch = str[i];
    let next = i + 1 < len ? str[i + 1] : "";

    // Check if current consonant has a following nukta (\u093C)
    if (next === "\u093C") {
      if (ch === "ज") ch = "ज़";
      else if (ch === "फ") ch = "फ़";
      else if (ch === "क") ch = "क़";
      else if (ch === "ख") ch = "ख़";
      else if (ch === "ग") ch = "ग़";
      else if (ch === "ड") ch = "ड़";
      else if (ch === "ढ") ch = "ढ़";
      i++; // skip the nukta char
      next = i + 1 < len ? str[i + 1] : "";
    }

    if (vowels[ch]) {
      result += vowels[ch];
    } else if (consonants[ch]) {
      result += consonants[ch];
      if (next === "\u094D") {
        // Halant (virama): suppress inherent vowel
        i++;
      } else if (matras[next]) {
        result += matras[next];
        i++;
      } else if (next === "\u0902" || next === "\u0901") {
        // Anusvara / Chandrabindu (e.g. मंगल -> mangal)
        result += "an";
        i++;
      } else if (
        next === " " ||
        next === "" ||
        next === "\n" ||
        next === "\t" ||
        next === "-" ||
        next === "/"
      ) {
        // End of word: silent 'a' in Hindi
      } else {
        result += "a";
      }
    } else if (matras[ch]) {
      result += matras[ch];
    } else if (ch === "\u0902" || ch === "\u0901") {
      result += "n";
    } else if (ch === "\u0903") {
      result += "h";
    } else {
      result += ch;
    }
  }

  return result.toLowerCase();
}

/**
 * Normalizes phonetic string to absorb common English/Hinglish spelling variations.
 * Examples: ee/i, oo/u, w/v, z/j, sh/s, q/k, kh/k, double letters.
 */
export function cleanPhonetic(s: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/[\s\-_,.]+/g, "")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/ou/g, "u")
    .replace(/aa/g, "a")
    .replace(/w/g, "v")
    .replace(/z/g, "j")
    .replace(/sh/g, "s")
    .replace(/ph/g, "f")
    .replace(/bh/g, "b")
    .replace(/dh/g, "d")
    .replace(/th/g, "t")
    .replace(/jh/g, "j")
    .replace(/kh/g, "k")
    .replace(/gh/g, "g")
    .replace(/q/g, "k")
    // Keep 'ch' distinct so 'chand' does not become 'kand'
    .replace(/a(?=[bcdfghjklmnpqrstvwxyz])/g, "") // flexible short vowels e.g. kamla / kamala
    .replace(/(.)\1+/g, "$1"); // collapse double letters
}

export function normalizeAlphaNum(s: string | number | undefined | null): string {
  return String(s || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function isAlphaWord(str: string): boolean {
  return /^[\p{L}\s]+$/u.test(str);
}

/**
 * Checks if a single record field matches a query token using direct,
 * alphanumeric, Devanagari transliteration, and phonetic matching.
 */
export function singleFieldMatches(fieldValue: string | number | undefined | null, queryToken: string): boolean {
  if (!fieldValue || !queryToken) return false;
  const f = String(fieldValue).trim();
  const q = queryToken.trim().toLowerCase();
  if (!q) return true;

  const fLower = f.toLowerCase();

  // 1. Direct substring
  if (fLower.includes(q)) return true;

  // 2. Alphanumeric match (for EPICs with spaces/slashes e.g. RJX 1001001 vs RJX1001001)
  const fAlpha = normalizeAlphaNum(f);
  const qAlpha = normalizeAlphaNum(q);
  if (qAlpha && fAlpha.includes(qAlpha)) return true;

  // If query token is purely letters/words, use bilingual transliteration and phonetic matching
  if (isAlphaWord(q)) {
    // 3. Devanagari to Roman transliteration
    const roman = devanagariToRoman(f);
    if (roman.includes(q)) return true;

    // Check individual words in name
    const romanWords = roman.split(/\s+/);
    for (const rw of romanWords) {
      if (rw.startsWith(q) || rw === q) return true;
    }

    // 4. Phonetic matching
    const pQ = cleanPhonetic(q);
    if (pQ && pQ.length >= 2) {
      const pRoman = cleanPhonetic(roman);
      if (pRoman.includes(pQ)) return true;

      for (const rw of romanWords) {
        const pRw = cleanPhonetic(rw);
        if (pRw.startsWith(pQ) || pRw === pQ) return true;
      }
    }
  }

  return false;
}

/**
 * Checks if targetText matches query using direct, transliterated, and phonetic comparisons.
 */
export function matchesSearch(targetText: string | undefined | null, query: string): boolean {
  return singleFieldMatches(targetText, query);
}

/**
 * Universal Multi-Field Search:
 * Matches query across Name, Surname, Father's / Husband's Name,
 * House No., Address/Colony, EPIC No. (Voter ID Card), Serial No., Booth, and Phone.
 * If query contains multiple words (e.g. "Rakesh Sharma", "Mangal Chand", "Rekha Jabbar", "Zuber 19"),
 * every word token must match at least one field of the voter record.
 */
export function matchesVoter(voter: VoterRecord, query: string): boolean {
  if (!query || !query.trim()) return true;
  const rawQuery = query.trim();

  // Split query into individual search tokens
  const tokens = rawQuery.split(/\s+/).filter(Boolean);

  // Every token must match at least ONE field of the voter record
  return tokens.every((token) => {
    const isShortPureDigits = /^\d{1,3}$/.test(token);

    // 1. Name & Surname (Hindi or Roman English)
    if (singleFieldMatches(voter.name, token)) return true;

    // 2. Father's / Husband's Name (Guardian)
    if (voter.guardian && singleFieldMatches(voter.guardian, token)) return true;

    // 3. Address / House No. / Colony / Mohalla / Booth Address
    if (voter.house && singleFieldMatches(voter.house, token)) return true;
    if (voter.address && singleFieldMatches(voter.address, token)) return true;
    if (voter.boothAddress && singleFieldMatches(voter.boothAddress, token)) return true;

    // 4. EPIC No. (Voter ID card - require >= 4 digits if purely numeric, or alphanumeric like RJX)
    if (!isShortPureDigits && voter.epic && singleFieldMatches(voter.epic, token)) return true;

    // 5. Serial No.
    if (voter.serialNo !== undefined) {
      const sStr = String(voter.serialNo);
      if (sStr === token || (!isShortPureDigits && sStr.includes(token))) return true;
    }

    // 6. Booth / Part No.
    if (voter.booth) {
      if (voter.booth.toLowerCase() === token.toLowerCase()) return true;
      if (!isShortPureDigits && voter.booth.toLowerCase().includes(token.toLowerCase())) return true;
    }

    // 7. Phone
    if (!isShortPureDigits && voter.phone && voter.phone.includes(token)) return true;

    return false;
  });
}
