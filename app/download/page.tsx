"use client";

import React, { useState, useEffect } from "react";

export default function DownloadPage() {
  const [platform, setPlatform] = useState<"android" | "ios" | "web">("android");
  const [detectedOs, setDetectedOs] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      if (/iPhone|iPad|iPod/i.test(ua)) {
        setPlatform("ios");
        setDetectedOs("Apple iOS (iPhone/iPad)");
      } else if (/Android/i.test(ua)) {
        setPlatform("android");
        setDetectedOs("Android Mobile");
      } else {
        setPlatform("web");
        setDetectedOs("Desktop / Browser");
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white flex flex-col items-center justify-center p-4 selection:bg-orange-500 selection:text-white">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

      <main className="relative z-10 w-full max-w-lg bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
        {/* App Logo */}
        <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-blue-700/90 border-2 border-blue-400/40 p-4 shadow-xl flex items-center justify-center mb-4">
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-md">
            <rect width="64" height="64" rx="14" fill="#1248a5" />
            <path d="M18 27h28v24H18z" fill="#ffffff" />
            <path d="m23 18 7 7 12-14 5 5-17 19-12-12z" fill="#ee7b20" />
            <path d="M24 41h16" stroke="#1248a5" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>

        {/* Live Interconnection Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium mb-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>🟢 <b>Live Interconnected:</b> Android ⇄ iOS ⇄ Cloud Sync</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
          VoterDesk Mobile
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mb-6 max-w-sm mx-auto">
          Android और Apple iPhone दोनों के लिए फ़ील्ड कार्यकर्ता और चुनाव अभियान ऐप
        </p>

        {/* Platform Tabs */}
        <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 mb-6">
          <button
            onClick={() => setPlatform("android")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
              platform === "android"
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🤖</span> Android (APK)
          </button>
          <button
            onClick={() => setPlatform("ios")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
              platform === "ios"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🍏</span> Apple iOS (iPhone)
          </button>
          <button
            onClick={() => setPlatform("web")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
              platform === "web"
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🌐</span> Web Version
          </button>
        </div>

        {/* ANDROID CONTENT */}
        {platform === "android" && (
          <div className="space-y-4">
            <a
              href="/voterdesk.apk"
              download="VoterDesk.apk"
              className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-base shadow-lg shadow-orange-500/25 transition transform active:scale-95"
            >
              <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Android APK (21 KB)
            </a>

            <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800 text-center text-xs text-slate-300">
              <div><span className="text-slate-500">साइज़:</span> <b>~21 KB</b></div>
              <div><span className="text-slate-500">Android:</span> <b>7.0+</b></div>
              <div><span className="text-slate-500">सिंक:</span> <b className="text-emerald-400">Live 3s</b></div>
            </div>

            <div className="text-left bg-slate-800/40 rounded-2xl p-4 border border-slate-800 text-xs space-y-2 text-slate-300">
              <div className="font-semibold text-white">📲 Android इन्स्टॉल गाइड:</div>
              <div>1. <b>Download APK</b> पर टैप करें।</div>
              <div>2. <b>Download anyway</b> चुनें और डाउनलोड पूरा होने पर फ़ाइल खोलें।</div>
              <div>3. <b>Install</b> पर टैप करें — ऐप सीधे होम स्क्रीन पर आ जाएगी!</div>
            </div>
          </div>
        )}

        {/* APPLE IOS CONTENT */}
        {platform === "ios" && (
          <div className="space-y-4">
            <a
              href="/voterdesk.mobileconfig"
              download="VoterDesk.mobileconfig"
              className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base shadow-lg shadow-blue-500/25 transition transform active:scale-95"
            >
              <span>📲</span> 1-Click Install iOS Profile
            </a>

            <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800 text-center text-xs text-slate-300">
              <div><span className="text-slate-500">सपोर्ट:</span> <b>iPhone / iPad</b></div>
              <div><span className="text-slate-500">iOS:</span> <b>14.0 - 18+</b></div>
              <div><span className="text-slate-500">सिंक:</span> <b className="text-emerald-400">Realtime</b></div>
            </div>

            <div className="text-left bg-slate-800/40 rounded-2xl p-4 border border-slate-800 text-xs space-y-2.5 text-slate-300">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <span>🍏</span> iPhone में 2 सेकंड में ऐप बनाएं:
              </div>
              <div className="flex gap-2">
                <span className="text-blue-400 font-bold">A.</span>
                <span>Safari ब्राउज़र में <b>नीचे Share बटन (⎋)</b> पर टैप करें।</span>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-400 font-bold">B.</span>
                <span>सूची में से <b>&quot;Add to Home Screen&quot; (+)</b> चुनें।</span>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-400 font-bold">C.</span>
                <span>ऊपर दाईं तरफ <b>&quot;Add&quot;</b> दबाएं — VoterDesk ऐप iPhone होम स्क्रीन पर आ जाएगी!</span>
              </div>
            </div>
          </div>
        )}

        {/* WEB CONTENT */}
        {platform === "web" && (
          <div className="space-y-4">
            <a
              href="/"
              className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-base border border-slate-700 shadow-lg transition"
            >
              🌐 Open VoterDesk Web App
            </a>
            <p className="text-xs text-slate-400">
              लैपटॉप और डेस्कटॉप कंप्यूटर पर किसी भी ब्राउज़र (Chrome, Edge, Safari) में सीधे काम करता है।
            </p>
          </div>
        )}

        {/* Interconnected Multi-Device Explanation */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-left text-xs text-slate-400 space-y-1.5">
          <div className="text-slate-200 font-semibold flex items-center gap-1.5">
            <span>🔗</span> पूर्णतः इंटरकनेक्टेड (Seamlessly Synced):
          </div>
          <p>
            चाहे कार्यकर्ता <b>Android APK</b> इस्तेमाल करे, <b>iPhone</b> से लॉगिन करे, या एडमिन <b>Laptop</b> से देखे — हर वोटर की पर्ची, मतदान स्थिति और GPS लोकेशन <b>हर 3 सेकंड में Neon PostgreSQL Cloud DB</b> पर लाइव सिंक होती है।
          </p>
        </div>
      </main>

      <footer className="mt-6 text-xs text-slate-500 text-center">
        © 2026 VoterDesk Election Campaign Platform • Bhilwara, Rajasthan
      </footer>
    </div>
  );
}
