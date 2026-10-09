import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | VoterDesk",
  description: "Privacy Policy and Data Protection guidelines for VoterDesk Election Campaign & Booth Management App.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-2">
              <span>🔒 Official Legal Policy</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Privacy Policy (गोपनीयता नीति)
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Last Updated: September 2026 | VoterDesk Campaign & Booth Management Platform
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold transition shadow-lg shadow-blue-600/30"
          >
            ← Back to App (होमपेज)
          </Link>
        </div>

        {/* Content */}
        <div className="space-y-8 text-sm leading-relaxed text-slate-300">
          {/* Section 1 */}
          <section className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">1.</span> Introduction / परिचय
            </h2>
            <p>
              Welcome to <b>VoterDesk</b>. We respect your privacy and are committed to protecting any personal data collected while using our application and services. This Privacy Policy explains how we collect, use, safeguard, and disclose information when you use the VoterDesk mobile application and web platform.
            </p>
            <p className="mt-2 text-slate-400">
              VoterDesk एक सुरक्षित चुनावी अभियान एवं बूथ प्रबंधन मंच है जिसका उपयोग प्रत्याशी (Candidate), सुपर एडमिन एवं अधिकृत कार्यकर्ताओं (Field Workers) द्वारा चुनाव संचालन एवं मतदाता पर्ची वितरण हेतु किया जाता है।
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">2.</span> Information We Collect / हम क्या जानकारी एकत्र करते हैं
            </h2>
            <ul className="list-disc list-inside space-y-2 text-slate-300 mt-2">
              <li>
                <b>User Authentication & Account Info:</b> Mobile phone numbers, secure passcodes, assigned role (Candidate Admin, Worker/Member, Super Admin), and assigned booth numbers.
              </li>
              <li>
                <b>Location Data (कार्यकर्ता लोकेशन ट्रैकिंग):</b> With explicit user permission, our app collects real-time geographic location (GPS coordinates) of field workers/members to enable live booth coordination, emergency assistance, and route coverage on the map for authorized campaign administrators. Super Admin locations are strictly protected and never disclosed.
              </li>
              <li>
                <b>Voter Roll & Campaign Records:</b> Electoral rolls, family house numbers, voter status (voted, supporter, outside), and optional survey notes uploaded by authorized candidates for campaign organization.
              </li>
              <li>
                <b>Device & Usage Data:</b> Browser type, device model, operating system, and session sync telemetry to ensure 15+ concurrent mobile devices remain synchronized in real-time.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">3.</span> How We Use Your Information / जानकारी का उपयोग
            </h2>
            <p>We use the collected information exclusively for the following purposes:</p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 mt-2">
              <li>Facilitating voter search, family slip generation, and WhatsApp voter slip sharing.</li>
              <li>Providing real-time multi-device database synchronization across booth workers.</li>
              <li>Displaying worker positions on the map to campaign administrators during election field operations.</li>
              <li>Verifying authorized access based on password and role hierarchy (Candidate Admin vs Member).</li>
              <li>Maintaining data security, preventing unauthorized access, and database backups.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">4.</span> Data Sharing & Third Parties / डेटा साझाकरण
            </h2>
            <p className="font-semibold text-emerald-400">
              ✓ We DO NOT sell, rent, trade, or monetize your personal or voter data to any third-party advertisers or marketing agencies.
            </p>
            <p className="mt-2">
              Data is strictly confined to the candidate&apos;s private campaign workspace. Campaign data is accessible only by authorized team members possessing designated passwords issued by the candidate.
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">5.</span> Data Security & Encryption / डेटा सुरक्षा
            </h2>
            <p>
              We implement industry-standard SSL/TLS 256-bit encryption for all data in transit between mobile devices and our cloud servers. Database records are securely stored on cloud infrastructure with role-based access control, secure credential hashing, and regular integrity audits.
            </p>
          </section>

          {/* Section 6 */}
          <section className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">6.</span> Data Retention & Account Deletion / डेटा हटाना
            </h2>
            <p>
              Campaign data is retained during the election campaign period. Candidates and Super Admins may request complete deletion or purge of their campaign databases, voter lists, and team records at any time through the administration control panel or by contacting support.
            </p>
          </section>

          {/* Section 7 */}
          <section className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">7.</span> Permissions Requested by the App / ऐप अनुमतियाँ
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <b className="text-white">📍 Location (लोकेशन):</b>
                <p className="text-xs text-slate-400 mt-1">Used during active shift to track worker booth presence on Google Maps.</p>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <b className="text-white">💾 Storage / Files (स्टोरेज):</b>
                <p className="text-xs text-slate-400 mt-1">Used to download voter slips (PNG/PDF) and export voter excel files for admins.</p>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <b className="text-white">🌐 Internet (इंटरनेट):</b>
                <p className="text-xs text-slate-400 mt-1">Used for real-time cloud data sync across all candidate workers.</p>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                <b className="text-white">📞 Phone / Dial (कॉल):</b>
                <p className="text-xs text-slate-400 mt-1">Directly launches system phone dialer when calling a voter.</p>
              </div>
            </div>
          </section>

          {/* Section 8 */}
          <section className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">8.</span> Contact Us / संपर्क सूत्र
            </h2>
            <p>
              If you have any questions, inquiries, or privacy concerns regarding VoterDesk or this Privacy Policy, please contact our support desk:
            </p>
            <div className="mt-3 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1 text-xs sm:text-sm">
              <p><b>App Name:</b> VoterDesk - Campaign & Voter Management</p>
              <p><b>Support Hotline:</b> +91 9664074969</p>
              <p><b>Website / Portal:</b> <a href="https://voterdeskproject.vercel.app" target="_blank" rel="noreferrer" className="text-blue-400 underline">https://voterdeskproject.vercel.app</a></p>
              <p><b>Privacy URL:</b> <a href="https://voterdeskproject.vercel.app/privacy" target="_blank" rel="noreferrer" className="text-blue-400 underline">https://voterdeskproject.vercel.app/privacy</a></p>
            </div>
          </section>

          {/* Section 9: Mandatory Google Play Government Disclaimer */}
          <section className="bg-amber-950/40 p-5 rounded-xl border border-amber-600/50">
            <h2 className="text-base sm:text-lg font-bold text-amber-300 mb-2 flex items-center gap-2">
              <span>⚠️</span> 9. Non-Government Entity Disclaimer (सरकारी गैर-संबद्धता अस्वीकरण)
            </h2>
            <div className="space-y-2 text-xs sm:text-sm text-amber-100/90 leading-relaxed">
              <p>
                <b>English Disclaimer:</b> VoterDesk is a private, independent election campaign and booth management software developed solely for internal organizational use by electoral candidates, campaign managers, and authorized political field workers. <b>VoterDesk does NOT represent, and is NOT affiliated with, authorized by, endorsed by, or associated with the Election Commission of India (ECI), any State Election Commission, or any government body, entity, or agency.</b> All electoral data and voter rolls are uploaded independently by registered candidates for their own private campaign management.
              </p>
              <p className="border-t border-amber-800/60 pt-2 text-amber-200">
                <b>हिंदी अस्वीकरण:</b> वोटर डेस्क (VoterDesk) एक निजी और स्वतंत्र चुनाव प्रबंधन सॉफ्टवेयर है जिसे केवल प्रत्याशियों, चुनाव प्रभारियों और उनके कार्यकर्ताओं के आंतरिक अभियान प्रबंधन के लिए विकसित किया गया है। <b>यह ऐप किसी भी सरकारी संस्था, भारत निर्वाचन आयोग (ECI) या किसी राज्य चुनाव आयोग का प्रतिनिधित्व नहीं करता है और न ही उनसे संबद्ध है।</b> ऐप में प्रदर्शित सभी डेटा संबंधित प्रत्याशी द्वारा अपने निजी अभियान संचालन हेतु प्रबंधित किया जाता है।
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© {new Date().getFullYear()} VoterDesk. All rights reserved. Complies with Google Play Developer Policies.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="text-blue-400 hover:underline">
              Terms of Service (नियम व शर्तें)
            </Link>
            <Link href="/" className="text-slate-400 hover:underline">
              Home (होमपेज)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
