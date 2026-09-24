import { BoothCredential, VoterRecord, WardConfig } from "@/types";
import { generateBoothCredentials } from "./credentialGenerator";

const WARDS_STORAGE_KEY = "voterdesk_wards_v1";
const CREDS_STORAGE_KEY = "voterdesk_credentials_v1";
const VOTERS_STORAGE_KEY = "voterdesk_voters_v1";

// Default preset posters with professional campaign banner visuals (SVG Data URIs)
export const PRESET_POSTERS = [
  {
    id: "poster-tricolor",
    title: "Tricolor Saffron & Green Theme",
    tagline: "Vikas & Vishwas",
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="100%" height="100%">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff7700"/>
            <stop offset="35%" stop-color="#ffffff"/>
            <stop offset="100%" stop-color="#138808"/>
          </linearGradient>
          <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0a2a5d"/>
            <stop offset="100%" stop-color="#1248a5"/>
          </linearGradient>
        </defs>
        <rect width="400" height="520" rx="16" fill="url(#bg)"/>
        <rect x="20" y="20" width="360" height="480" rx="12" fill="#ffffff" fill-opacity="0.94"/>
        
        <!-- Header -->
        <rect x="35" y="35" width="330" height="44" rx="8" fill="#ff7700"/>
        <text x="200" y="63" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">★ MUNICIPAL ELECTIONS 2026 ★</text>
        
        <!-- Ward Badge -->
        <rect x="130" y="90" width="140" height="28" rx="14" fill="#0f2f67"/>
        <text x="200" y="109" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">WARD NO. 34</text>
        
        <!-- Candidate Illustration/Photo Area -->
        <circle cx="200" cy="210" r="75" fill="#e9f1ff" stroke="#1248a5" stroke-width="4"/>
        <circle cx="200" cy="185" r="32" fill="#1248a5"/>
        <path d="M 150 265 Q 200 220 250 265" fill="#1248a5"/>
        
        <!-- Election Symbol Badge -->
        <circle cx="260" cy="155" r="28" fill="#ff9900" stroke="#ffffff" stroke-width="3"/>
        <text x="260" y="162" font-family="Arial, sans-serif" font-size="22" text-anchor="middle">☀️</text>
        
        <!-- Candidate Name -->
        <text x="200" y="325" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#0a2a5d" text-anchor="middle">ABHAY KUMAR</text>
        <text x="200" y="350" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#ee7b20" text-anchor="middle">Aapka Apna Karmathi Candidate</text>
        
        <!-- Slogan Banner -->
        <rect x="40" y="375" width="320" height="60" rx="10" fill="url(#cardGrad)"/>
        <text x="200" y="402" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">"Ward Ka Vikas, Har Booth Ka Samman"</text>
        <text x="200" y="422" font-family="Arial, sans-serif" font-size="11" fill="#bad0ef" text-anchor="middle">Karyakarta & Booth Level Official Campaign</text>
        
        <!-- Footer -->
        <rect x="40" y="450" width="320" height="34" rx="6" fill="#138808"/>
        <text x="200" y="472" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">VOTE FOR PROGRESS &amp; PROSPERITY</text>
      </svg>
    `)
  },
  {
    id: "poster-royal-blue",
    title: "Royal Navy & Gold Theme",
    tagline: "Dedicated to Public Service",
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="100%" height="100%">
        <defs>
          <linearGradient id="navyBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#071b3b"/>
            <stop offset="60%" stop-color="#0f2f67"/>
            <stop offset="100%" stop-color="#1a4ca1"/>
          </linearGradient>
          <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#f7b731"/>
            <stop offset="100%" stop-color="#fed330"/>
          </linearGradient>
        </defs>
        <rect width="400" height="520" rx="16" fill="url(#navyBg)"/>
        <rect x="15" y="15" width="370" height="490" rx="12" fill="none" stroke="url(#gold)" stroke-width="2"/>
        
        <text x="200" y="55" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#fed330" text-anchor="middle">JAN SEVAK PRATYASHI</text>
        <rect x="120" y="70" width="160" height="26" rx="6" fill="#ffffff" fill-opacity="0.15"/>
        <text x="200" y="88" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle">BHILWARA WARD 34</text>
        
        <circle cx="200" cy="195" r="70" fill="#ffffff" fill-opacity="0.1" stroke="#fed330" stroke-width="3"/>
        <circle cx="200" cy="172" r="30" fill="#fed330"/>
        <path d="M 152 245 Q 200 205 248 245" fill="#fed330"/>
        
        <!-- Symbol -->
        <circle cx="255" cy="145" r="24" fill="#ffffff"/>
        <text x="255" y="153" font-family="Arial, sans-serif" font-size="18" text-anchor="middle">🪷</text>
        
        <text x="200" y="305" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="#ffffff" text-anchor="middle">RAMESH SHARMA</text>
        <text x="200" y="330" font-family="Arial, sans-serif" font-size="13" fill="#fed330" text-anchor="middle">Pratishthit Nagarik & Samaj Sevi</text>
        
        <rect x="35" y="360" width="330" height="70" rx="10" fill="#ffffff" fill-opacity="0.1"/>
        <text x="200" y="390" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#ffffff" text-anchor="middle">"Neev Majboot, Ward Khushhal"</text>
        <text x="200" y="412" font-family="Arial, sans-serif" font-size="11" fill="#bad0ef" text-anchor="middle">Har Ghar Sampark — Har Karyakarta Hamari Taqat</text>
        
        <rect x="35" y="445" width="330" height="38" rx="8" fill="url(#gold)"/>
        <text x="200" y="469" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#071b3b" text-anchor="middle">EVM KRAMANK - 1 PAR MOHAR LAGAYEIN</text>
      </svg>
    `)
  },
  {
    id: "poster-emerald-action",
    title: "Emerald Youth Leader Theme",
    tagline: "Yuva Josh, Nayi Soch",
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="100%" height="100%">
        <defs>
          <linearGradient id="greenBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#064e3b"/>
            <stop offset="50%" stop-color="#047857"/>
            <stop offset="100%" stop-color="#10b981"/>
          </linearGradient>
        </defs>
        <rect width="400" height="520" rx="16" fill="url(#greenBg)"/>
        <rect x="18" y="18" width="364" height="484" rx="12" fill="#ffffff" fill-opacity="0.95"/>
        
        <rect x="35" y="35" width="330" height="36" rx="6" fill="#064e3b"/>
        <text x="200" y="58" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">NAGAR NIGAM CHUNAV 2026</text>
        
        <circle cx="200" cy="180" r="70" fill="#ecfdf5" stroke="#047857" stroke-width="4"/>
        <circle cx="200" cy="155" r="30" fill="#047857"/>
        <path d="M 152 230 Q 200 190 248 230" fill="#047857"/>
        
        <circle cx="255" cy="130" r="22" fill="#f59e0b" stroke="#ffffff" stroke-width="2"/>
        <text x="255" y="137" font-family="Arial, sans-serif" font-size="16" text-anchor="middle">⭐</text>
        
        <text x="200" y="285" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#064e3b" text-anchor="middle">POOJA CHOUDHARY</text>
        <text x="200" y="310" font-family="Arial, sans-serif" font-size="13" font-weight="600" fill="#047857" text-anchor="middle">Karyashil Mahila Netritva</text>
        
        <rect x="35" y="340" width="330" height="60" rx="8" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1"/>
        <text x="200" y="365" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#064e3b" text-anchor="middle">"Safai, Sadak, Suraksha &amp; Shiksha"</text>
        <text x="200" y="385" font-family="Arial, sans-serif" font-size="12" fill="#047857" text-anchor="middle">Booth Karyakartao Ka Sankalp — Ward Ka Samman</text>
        
        <rect x="35" y="420" width="330" height="48" rx="8" fill="#047857"/>
        <text x="200" y="443" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">APNA VOTE, APNA ADHIKAR</text>
        <text x="200" y="458" font-family="Arial, sans-serif" font-size="10" fill="#a7f3d0" text-anchor="middle">BHILWARA MUNICIPAL CORPORATION</text>
      </svg>
    `)
  }
];

// Seed Ward
const DEFAULT_WARD_ID = "ward-34-bhilwara";
const DEFAULT_WARD: WardConfig = {
  id: DEFAULT_WARD_ID,
  wardNumber: "Ward 34",
  wardName: "Shastri Nagar",
  electionName: "Bhilwara Municipal Election 2026",
  candidateName: "Abhay Kumar",
  candidatePhone: "94141 14497",
  partyName: "Independent / Jan Seva Morcha",
  posterUrl: PRESET_POSTERS[0].url,
  symbolName: "Rising Sun",
  totalBooths: 3,
  booths: [
    { boothNumber: 1, name: "Govt Sr Sec School Room 1", location: "Sector 1, Shastri Nagar", voterCount: 940 },
    { boothNumber: 2, name: "Community Center Hall", location: "Main Market, Sector 2", voterCount: 1020 },
    { boothNumber: 3, name: "Govt Girls Primary School", location: "Sector 3, Shastri Nagar", voterCount: 880 }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Seed Voters for Ward 34
export const SAMPLE_VOTERS: VoterRecord[] = [
  { id: "v-1", wardId: DEFAULT_WARD_ID, name: "Ramesh Kumar Sharma", epic: "RJX1032847", guardian: "Sohan Lal", age: "46", gender: "Male", house: "42-A", booth: 1, status: "Contacted", worker: "Amit Joshi", mobile: "98290 12345" },
  { id: "v-2", wardId: DEFAULT_WARD_ID, name: "Sunita Devi", epic: "RJX1075231", guardian: "Mahesh Kumar", age: "39", gender: "Female", house: "18", booth: 1, status: "Follow-up", worker: "Neha Saini", mobile: "98290 23456" },
  { id: "v-3", wardId: DEFAULT_WARD_ID, name: "Mohammad Arif", epic: "RJX1186309", guardian: "Abdul Karim", age: "52", gender: "Male", house: "77-B", booth: 2, status: "Pending", worker: "Rahul Meena", mobile: "98290 34567" },
  { id: "v-4", wardId: DEFAULT_WARD_ID, name: "Kavita Joshi", epic: "RJX1208452", guardian: "Gopal Joshi", age: "31", gender: "Female", house: "103", booth: 2, status: "Supporter", worker: "Amit Joshi", mobile: "98290 45678" },
  { id: "v-5", wardId: DEFAULT_WARD_ID, name: "Deepak Verma", epic: "RJX1253098", guardian: "Rajendra Verma", age: "28", gender: "Male", house: "09-C", booth: 3, status: "Pending", worker: "Neha Saini", mobile: "98290 56789" },
  { id: "v-6", wardId: DEFAULT_WARD_ID, name: "Pooja Rathore", epic: "RJX1398412", guardian: "Vikram Singh", age: "34", gender: "Female", house: "21", booth: 1, status: "Supporter", worker: "Amit Joshi", mobile: "98290 67890" },
  { id: "v-7", wardId: DEFAULT_WARD_ID, name: "Manoj Choudhary", epic: "RJX1421093", guardian: "Bhanwar Lal", age: "41", gender: "Male", house: "55", booth: 2, status: "Contacted", worker: "Rahul Meena", mobile: "98290 78901" },
  { id: "v-8", wardId: DEFAULT_WARD_ID, name: "Fatima Bi", epic: "RJX1590321", guardian: "Zameer Khan", age: "63", gender: "Female", house: "14-D", booth: 3, status: "Follow-up", worker: "Pooja Rathore", mobile: "98290 89012" },
  { id: "v-9", wardId: DEFAULT_WARD_ID, name: "Rajesh Soni", epic: "RJX1645902", guardian: "Kishan Lal", age: "37", gender: "Male", house: "89", booth: 1, status: "Pending", worker: "Amit Joshi", mobile: "98290 90123" },
  { id: "v-10", wardId: DEFAULT_WARD_ID, name: "Anil Kumawat", epic: "RJX1701294", guardian: "Shyam Lal", age: "29", gender: "Male", house: "112", booth: 3, status: "Contacted", worker: "Neha Saini", mobile: "98290 01234" }
];

export function getStoredWards(): WardConfig[] {
  if (typeof window === "undefined") return [DEFAULT_WARD];
  try {
    const raw = localStorage.getItem(WARDS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(WARDS_STORAGE_KEY, JSON.stringify([DEFAULT_WARD]));
      return [DEFAULT_WARD];
    }
    return JSON.parse(raw);
  } catch {
    return [DEFAULT_WARD];
  }
}

export function saveStoredWards(wards: WardConfig[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WARDS_STORAGE_KEY, JSON.stringify(wards));
}

export function getStoredCredentials(): BoothCredential[] {
  if (typeof window === "undefined") {
    return generateBoothCredentials(DEFAULT_WARD_ID, DEFAULT_WARD.wardNumber, DEFAULT_WARD.totalBooths);
  }
  try {
    const raw = localStorage.getItem(CREDS_STORAGE_KEY);
    if (!raw) {
      // 3 booths = 12 passwords (1 Cand + 3 Karyakarta per booth)
      const initial = generateBoothCredentials(DEFAULT_WARD_ID, DEFAULT_WARD.wardNumber, DEFAULT_WARD.totalBooths);
      // Give them friendly preset passwords for quick demoing
      initial[0].password = "voterdesk"; // Candidate B1
      localStorage.setItem(CREDS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return generateBoothCredentials(DEFAULT_WARD_ID, DEFAULT_WARD.wardNumber, DEFAULT_WARD.totalBooths);
  }
}

export function saveStoredCredentials(creds: BoothCredential[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CREDS_STORAGE_KEY, JSON.stringify(creds));
}

export function getStoredVoters(wardId?: string): VoterRecord[] {
  if (typeof window === "undefined") return SAMPLE_VOTERS;
  try {
    const raw = localStorage.getItem(VOTERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(VOTERS_STORAGE_KEY, JSON.stringify(SAMPLE_VOTERS));
      return wardId ? SAMPLE_VOTERS.filter((v) => v.wardId === wardId) : SAMPLE_VOTERS;
    }
    const all: VoterRecord[] = JSON.parse(raw);
    return wardId ? all.filter((v) => v.wardId === wardId) : all;
  } catch {
    return SAMPLE_VOTERS;
  }
}

export function saveStoredVoters(voters: VoterRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOTERS_STORAGE_KEY, JSON.stringify(voters));
}

/**
 * Generate synthetic voters for testing based on booth count & ward name
 */
export function generateSampleVotersForWard(wardId: string, totalBooths: number): VoterRecord[] {
  const firstNames = ["Ramesh", "Suresh", "Sunita", "Mohit", "Pooja", "Rajesh", "Kavita", "Deepak", "Anil", "Meena", "Vikram", "Sangeeta", "Mukesh", "Priyanka", "Ashok", "Kiran"];
  const lastNames = ["Sharma", "Verma", "Joshi", "Gupta", "Meena", "Saini", "Choudhary", "Rathore", "Agarwal", "Kumawat", "Yadav", "Trivedi"];
  const list: VoterRecord[] = [];

  for (let booth = 1; booth <= totalBooths; booth++) {
    // Generate 8 sample records per booth
    for (let i = 0; i < 8; i++) {
      const fn = firstNames[(booth * 3 + i) % firstNames.length];
      const ln = lastNames[(booth * 2 + i) % lastNames.length];
      const age = 22 + ((booth * 7 + i * 5) % 50);
      const isMale = i % 2 === 0;
      list.push({
        id: `v-${wardId}-b${booth}-${i + 1}`,
        wardId,
        name: `${fn} ${ln}`,
        guardian: `Shri ${(isMale ? firstNames[(i + 4) % firstNames.length] : fn)} ${ln}`,
        epic: `RJX${1000000 + Math.floor(Math.random() * 900000)}`,
        age: age.toString(),
        gender: isMale ? "Male" : "Female",
        house: `${10 + i * 3}-${String.fromCharCode(65 + (i % 4))}`,
        booth,
        status: i % 3 === 0 ? "Contacted" : i % 3 === 1 ? "Follow-up" : "Pending",
        worker: `Worker ${((i % 3) + 1)}`,
        mobile: `98290 ${Math.floor(10000 + Math.random() * 90000)}`
      });
    }
  }

  return list;
}
