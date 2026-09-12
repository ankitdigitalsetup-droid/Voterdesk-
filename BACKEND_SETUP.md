# VoterDesk Backend & Multi-Role Setup Guide
*(हिन्दी और English में विस्तृत जानकारी)*

---

## 1. Multi-Role Hierarchy Overview (उपयोगकर्ता रोल्स)

VoterDesk अब 3-tier Role-Based Access Control (RBAC) सिस्टम को सपोर्ट करता है:

| Role (रोल) | कौन उपयोग करेगा? | मुख्य फीचर्स और अधिकार |
| :--- | :--- | :--- |
| **SUPER_ADMIN** | **आप (Platform Owner)** | • सभी Candidates और उनके Elections को Create & Manage करना<br>• पूरे सिस्टम के Total Voters & Karyakartas का ओवरव्यू<br>• किसी भी Candidate के Workspace को इंस्पेक्ट/ओपन करना |
| **CANDIDATE_ADMIN** | **चुनाव लड़ने वाला उम्मीदवार (Candidate / Campaign Manager)** | • अपना खुद का Election Workspace (Ward / Constituency)<br>• Live Voter List, Search & Filters<br>• **Functional Excel/CSV Import** (फाइल अपलोड, कॉलम मैपिंग)<br>• Booth Wise Progress & Analytics<br>• Karyakarta Team जोड़ना और बूथ असाइन करना |
| **KARYAKARTA** | **ग्राउंड फील्ड वर्कर / बूथ कार्यकर्ता (Volunteer)** | • मोबाइल-फ्रेंडली फील्ड इंटरफेस<br>• **सिर्फ अपने असाइन किए गए बूथ के वोटर्स** दिखेंगे<br>• Quick Voter Status मार्क करना (*Contacted, Pakka Vote, Doubtful, Slip Given*)<br>• वोटर का मोबाइल नंबर अपडेट करना व पर्ची देना |

---

## 2. Pre-configured Demo Logins (टेस्टिंग हेतु डिफ़ॉल्ट लॉगिन)

एप्लिकेशन के लॉगिन स्क्रीन पर 1-Click Role Switcher दिया गया है, या आप सीधे ये क्रेडेंशियल्स दर्ज कर सकते हैं:

1. **Super Admin**:
   - **Mobile:** `9999999999`
   - **Password:** `superadmin`
2. **Candidate Admin**:
   - **Mobile:** `9414114497`
   - **Password:** `voterdesk`
3. **Karyakarta / Field Worker**:
   - **Mobile:** `9829012345`
   - **Password:** `karyakarta`

---

## 3. Local Machine Par Backend Chalana (लोकल सेटअप)

Next.js में बैकएंड अलग से किसी Node सर्वर के बिना इन-बिल्ट **Next.js Route Handlers (`/app/api/...`)** के द्वारा चलता है।

### Step 1: Dependencies Install करें
```bash
npm install
```

### Step 2: Development Server Start करें
```bash
npm run dev
```
अब अपने ब्राउज़र में **http://localhost:3000** खोलें। बैकएंड APIs और फ्रंटएंड दोनों एक साथ चालू हो जाएंगे!

---

## 4. Production Database Setup (Vercel & Supabase Cloud)

लोकल में यह बिना किसी परेशानी के तुरंत काम करता है। जब आप इसे **Vercel** पर लाइव 24/7 होस्ट करना चाहें:

### Free Cloud Database (Supabase / Neon) सेटअप:
1. [supabase.com](https://supabase.com) या [neon.tech](https://neon.tech) पर फ्री अकाउंट बनाएं।
2. एक नया Project बनाएं (उदा: `voterdesk-db`).
3. **Settings -> Database -> Connection String** से अपना PostgreSQL URI कॉपी करें:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```
4. अपने Vercel Project के **Environment Variables** में `DATABASE_URL` पेस्ट कर दें।

---

## 5. Backend REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth` | मोबाइल नंबर और पासवर्ड से लॉगिन जांचता है और यूजर रोल लौटाता है |
| `GET` | `/api/candidates` | सभी रजिस्टर्ड कैंडिडेट्स की सूची (Super Admin हेतु) |
| `POST` | `/api/candidates` | नया कैंडिडेट और उनका चुनाव खाता बनाना |
| `GET` | `/api/voters` | वोटर्स की लिस्ट (सर्च, बूथ व स्टेटस फिल्टर के साथ) |
| `POST` | `/api/voters` | नया सिंगल वोटर जोड़ना |
| `PATCH` | `/api/voters/[id]` | वोटर का स्टेटस, फोन या नोट्स अपडेट करना (कार्यकर्ता व एडमिन हेतु) |
| `DELETE` | `/api/voters/[id]` | वोटर रिकॉर्ड डिलीट करना |
| `POST` | `/api/voters/import` | Excel/CSV से बल्क में वोटर्स को इम्पोर्ट करना |
| `GET` | `/api/team` | कैंडिडेट के सभी कार्यकर्ताओं की सूची और उनके असाइन बूथ |
| `POST` | `/api/team` | नया कार्यकर्ता जोड़ना और उसे बूथ नंबर सौंपना |
| `GET` | `/api/stats` | लाइव अभियान आंकड़े और बूथ-वार प्रगति |

---

## 6. Excel Upload Kaise Kaam Karta Hai? (एक्सल इम्पोर्ट)

1. **Upload**: कैंडिडेट एडमिन पोर्टल में **Import Data** पर जाएं।
2. अपनी `.xlsx`, `.xls` या `.csv` फाइल ड्रैग करें या 'Choose file' पर क्लिक करें।
3. **Download Template**: यदि आपके पास सही फॉर्मेट नहीं है, तो **"Download sample template"** बटन दबाकर 1-क्लिक में रेडीमेड एक्सल फाइल डाउनलोड करें।
4. **Column Mapping**: सिस्टम अपने आप हिंदी व अंग्रेजी के कॉलम (जैसे *Elector Name / नाम*, *EPIC No. / पहचान पत्र*, *Part No. / भाग संख्या*, *House No. / मकान नं.*) पहचान कर मैप कर देता है।
5. **Validate & Import**: 'Validate' पर क्लिक करके डुप्लीकेट या मिसिंग डेटा चेक करें और 'Import' दबाते ही सभी वोटर्स तुरंत डेटाबेस और लाइव लिस्ट में जुड़ जाएंगे!
