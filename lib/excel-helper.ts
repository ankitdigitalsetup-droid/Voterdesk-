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
    name: "",
    epic: "",
    guardian: "",
    age: "",
    gender: "",
    house: "",
    booth: "",
    phone: "",
  };

  for (const col of columns) {
    const c = col.trim().toLowerCase();
    // Name
    if (!mapping.name && (c.includes("elector") || c.includes("voter name") || c.includes("name") || c.includes("नाम") || c.includes("मतदाता"))) {
      if (!c.includes("father") && !c.includes("relation") && !c.includes("guardian") && !c.includes("पति") && !c.includes("पिता")) {
        mapping.name = col;
      }
    }
    // EPIC
    if (!mapping.epic && (c.includes("epic") || c.includes("voter id") || c.includes("card") || c.includes("पहचान") || c.includes("क्रमांक") || c.includes("id"))) {
      mapping.epic = col;
    }
    // Guardian
    if (!mapping.guardian && (c.includes("relation") || c.includes("father") || c.includes("husband") || c.includes("guardian") || c.includes("पिता") || c.includes("पति") || c.includes("अभिभावक"))) {
      mapping.guardian = col;
    }
    // Age
    if (!mapping.age && (c.includes("age") || c.includes("आयु") || c.includes("उम्र"))) {
      mapping.age = col;
    }
    // Gender
    if (!mapping.gender && (c.includes("gender") || c.includes("sex") || c.includes("लिंग"))) {
      mapping.gender = col;
    }
    // House No
    if (!mapping.house && (c.includes("house") || c.includes("h.no") || c.includes("मकान") || c.includes("गृह"))) {
      mapping.house = col;
    }
    // Booth / Part
    if (!mapping.booth && (c.includes("part") || c.includes("booth") || c.includes("भाग") || c.includes("बूथ") || c.includes("ward") || c.includes("वार्ड"))) {
      mapping.booth = col;
    }
    // Phone
    if (!mapping.phone && (c.includes("phone") || c.includes("mobile") || c.includes("contact") || c.includes("मोबाइल") || c.includes("फोन"))) {
      mapping.phone = col;
    }
  }

  return mapping;
}

// Generate sample Excel template and trigger download in browser
export function downloadSampleExcelTemplate() {
  const sampleData = [
    {
      "EPIC No.": "RJX1032847",
      "Elector Name": "Ramesh Kumar Sharma",
      "Relation Name": "Sohan Lal Sharma",
      "Age": 46,
      "Gender": "Male",
      "House No.": "42-A",
      "Part / Booth No.": "12",
      "Mobile": "9829011111",
    },
    {
      "EPIC No.": "RJX1075231",
      "Elector Name": "Sunita Devi",
      "Relation Name": "Mahesh Kumar",
      "Age": 39,
      "Gender": "Female",
      "House No.": "18",
      "Part / Booth No.": "12",
      "Mobile": "9829022222",
    },
    {
      "EPIC No.": "RJX1186309",
      "Elector Name": "Mohammad Arif",
      "Relation Name": "Abdul Karim",
      "Age": 52,
      "Gender": "Male",
      "House No.": "77-B",
      "Part / Booth No.": "14",
      "Mobile": "9829033333",
    },
    {
      "EPIC No.": "RJX1208452",
      "Elector Name": "Kavita Joshi",
      "Relation Name": "Gopal Joshi",
      "Age": 31,
      "Gender": "Female",
      "House No.": "103",
      "Part / Booth No.": "15",
      "Mobile": "9829044444",
    },
    {
      "EPIC No.": "RJX1253098",
      "Elector Name": "Deepak Verma",
      "Relation Name": "Rajendra Verma",
      "Age": 28,
      "Gender": "Male",
      "House No.": "09-C",
      "Part / Booth No.": "15",
      "Mobile": "9829055555",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Voters_Template");
  XLSX.writeFile(wb, "VoterDesk_Sample_VoterList.xlsx");
}
