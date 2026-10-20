/**
 * ============================================================================
 * 📊 VOTERDESK EXCEL & VOTER ROLL PARSER (lib/excel-helper.ts)
 * ============================================================================
 * Welcome Developer! Yeh file VoterDesk application ka intelligent Excel / CSV engine hai.
 * Election commission voter lists me Aksar top rows me title/metadata hote hain.
 * Yeh module automatic header detection, column auto-mapping (Hindi/English),
 * aur multi-sheet parsing handle karta hai.
 *
 * 📌 KEY FEATURES:
 * 1. `parseExcelFile`: Scans first 10 rows to detect the true header row.
 * 2. `detectFieldMapping`: Auto-maps Indian voter list columns (नाम, पिता, क्रम, भाग, EPIC, etc.).
 * 3. `downloadSampleExcelTemplate`: Generates standard Excel template for candidates.
 * ============================================================================
 */

import * as XLSX from "xlsx";

export interface ParsedSheetData {
  fileName: string;
  columns: string[];
  rows: Record<string, any>[];
  totalRows: number;
  sheetNames?: string[];
  selectedSheet?: string;
}

export function parseExcelFile(file: File, sheetName?: string): Promise<ParsedSheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetNames = workbook.SheetNames || [];
        if (sheetNames.length === 0) {
          throw new Error("फ़ाइल में कोई शीट नहीं मिली। (No sheets found in workbook)");
        }

        const targetSheetName = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0];
        const worksheet = workbook.Sheets[targetSheetName];
        if (!worksheet) {
          throw new Error(`शीट '${targetSheetName}' नहीं मिली।`);
        }

        // Read as 2D array of rows to intelligently detect the header row
        // Many Indian election Excel exports have title rows like "विधानसभा क्षेत्र 178..." at row 0/1
        const rawGrid = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });
        if (rawGrid.length === 0) {
          throw new Error(`शीट '${targetSheetName}' खाली है या पार्स नहीं हो सकी। (Sheet is empty)`);
        }

        const keywords = [
          "जि. प.", "जि.प.", "जिप", "पं. स.", "पं.स.", "पंस", "जिला परिषद", "पंचायत समिति", "zp", "ps", "संख्या", "sankhya",
          "नाम", "name", "क्रम", "sr", "serial", "booth", "भाग", "बूथ",
          "epic", "पहचान", "आयु", "age", "पिता", "पति", "father", "husband",
          "मकान", "house", "पता", "address", "मोबाइल", "phone", "mobile", "gender", "लिंग"
        ];

        let bestHeaderRowIndex = 0;
        let maxMatches = 0;

        // Scan first 10 rows to detect which row actually contains the table headers
        const maxScanRows = Math.min(rawGrid.length, 10);
        for (let r = 0; r < maxScanRows; r++) {
          const row = rawGrid[r];
          if (!Array.isArray(row)) continue;
          let matches = 0;
          for (const cell of row) {
            const str = String(cell || "").toLowerCase().trim();
            if (keywords.some((kw) => str.includes(kw))) {
              matches++;
            }
          }
          if (matches > maxMatches && matches >= 2) {
            maxMatches = matches;
            bestHeaderRowIndex = r;
          }
        }

        // Parse starting from the detected header row
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          range: bestHeaderRowIndex,
          defval: "",
        });

        if (jsonData.length === 0) {
          throw new Error(`शीट '${targetSheetName}' में कोई डेटा पंक्ति नहीं मिली। (No data rows found)`);
        }

        const columns = Object.keys(jsonData[0]);
        resolve({
          fileName: file.name,
          columns,
          rows: jsonData,
          totalRows: jsonData.length,
          sheetNames,
          selectedSheet: targetSheetName,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// Quick sheet names extractor
export function getExcelSheetNames(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", bookSheets: true });
        resolve(workbook.SheetNames || []);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// Auto-detect matching field based on common Hindi & English headers
export function detectFieldMapping(columns: string[], sampleRows?: Record<string, any>[]) {
  const mapping: Record<string, string> = {
    zilaParishad: "",
    panchayatSamiti: "",
    booth: "",
    serialNo: "",
    name: "",
    guardian: "",
    voted: "",
    isSupporter: "",
    isOutside: "",
    phone: "",
    house: "",
    address: "",
    boothAddress: "",
    epic: "",
    age: "",
    gender: "",
    voterStatus: "",
  };

  for (const col of columns) {
    const c = col.trim().toLowerCase();
    const clean = c.replace(/[\s\.\-_]/g, "");

    // 0a. जि. प. (जिला परिषद / Zila Parishad / ZP)
    if (!mapping.zilaParishad && (
      clean.includes("जिप") ||
      clean.includes("जिलापरिषद") ||
      clean.includes("zilaparishad") ||
      clean.includes("zpsankhya") ||
      clean.includes("zpno") ||
      clean === "zp" ||
      clean.startsWith("zp") ||
      c.includes("जि. प.") ||
      c.includes("जि.प.") ||
      c.includes("जि प") ||
      c.includes("जिला परिषद") ||
      c.includes("जिलापरिषद") ||
      c.includes("zila parishad") ||
      c === "जि.प" ||
      c === "जि. प" ||
      c === "जिप" ||
      c === "zp" ||
      c.startsWith("zp ") ||
      c.includes("z.p")
    )) {
      mapping.zilaParishad = col;
    }

    // 0b. पं. स. (पंचायत समिति / Panchayat Samiti / PS)
    if (!mapping.panchayatSamiti && (
      clean.includes("पंस") ||
      clean.includes("पंचायतसमिति") ||
      clean.includes("panchayatsamiti") ||
      clean.includes("panchayatsamity") ||
      clean.includes("pssankhya") ||
      clean.includes("psno") ||
      clean === "ps" ||
      clean.startsWith("ps") ||
      c.includes("पं. स.") ||
      c.includes("पं.स.") ||
      c.includes("पं स") ||
      c.includes("पंचायत समिति") ||
      c.includes("पंचायतसमिति") ||
      c.includes("panchayat samiti") ||
      c.includes("panchayat samity") ||
      c === "पं.स" ||
      c === "पं. स" ||
      c === "पंस" ||
      c === "ps" ||
      c.startsWith("ps ") ||
      c.includes("p.s")
    )) {
      mapping.panchayatSamiti = col;
    }

    // 1. भाग / बूथ (Part / Booth No)
    if (!mapping.booth && (c.includes("भाग") || c.includes("part") || c.includes("booth") || c.includes("बूथ") || c.includes("ward") || c.includes("वार्ड") || c.includes("room"))) {
      if (!c.includes("address") && !c.includes("पता") && !c.includes("name") && !c.includes("नाम")) {
        mapping.booth = col;
      }
    }

    // 2. क्रम संख्या (Serial No)
    if (!mapping.serialNo && (c.includes("क्रम") || c.includes("क्रमांक") || c.includes("serial") || c.includes("sr") || c.includes("sl") || c.includes("s.no") || c.includes("क्र सं") || c.includes("cr") || c === "no" || c === "sno" || c === "sr.no" || c === "sl.no")) {
      mapping.serialNo = col;
    }

    // 3. नाम (Name) - Must not conflict with guardian/father/mother/booth
    if (!mapping.name && (c.includes("नाम") || c.includes("name") || c.includes("elector") || c.includes("voter") || c.includes("मतदाता") || c.includes("नागरिक") || c.includes("व्यक्ति") || c.includes("member"))) {
      if (!c.includes("father") && !c.includes("relation") && !c.includes("guardian") && !c.includes("पति") && !c.includes("पिता") && !c.includes("माता") && !c.includes("mother") && !c.includes("husband") && !c.includes("rel") && !c.includes("booth") && !c.includes("बूथ") && !c.includes("केंद्र") && !c.includes("station") && !c.includes("ward") && !c.includes("वार्ड")) {
        mapping.name = col;
      }
    }

    // 4. पिता/पति/अभिभावक (Guardian / Father / Husband / Mother / Relative)
    if (!mapping.guardian && (c.includes("पिता") || c.includes("पति") || c.includes("माता") || c.includes("relation") || c.includes("father") || c.includes("husband") || c.includes("guardian") || c.includes("अभिभावक") || c.includes("संबंधी") || c.includes("रिश्तेदार") || c.includes("spouse") || c.includes("parent"))) {
      mapping.guardian = col;
    }

    // 5. वोट डाला (Voted / Cast Vote)
    if (!mapping.voted && (c.includes("वोट डाला") || c.includes("voted") || c.includes("मतदान") || c.includes("polled") || c.includes("cast") || c === "वोट")) {
      mapping.voted = col;
    }

    // 6. सपोर्टर / पक्ष (Is Supporter / In-Favor)
    if (!mapping.isSupporter && (c.includes("सपोर्टर") || c.includes("supporter") || c.includes("पक्ष") || c.includes("समर्थक") || c.includes("in-favor") || c.includes("infavor") || c.includes("पक्का") || c.includes("favor"))) {
      mapping.isSupporter = col;
    }

    // 7. बाहर है / प्रवासी (Is Outside / Out of Town / Pravasi)
    if (!mapping.isOutside && (c.includes("बाहर") || c.includes("outside") || c.includes("प्रवासी") || c.includes("pravasi") || c.includes("out of station") || c.includes("अन्यत्र") || c.includes("absent"))) {
      mapping.isOutside = col;
    }

    // 8. मोबाइल नो (Mobile No / Phone)
    if (!mapping.phone && (c.includes("मोबाइल") || c.includes("phone") || c.includes("mobile") || c.includes("contact") || c.includes("फोन") || c.includes("मो.") || c.includes("cell") || c.includes("दूरभाष") || c.includes("संपर्क"))) {
      mapping.phone = col;
    }

    // 9. हाउस No (House No)
    if (!mapping.house && (c.includes("हाउस") || c.includes("house") || c.includes("h.no") || c.includes("h no") || c.includes("मकान") || c.includes("गृह") || c.includes("door") || c.includes("flat") || c.includes("घर"))) {
      mapping.house = col;
    }

    // 10. एड्रेस (Address)
    if (!mapping.address && (c.includes("एड्रेस") || c.includes("address") || c.includes("पता") || c.includes("colony") || c.includes("कॉलोनी") || c.includes("mohalla") || c.includes("मोहल्ला") || c.includes("गली") || c.includes("street") || c.includes("locality") || c.includes("स्थान") || c.includes("निवास"))) {
      if (!c.includes("booth") && !c.includes("बूथ") && !c.includes("केंद्र") && !c.includes("station")) {
        mapping.address = col;
      }
    }

    // 11. Booth Address (बूथ का पता / Polling Station Address)
    if (!mapping.boothAddress && ((c.includes("booth") && (c.includes("address") || c.includes("name"))) || (c.includes("बूथ") && (c.includes("पता") || c.includes("नाम"))) || c.includes("polling station") || c.includes("मतदान केंद्र") || c.includes("केंद्र पता") || c.includes("केंद्र का नाम"))) {
      mapping.boothAddress = col;
    }

    // 12. Age (आयु / उम्र)
    if (!mapping.age && (c.includes("age") || c.includes("आयु") || c.includes("उम्र") || c.includes("वय") || c.includes("years") || c.includes("वर्ष"))) {
      mapping.age = col;
    }

    // 13. EPIC / Voter ID (पहचान पत्र क्रमांक / वोटर ID / वोटर आईडी / EPIC / Voter ID Card)
    if (!mapping.epic) {
      const isEpicMatch =
        clean.includes("वोटरid") ||
        clean.includes("वोटरआईडी") ||
        clean.includes("वोटरकार्ड") ||
        clean.includes("voterid") ||
        clean.includes("epicno") ||
        clean.includes("cardno") ||
        clean.includes("idno") ||
        clean.includes("पहचानपत्र") ||
        clean.includes("मतदातापहचान") ||
        clean === "वोटरid" ||
        clean === "voterid" ||
        clean === "epic" ||
        clean === "id" ||
        clean === "आईडी" ||
        c.includes("वोटर id") ||
        c.includes("voter id") ||
        c.includes("voter_id") ||
        c.includes("voter-id") ||
        c.includes("epic") ||
        c.includes("epc") ||
        c.includes("पहचान पत्र") ||
        c.includes("पहचान") ||
        c.includes("card no") ||
        c.includes("id no") ||
        c.includes("voter card") ||
        c.includes("वोटर कार्ड") ||
        c.includes("आईडी") ||
        c.includes("elector") ||
        ((c.includes("वोटर") || c.includes("voter")) && (
          c.includes("id") || c.includes("आईडी") || c.includes("कार्ड") || c.includes("card") ||
          c.includes("no") || c.includes("नं") || c.includes("संख्या") || c.includes("क्रमांक") || c.includes("क्र")
        )) ||
        (c.includes("कार्ड") && !c.includes("आधार") && !c.includes("राशन") && !c.includes("pan"));

      if (isEpicMatch && !c.includes("father") && !c.includes("husband") && !c.includes("माता") && !c.includes("पिता") && !c.includes("aadhar") && !c.includes("आधार") && !c.includes("ration") && !c.includes("राशन")) {
        mapping.epic = col;
      }
    }

    // 14. Gender (लिंग / स्त्री / पुरुष / Gender)
    if (!mapping.gender && (
      c.includes("gender") ||
      c.includes("sex") ||
      c.includes("लिंग") ||
      c.includes("लिङ्ग") ||
      c.includes("स्त्री/पुरुष") ||
      c.includes("पुरुष/महिला") ||
      c.includes("महिला/पुरुष") ||
      c.includes("जेंडर") ||
      c.includes("m/f") ||
      c === "स्त्री" ||
      c === "पुरुष" ||
      c === "महिला" ||
      clean === "gender" ||
      clean === "sex" ||
      clean === "ling" ||
      clean === "linga" ||
      clean === "m" ||
      clean === "f"
    )) {
      if (!c.includes("party") && !c.includes("पार्टी")) {
        mapping.gender = col;
      }
    }

    // 15. Status (Active/Deleted / स्थिति / विलोपित)
    if (!mapping.voterStatus && (
      c.includes("deleted") ||
      c.includes("विलोपित") ||
      c.includes("हटाया") ||
      c.includes("हटाये") ||
      c.includes("active/deleted") ||
      c.includes("active / deleted") ||
      c.includes("active_deleted") ||
      c.includes("activedeleted") ||
      c.includes("active-deleted") ||
      c.includes("voter status") ||
      c.includes("voterstatus") ||
      c === "status" ||
      c === "स्थिति" ||
      c.includes("active") ||
      c.includes("सक्रिय") ||
      c.includes("हालत") ||
      c.includes("दशा")
    )) {
      if (!c.includes("campaign") && !c.includes("marital") && !c.includes("वैवाहिक")) {
        mapping.voterStatus = col;
      }
    }
  }

  // Heuristic Fallback: Inspect sample rows if column headers were ambiguous
  if (!mapping.epic && sampleRows && sampleRows.length > 0) {
    const slashEpicRegex = /^[A-Za-z]{2,4}\/\d{1,4}\/\d{1,4}\/\d{3,8}$/;
    const standardEpicRegex = /^[A-Za-z]{3}\d{7}$/i;
    const generalEpicRegex = /^[A-Za-z]{2,5}\d{5,10}$/i;

    for (const col of columns) {
      if (
        col === mapping.name ||
        col === mapping.guardian ||
        col === mapping.phone ||
        col === mapping.address ||
        col === mapping.boothAddress ||
        col === mapping.house ||
        col === mapping.age ||
        col === mapping.gender ||
        col === mapping.serialNo ||
        col === mapping.booth
      ) {
        continue;
      }

      let matches = 0;
      let totalChecked = 0;
      for (const row of sampleRows.slice(0, 20)) {
        const val = String(row[col] || "").trim();
        if (val) {
          totalChecked++;
          if (slashEpicRegex.test(val) || standardEpicRegex.test(val) || generalEpicRegex.test(val)) {
            matches++;
          }
        }
      }

      if (totalChecked > 0 && matches / totalChecked >= 0.3) {
        mapping.epic = col;
        break;
      }
    }
  }

  // Heuristic Fallback for Gender: Inspect sample rows if gender column header was ambiguous
  if (!mapping.gender && sampleRows && sampleRows.length > 0) {
    const knownGenders = new Set([
      "male", "female", "other", "m", "f", "o", "t",
      "पुरुष", "महिला", "स्त्री", "पुरूष", "पु", "म", "अन्य", "तृतीय लिंग"
    ]);

    for (const col of columns) {
      if (
        col === mapping.name ||
        col === mapping.guardian ||
        col === mapping.epic ||
        col === mapping.phone ||
        col === mapping.booth ||
        col === mapping.serialNo ||
        col === mapping.house ||
        col === mapping.address
      ) {
        continue;
      }

      let matches = 0;
      let totalChecked = 0;
      for (const row of sampleRows.slice(0, 25)) {
        const val = String(row[col] || "").trim();
        if (val) {
          totalChecked++;
          if (knownGenders.has(val.toLowerCase()) || knownGenders.has(val)) {
            matches++;
          }
        }
      }

      if (totalChecked > 0 && matches / totalChecked >= 0.35) {
        mapping.gender = col;
        break;
      }
    }
  }

  // Heuristic Fallback for voterStatus (Active/Deleted): Inspect sample rows if column headers were ambiguous
  if (!mapping.voterStatus && sampleRows && sampleRows.length > 0) {
    const knownStatusTerms = new Set([
      "active", "deleted", "inactive", "delete",
      "सक्रिय", "विलोपित", "हटाया", "हटाया गया", "निरस्त",
      "a", "d"
    ]);

    for (const col of columns) {
      if (
        col === mapping.name ||
        col === mapping.guardian ||
        col === mapping.epic ||
        col === mapping.phone ||
        col === mapping.address ||
        col === mapping.boothAddress ||
        col === mapping.house ||
        col === mapping.age ||
        col === mapping.gender ||
        col === mapping.serialNo ||
        col === mapping.booth
      ) {
        continue;
      }

      let statusMatches = 0;
      let totalChecked = 0;
      for (const row of sampleRows.slice(0, 30)) {
        const val = String(row[col] || "").trim().toLowerCase();
        if (val) {
          totalChecked++;
          if (knownStatusTerms.has(val) || val.includes("विलोपित") || val.includes("deleted")) {
            statusMatches++;
          }
        }
      }

      if (totalChecked > 0 && statusMatches / totalChecked >= 0.2) {
        mapping.voterStatus = col;
        break;
      }
    }
  }

  // Fallback: If name was not matched by keyword, pick the second column if serial was column 0, or first text column
  if (!mapping.name && columns.length > 0) {
    for (const col of columns) {
      if (col !== mapping.serialNo && col !== mapping.booth && col !== mapping.epic && col !== mapping.age) {
        mapping.name = col;
        break;
      }
    }
  }

  return mapping;
}

/**
 * Intelligently and safely extracts the Voter ID / EPIC from an Excel row object.
 * Priority:
 * 1. Explicitly mapped column value
 * 2. Any column in the row whose header contains "वोटर ID", "voter id", "epic", "पहचान पत्र", etc.
 * 3. Any column in the row whose value matches standard Indian EPIC formats (e.g. RJ/22/169/313098, TDL1632066, DXW1519172)
 * 4. Fallback: Returns empty string (""). Never auto-generates or synthesizes dummy EPIC IDs.
 */
export function extractRowEpic(
  row: Record<string, any>,
  epicCol?: string,
  boothVal: string | number = "1",
  serialVal: string | number = 1
): string {
  if (!row) {
    return "";
  }

  // Helper to sanitize extracted EPIC string
  const cleanEpic = (val: any): string => {
    let s = String(val).trim();
    if (/^\d+\.0$/.test(s)) s = s.slice(0, -2);
    if (!s || s === "—" || s === "-" || s === "null" || s === "undefined" || s === "NaN") return "";
    return s.toUpperCase();
  };

  // 1. Direct mapped column check
  if (epicCol && row[epicCol] !== undefined && row[epicCol] !== null) {
    const s = cleanEpic(row[epicCol]);
    if (s) {
      return s;
    }
  }

  // 2. Scan row keys for voter id / epic variations
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined || v === null) continue;
    const s = cleanEpic(v);
    if (!s) continue;

    const lowerKey = k.toLowerCase().trim();
    const cleanKey = lowerKey.replace(/[\s\.\-_]/g, "");

    const isMatch =
      cleanKey.includes("वोटरid") ||
      cleanKey.includes("वोटरआईडी") ||
      cleanKey.includes("वोटरकार्ड") ||
      cleanKey.includes("voterid") ||
      cleanKey.includes("epicno") ||
      cleanKey.includes("cardno") ||
      cleanKey.includes("idno") ||
      cleanKey.includes("पहचानपत्र") ||
      cleanKey.includes("मतदातापहचान") ||
      cleanKey === "epic" ||
      cleanKey === "id" ||
      cleanKey === "आईडी" ||
      lowerKey.includes("वोटर id") ||
      lowerKey.includes("voter id") ||
      lowerKey.includes("voter_id") ||
      lowerKey.includes("epic") ||
      lowerKey.includes("पहचान पत्र") ||
      lowerKey.includes("पहचान") ||
      lowerKey.includes("कार्ड नं") ||
      lowerKey.includes("कार्ड संख्या") ||
      lowerKey.includes("कार्ड क्रमांक") ||
      lowerKey.includes("elector");

    if (
      isMatch &&
      !lowerKey.includes("पिता") &&
      !lowerKey.includes("पति") &&
      !lowerKey.includes("father") &&
      !lowerKey.includes("husband") &&
      !lowerKey.includes("माता") &&
      !lowerKey.includes("mother") &&
      !lowerKey.includes("aadhaar") &&
      !lowerKey.includes("आधार") &&
      !lowerKey.includes("ration") &&
      !lowerKey.includes("राशन")
    ) {
      return s;
    }
  }

  // 3. Scan row values for Indian Voter ID / EPIC formats (e.g. RJ/22/169/313098, TDL1632066, DXW1519172)
  const slashEpicRegex = /^[A-Za-z]{2,4}\/\d{1,4}\/\d{1,4}\/\d{3,8}$/;
  const standardEpicRegex = /^[A-Za-z]{3}\d{7}$/i;
  const generalEpicRegex = /^[A-Za-z]{2,5}\d{5,10}$/i;
  const mixedEpicRegex = /^[A-Za-z]{1,4}[0-9\/\-]{4,14}$/i;
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined || v === null) continue;
    const s = cleanEpic(v);
    if (!s) continue;
    if (slashEpicRegex.test(s) || standardEpicRegex.test(s) || generalEpicRegex.test(s) || mixedEpicRegex.test(s)) {
      return s;
    }
  }

  // 4. Do NOT auto-generate or synthesize any dummy EPIC ID. Return empty string if not in the uploaded sheet.
  return "";
}

// Preserves raw gender input exactly as uploaded by the user without modifying or defaulting it
export function normalizeGender(val?: any): string {
  if (val === null || val === undefined) return "";
  const s = String(val).trim();
  if (!s || s === "—" || s === "-" || s === "null" || s === "undefined") return "";
  return s;
}

// Formats gender for display across slips, cards and messages
export function formatGenderDisplay(gender?: string, lang: "hi" | "en" = "hi"): string {
  if (!gender) return "—";
  const s = String(gender).trim();
  if (!s || s === "—" || s === "-" || s === "null" || s === "undefined") return "—";
  const lower = s.toLowerCase();
  if (lang === "hi") {
    if (lower === "female" || lower === "f" || s === "महिला" || s === "स्त्री" || s === "म" || s === "म.") {
      return "महिला";
    }
    if (lower === "male" || lower === "m" || s === "पुरुष" || s === "पुरूष" || s === "पु" || s === "पु.") {
      return "पुरुष";
    }
    if (lower === "other" || lower === "o" || lower === "t" || lower === "transgender" || s === "अन्य" || s.includes("तृतीय")) {
      return "अन्य";
    }
    return s;
  } else {
    if (lower === "female" || lower === "f" || s === "महिला" || s === "स्त्री" || s === "म" || s === "म.") {
      return "Female";
    }
    if (lower === "male" || lower === "m" || s === "पुरुष" || s === "पुरूष" || s === "पु" || s === "पु.") {
      return "Male";
    }
    if (lower === "other" || lower === "o" || lower === "t" || lower === "transgender" || s === "अन्य" || s.includes("तृतीय")) {
      return "Other";
    }
    return s;
  }
}

// Generate sample Excel template with the exact requested fields order and trigger download in browser
export function downloadSampleExcelTemplate() {
  const sampleData = [
    {
      "जि. प.": "12",
      "पं. स.": "04",
      "वार्ड संख्या": "1",
      "क्रम संख्या": 1,
      "नाम": "मंगल चन्द",
      "पिता/पति": "पांचू राम",
      "वोट डाला": "हाँ",
      "सपोर्टर है": "हाँ",
      "बाहर है": "नहीं",
      "आयु": "45",
      "लिंग": "पुरुष",
      "मोबाइल नो": "9829011111",
      "पहचान पत्र (EPIC)": "RJX1001001",
      "हाउस No": "12",
      "एड्रेस": "वार्ड 34, स्टेशन रोड",
      "Booth Address": "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
      "Status (Active/Deleted)": "Active",
    },
    {
      "जि. प.": "12",
      "पं. स.": "04",
      "वार्ड संख्या": "1",
      "क्रम संख्या": 2,
      "नाम": "ज़रीना",
      "पिता/पति": "मुनवर अली",
      "वोट डाला": "नहीं",
      "सपोर्टर है": "हाँ",
      "बाहर है": "नहीं",
      "आयु": "32",
      "लिंग": "महिला",
      "मोबाइल नो": "9829022222",
      "पहचान पत्र (EPIC)": "RJX1001002",
      "हाउस No": "14",
      "एड्रेस": "वार्ड 34, गांधी नगर",
      "Booth Address": "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
      "Status (Active/Deleted)": "Active",
    },
    {
      "जि. प.": "12",
      "पं. स.": "04",
      "वार्ड संख्या": "1",
      "क्रम संख्या": 3,
      "नाम": "गौरव शर्मा",
      "पिता/पति": "संतोष शर्मा",
      "वोट डाला": "हाँ",
      "सपोर्टर है": "हाँ",
      "बाहर है": "हाँ",
      "आयु": "28",
      "लिंग": "पुरुष",
      "मोबाइल नो": "9829088888",
      "पहचान पत्र (EPIC)": "RJX1001025",
      "हाउस No": "64",
      "एड्रेस": "वार्ड 34, शास्त्री नगर",
      "Booth Address": "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
      "Status (Active/Deleted)": "Deleted",
    },
    {
      "जि. प.": "12",
      "पं. स.": "04",
      "वार्ड संख्या": "1",
      "क्रम संख्या": 4,
      "नाम": "राकेश कुमार शर्मा",
      "पिता/पति": "सोहन लाल शर्मा",
      "वोट डाला": "नहीं",
      "सपोर्टर है": "हाँ",
      "बाहर है": "नहीं",
      "आयु": "54",
      "लिंग": "पुरुष",
      "मोबाइल नो": "9829066666",
      "पहचान पत्र (EPIC)": "RJX1001019",
      "हाउस No": "52",
      "एड्रेस": "वार्ड 34, शांति नगर",
      "Booth Address": "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
      "Status (Active/Deleted)": "Active",
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Voters_Template");
  XLSX.writeFile(wb, "VoterDesk_VoterList_Template.xlsx");
}
