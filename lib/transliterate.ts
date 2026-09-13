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
    .replace(/kh/g, "k")
    .replace(/gh/g, "g")
    .replace(/ch/g, "c")
    .replace(/c/g, "k")
    .replace(/q/g, "k")
    .replace(/ph/g, "f")
    .replace(/bh/g, "b")
    .replace(/dh/g, "d")
    .replace(/th/g, "t")
    .replace(/jh/g, "j")
    .replace(/a(?=[bcdfghjklmnpqrstvwxyz])/g, "") // flexible short vowels e.g. kamla / kamala
    .replace(/(.)\1+/g, "$1"); // collapse double letters: tt->t, mm->m, ll->l, bb->b, jj->j
}

/**
 * Checks if targetText matches query using direct, transliterated, and phonetic comparisons.
 */
export function matchesSearch(targetText: string | undefined | null, query: string): boolean {
  if (!targetText || !query) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const t = targetText.toLowerCase();

  // 1. Direct substring match (e.g. Hindi query matches Hindi, or English matches English)
  if (t.includes(q)) return true;

  // 2. Devanagari to Roman transliteration match
  const roman = devanagariToRoman(t);
  if (roman.includes(q)) return true;

  // 3. Normalized phonetic match
  const pQuery = cleanPhonetic(q);
  if (pQuery) {
    const pRoman = cleanPhonetic(roman);
    if (pRoman.includes(pQuery)) return true;

    // Word prefix matching
    const romanWords = roman.split(/\s+/);
    for (const rw of romanWords) {
      if (rw.startsWith(q) || cleanPhonetic(rw).startsWith(pQuery)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Searches a VoterRecord across Name, Guardian, EPIC, Booth, SerialNo, House, and Phone.
 */
export function matchesVoter(voter: VoterRecord, query: string): boolean {
  if (!query || !query.trim()) return true;
  const q = query.trim().toLowerCase();

  // Direct numeric or code matches
  if (voter.epic && voter.epic.toLowerCase().includes(q)) return true;
  if (voter.booth && voter.booth.toLowerCase().includes(q)) return true;
  if (voter.house && voter.house.toLowerCase().includes(q)) return true;
  if (voter.phone && voter.phone.includes(q)) return true;
  if (voter.serialNo !== undefined && String(voter.serialNo).toLowerCase().includes(q)) return true;

  // Bilingual phonetic match for Name
  if (matchesSearch(voter.name, q)) return true;

  // Bilingual phonetic match for Father / Husband Name (Guardian)
  if (voter.guardian && matchesSearch(voter.guardian, q)) return true;

  return false;
}
