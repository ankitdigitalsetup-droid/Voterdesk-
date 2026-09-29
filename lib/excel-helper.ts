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
export function detectFieldMapping(columns: string[]) {
  const mapping: Record<string, string> = {
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
  };

  for (const col of columns) {
    const c = col.trim().toLowerCase();

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

    // 13. EPIC / Voter ID (पहचान पत्र क्रमांक)
    if (!mapping.epic && (c.includes("epic") || c.includes("voter id") || c.includes("voterid") || c.includes("पहचान पत्र") || c.includes("पहचान") || c.includes("card no") || c.includes("cardno") || c.includes("id no") || c.includes("voter card") || c.includes("कार्ड") || c === "id" || c.includes("epc") || c.includes("आईडी"))) {
      mapping.epic = col;
    }

    // 14. Gender (लिंग)
    if (!mapping.gender && (c.includes("gender") || c.includes("sex") || c.includes("लिंग") || c.includes("स्त्री/पुरुष") || c.includes("m/f"))) {
      mapping.gender = col;
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

// Generate sample Excel template with the exact requested fields order and trigger download in browser
export function downloadSampleExcelTemplate() {
  const sampleData = [
    {
      "वार्ड संख्या": "1",
      "क्रम संख्या": 1,
      "नाम": "मंगल चन्द",
      "पिता/पति": "पांचू राम",
      "वोट डाला": "हाँ",
      "सपोर्टर है": "हाँ",
      "बाहर है": "नहीं",
      "आयु": "45",
      "मोबाइल नो": "9829011111",
      "पहचान पत्र (EPIC)": "RJX1001001",
      "हाउस No": "12",
      "एड्रेस": "वार्ड 34, स्टेशन रोड",
      "Booth Address": "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
    },
    {
      "वार्ड संख्या": "1",
      "क्रम संख्या": 2,
      "नाम": "ज़रीना",
      "पिता/पति": "मुनवर अली",
      "वोट डाला": "नहीं",
      "सपोर्टर है": "हाँ",
      "बाहर है": "नहीं",
      "आयु": "32",
      "मोबाइल नो": "9829022222",
      "पहचान पत्र (EPIC)": "RJX1001002",
      "हाउस No": "14",
      "एड्रेस": "वार्ड 34, गांधी नगर",
      "Booth Address": "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
    },
    {
      "वार्ड संख्या": "1",
      "क्रम संख्या": 3,
      "नाम": "गौरव शर्मा",
      "पिता/पति": "संतोष शर्मा",
      "वोट डाला": "हाँ",
      "सपोर्टर है": "हाँ",
      "बाहर है": "हाँ",
      "आयु": "28",
      "मोबाइल नो": "9829088888",
      "पहचान पत्र (EPIC)": "RJX1001025",
      "हाउस No": "64",
      "एड्रेस": "वार्ड 34, शास्त्री नगर",
      "Booth Address": "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
    },
    {
      "वार्ड संख्या": "1",
      "क्रम संख्या": 4,
      "नाम": "राकेश कुमार शर्मा",
      "पिता/पति": "सोहन लाल शर्मा",
      "वोट डाला": "नहीं",
      "सपोर्टर है": "हाँ",
      "बाहर है": "नहीं",
      "आयु": "54",
      "मोबाइल नो": "9829066666",
      "पहचान पत्र (EPIC)": "RJX1001019",
      "हाउस No": "52",
      "एड्रेस": "वार्ड 34, शांति नगर",
      "Booth Address": "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Voters_Template");
  XLSX.writeFile(wb, "VoterDesk_VoterList_Template.xlsx");
}
