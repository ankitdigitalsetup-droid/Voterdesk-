import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download VoterDesk Android App - APK",
  description: "Download the official VoterDesk Android APK for field karyakartas and election campaign management.",
};

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col items-center justify-center p-4 selection:bg-orange-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

      <main className="relative z-10 w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        {/* App Logo */}
        <div className="mx-auto w-24 h-24 rounded-3xl bg-blue-700/80 border-2 border-blue-400/40 p-4 shadow-xl flex items-center justify-center mb-6">
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md">
            <rect width="64" height="64" rx="14" fill="#1248a5" />
            <path d="M18 27h28v24H18z" fill="#ffffff" />
            <path d="m23 18 7 7 12-14 5 5-17 19-12-12z" fill="#ee7b20" />
            <path d="M24 41h16" stroke="#1248a5" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>

        {/* Title & Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Official Android Release v1.0.0
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
          VoterDesk Android App
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          चुनाव अभियान, डिजिटल वोटर पर्ची और फील्ड कार्यकर्ता मैनेजमेंट मोबाइल ऐप
        </p>

        {/* Download Button */}
        <div className="space-y-3 mb-8">
          <a
            href="/voterdesk.apk"
            download="VoterDesk.apk"
            className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-base shadow-lg shadow-orange-500/25 transition-all transform active:scale-95"
          >
            <svg
              className="w-6 h-6 animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download VoterDesk APK (21 KB)
          </a>

          <a
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-sm font-medium transition"
          >
            🌐 Open Web Version Directly
          </a>
        </div>

        {/* App Specs Grid */}
        <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-800 mb-6 text-center">
          <div>
            <div className="text-xs text-slate-500 font-medium">फ़ाइल साइज़</div>
            <div className="text-sm font-bold text-slate-200 mt-0.5">~21 KB</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Android वर्जन</div>
            <div className="text-sm font-bold text-slate-200 mt-0.5">7.0+ (ऑल फ़ोन्स)</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">सुरक्षा (Security)</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">100% Verified</div>
          </div>
        </div>

        {/* Quick Install Instructions */}
        <div className="text-left bg-slate-800/40 rounded-2xl p-4 border border-slate-800 text-xs space-y-2.5 text-slate-300">
          <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
            <span>📲</span> इन्स्टॉल करने के आसान 3 स्टेप्स:
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
              1
            </span>
            <span>ऊपर दिए गए <b>Download VoterDesk APK</b> बटन पर टैप करें।</span>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
              2
            </span>
            <span>अगर Chrome चेतावनी दे, तो <b>&quot;Download anyway&quot;</b> चुनें।</span>
          </div>
          <div className="flex gap-2.5 items-start">
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold flex items-center justify-center mt-0.5">
              3
            </span>
            <span>डाउनलोड पूरी होने पर <b>Install</b> पर टैप करके ऐप खोलें।</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-6 text-xs text-slate-500 text-center">
        © 2026 VoterDesk Election Campaign Platform • Bhilwara, Rajasthan
      </footer>
    </div>
  );
}
