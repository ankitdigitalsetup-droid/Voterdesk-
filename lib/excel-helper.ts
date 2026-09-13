import * as XLSX from "xlsx";

export interface ParsedSheetData {
  fileName: string;
  columns: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export function parseExcelFile(file: File): Promise<ParsedSheetData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

        if (jsonData.length === 0) {
          throw new Error("File is empty or could not be parsed.");
        }

        const columns = Object.keys(jsonData[0]);
        resolve({
          fileName: file.name,
          columns,
          rows: jsonData,
          totalRows: jsonData.length,
        });
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

    // 1. भाग संख्या (Part / Booth No)
    if (!mapping.booth && (c.includes("भाग") || c.includes("part") || c.includes("booth no") || c.includes("बूथ सं") || c.includes("ward") || c.includes("वार्ड"))) {
      if (!c.includes("address") && !c.includes("पता")) {
        mapping.booth = col;
      }
    }

    // 2. क्रम संख्या (Serial No)
    if (!mapping.serialNo && (c.includes("क्रम") || c.includes("serial") || c.includes("sr") || c.includes("sl") || c.includes("s.no") || c.includes("क्र सं") || c.includes("क्रमांक"))) {
      mapping.serialNo = col;
    }

    // 3. नाम (Name)
    if (!mapping.name && (c.includes("नाम") || c.includes("elector") || c.includes("voter name") || c.includes("name") || c.includes("मतदाता"))) {
      if (!c.includes("father") && !c.includes("relation") && !c.includes("guardian") && !c.includes("पति") && !c.includes("पिता")) {
        mapping.name = col;
      }
    }

    // 4. पिता/पति (Guardian / Father / Husband)
    if (!mapping.guardian && (c.includes("पिता") || c.includes("पति") || c.includes("relation") || c.includes("father") || c.includes("husband") || c.includes("guardian") || c.includes("अभिभावक"))) {
      mapping.guardian = col;
    }

    // 5. वोट डाला (Voted / Cast Vote)
    if (!mapping.voted && (c.includes("वोट डाला") || c.includes("voted") || c.includes("वोट") || c.includes("मतदान किया") || c.includes("polled"))) {
      mapping.voted = col;
    }

    // 6. सपोर्टर है (Is Supporter / In-Favor)
    if (!mapping.isSupporter && (c.includes("सपोर्टर") || c.includes("supporter") || c.includes("पक्ष") || c.includes("in-favor") || c.includes("infavor") || c.includes("समर्थक") || c.includes("पक्का"))) {
      mapping.isSupporter = col;
    }

    // 7. बाहर है (Is Outside / Out of Town / Pravasi)
    if (!mapping.isOutside && (c.includes("बाहर") || c.includes("outside") || c.includes("प्रवासी") || c.includes("pravasi") || c.includes("out of station") || c.includes("अन्यत्र"))) {
      mapping.isOutside = col;
    }

    // 8. मोबाइल नो (Mobile No / Phone)
    if (!mapping.phone && (c.includes("मोबाइल") || c.includes("phone") || c.includes("mobile") || c.includes("contact") || c.includes("फोन") || c.includes("मो."))) {
      mapping.phone = col;
    }

    // 9. हाउस No (House No)
    if (!mapping.house && (c.includes("हाउस") || c.includes("house") || c.includes("h.no") || c.includes("मकान") || c.includes("गृह"))) {
      mapping.house = col;
    }

    // 10. एड्रेस (Address)
    if (!mapping.address && (c.includes("एड्रेस") || c.includes("address") || c.includes("पता") || c.includes("colony") || c.includes("कॉलोनी") || c.includes("mohalla") || c.includes("मोहल्ला") || c.includes("गली"))) {
      if (!c.includes("booth") && !c.includes("बूथ")) {
        mapping.address = col;
      }
    }

    // 11. Booth Address (बूथ का पता / Polling Station Address)
    if (!mapping.boothAddress && ((c.includes("booth") && c.includes("address")) || (c.includes("बूथ") && c.includes("पता")) || c.includes("polling station") || c.includes("मतदान केंद्र पता") || c.includes("मतदान केंद्र का पता"))) {
      mapping.boothAddress = col;
    }

    // Optional: EPIC No.
    if (!mapping.epic && (c.includes("epic") || c.includes("voter id") || c.includes("card") || c.includes("पहचान") || c.includes("id"))) {
      mapping.epic = col;
    }

    // Optional: Age
    if (!mapping.age && (c.includes("age") || c.includes("आयु") || c.includes("उम्र"))) {
      mapping.age = col;
    }

    // Optional: Gender
    if (!mapping.gender && (c.includes("gender") || c.includes("sex") || c.includes("लिंग"))) {
      mapping.gender = col;
    }
  }

  return mapping;
}

// Generate sample Excel template with the exact 11 requested fields and trigger download in browser
export function downloadSampleExcelTemplate() {
  const sampleData = [
    {
      "भाग संख्या": "1",
      "क्रम संख्या": 1,
      "नाम": "मंगल चन्द",
      "पिता/पति": "पांचू राम",
      "वोट डाला": "हाँ",
      "सपोर्टर है": "हाँ",
      "बाहर है": "नहीं",
      "मोबाइल नो": "9829011111",
      "हाउस No": "12",
      "एड्रेस": "वार्ड 34, स्टेशन रोड",
      "Booth Address": "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
      "पहचान पत्र (EPIC)": "RJX1001001",
    },
    {
      "भाग संख्या": "1",
      "क्रम संख्या": 2,
      "नाम": "ज़रीना",
      "पिता/पति": "मुनवर अली",
      "वोट डाला": "नहीं",
      "सपोर्टर है": "हाँ",
      "बाहर है": "नहीं",
      "मोबाइल नो": "9829022222",
      "हाउस No": "14",
      "एड्रेस": "वार्ड 34, गांधी नगर",
      "Booth Address": "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
      "पहचान पत्र (EPIC)": "RJX1001002",
    },
    {
      "भाग संख्या": "1",
      "क्रम संख्या": 3,
      "नाम": "गौरव शर्मा",
      "पिता/पति": "संतोष शर्मा",
      "वोट डाला": "हाँ",
      "सपोर्टर है": "हाँ",
      "बाहर है": "हाँ",
      "मोबाइल नो": "9829088888",
      "हाउस No": "64",
      "एड्रेस": "वार्ड 34, शास्त्री नगर",
      "Booth Address": "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
      "पहचान पत्र (EPIC)": "RJX1001025",
    },
    {
      "भाग संख्या": "1",
      "क्रम संख्या": 4,
      "नाम": "राकेश कुमार शर्मा",
      "पिता/पति": "सोहन लाल शर्मा",
      "वोट डाला": "नहीं",
      "सपोर्टर है": "हाँ",
      "बाहर है": "नहीं",
      "मोबाइल नो": "9829066666",
      "हाउस No": "52",
      "एड्रेस": "वार्ड 34, शांति नगर",
      "Booth Address": "रा.उ.मा.वि. भीलवाड़ा, कमरा नं. 1",
      "पहचान पत्र (EPIC)": "RJX1001019",
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Voters_Template");
  XLSX.writeFile(wb, "VoterDesk_VoterList_Template.xlsx");
}
