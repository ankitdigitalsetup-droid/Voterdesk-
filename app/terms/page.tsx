import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | VoterDesk",
  description: "Terms and conditions of use for VoterDesk Election Campaign & Booth Management Platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-2">
              <span>📜 Official Terms & Conditions</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Terms of Service (नियम एवं शर्तें)
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Last Updated: October 2026 | VoterDesk Campaign & Booth Management Platform
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
              <span className="text-blue-400">1.</span> Acceptance of Terms / शर्तों की स्वीकृति
            </h2>
            <p>
              By accessing, downloading, or using the <b>VoterDesk</b> application, website, or associated services, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, do not access or use the application.
            </p>
            <p className="mt-2 text-slate-400">
              VoterDesk का उपयोग करके आप पुष्टि करते हैं कि आप अधिकृत चुनाव प्रत्याशी, चुनाव संचालक अथवा प्रत्याशी द्वारा नियुक्त अधिकृत बूथ कार्यकर्ता हैं।
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">2.</span> Permitted Use & Election Guidelines / वैध उपयोग
            </h2>
            <p>
              VoterDesk is designed strictly to facilitate electoral campaign organization, voter roll search, and authorized digital voter slip distribution. Users agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-slate-300 mt-2">
              <li>Use the software in strict compliance with the Election Commission of India (ECI) Model Code of Conduct and local electoral regulations.</li>
              <li>Ensure that all voter slips distributed conform to official ECI guidelines regarding candidate appeals and non-intimidation.</li>
              <li>Not misuse voter rolls for commercial spam, harassment, or unauthorized bulk marketing.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">3.</span> Account Credentials & Booth Access / पासवर्ड व सुरक्षा
            </h2>
            <p>
              Access to booth management is gated by 10-character secure passwords issued per booth (ADMIN and MEMBER roles). You are solely responsible for maintaining the confidentiality of your passwords and for all actions taken under your credentials.
            </p>
            <p className="mt-2 text-slate-400">
              पासवर्ड किसी भी अनधिकृत व्यक्ति के साथ साझा न करें। यदि आपको किसी अनाधिकृत पहुंच का संदेह हो, तो तुरंत एडमिन से संपर्क कर पासवर्ड रीसेट करें।
            </p>
          </section>

          {/* Section 4 */}
          <section className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">4.</span> Intellectual Property & Data Ownership / डेटा स्वामित्व
            </h2>
            <p>
              The candidate retains full ownership of their campaign data, uploaded voter lists, notes, and volunteer records. The VoterDesk software architecture, user interfaces, branding, and proprietary algorithms remain the exclusive intellectual property of the service providers.
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">5.</span> Service Availability & Limitation of Liability / सेवा उपलब्धता
            </h2>
            <p>
              While VoterDesk is engineered for high availability with sub-second response times and multi-device real-time sync, the service is provided &quot;AS IS&quot;. We are not liable for any delays or failures resulting from cellular carrier outages, internet interruptions, or device hardware malfunctions during election operations.
            </p>
          </section>

          {/* Section 6 */}
          <section className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80">
            <h2 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-blue-400">6.</span> Governing Law & Jurisdiction / क्षेत्राधिकार
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising in connection with these Terms shall be subject to the exclusive jurisdiction of the competent courts in India.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-4">
          <p>© 2026 VoterDesk Platform. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-blue-400 transition">
              Privacy Policy (गोपनीयता नीति)
            </Link>
            <Link href="/" className="hover:text-blue-400 transition">
              Home (होमपेज)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
