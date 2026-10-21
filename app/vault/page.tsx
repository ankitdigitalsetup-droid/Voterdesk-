"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Key, Eye, EyeOff, ArrowRight, AlertTriangle, CheckCircle2, Phone } from "lucide-react";

export default function VaultPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("9664074969");
  const [password, setPassword] = useState("");
  const [vaultPasskey, setVaultPasskey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showVaultKey, setShowVaultKey] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleVaultUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phone.trim()) {
      setError("कृपया सुपर एडमिन मोबाइल नंबर दर्ज करें।");
      return;
    }
    if (!password.trim()) {
      setError("कृपया सुपर एडमिन मास्टर पासवर्ड दर्ज करें।");
      return;
    }
    if (!vaultPasskey.trim()) {
      setError("कृपया मास्टर वॉल्ट सीक्रेट की (Master Vault Key) दर्ज करें।");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: phone.trim(),
          password: password.trim(),
          vaultPasskey: vaultPasskey.trim(),
          name: "Master Super Admin",
          isVault: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "वॉल्ट एक्सेस अस्वीकृत: अमान्य क्रेडेंशियल।");
      }

      // Successful Vault Authentication
      setSuccess(true);
      if (typeof window !== "undefined") {
        try {
          if (data.token) {
            localStorage.setItem("voterdesk_token", data.token);
          }
          if (data.user) {
            localStorage.setItem("voterdesk_user", JSON.stringify(data.user));
          }
          // Set cookie expiry tracking
          localStorage.setItem("voterdesk_vault_session", String(Date.now()));
        } catch {}
      }

      // Redirect directly to Super Admin dashboard
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "वॉल्ट अनलॉक विफल रहा।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 50%, #030712 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 14px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px -5px rgba(56, 189, 248, 0.2)",
          overflow: "hidden",
        }}
      >
        {/* Vault Header Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(30, 27, 75, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "26px 24px 20px",
            textAlign: "center",
            position: "relative",
          }}
        >
          {/* Pulsing Live Shield Icon */}
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #0284c7 0%, #3b82f6 50%, #6366f1 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              boxShadow: "0 8px 24px -4px rgba(59, 130, 246, 0.5)",
            }}
          >
            <ShieldCheck size={32} color="#ffffff" />
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.3)", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 800, color: "#4ade80", marginBottom: "8px", letterSpacing: "0.5px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", display: "inline-block" }}></span>
            256-BIT ENCRYPTED MASTER VAULT
          </div>

          <h2 style={{ margin: "4px 0", fontSize: "20px", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.3px" }}>
            VoterDesk Master Security Vault
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "#94a3b8" }}>
            गुप्त सुपर एडमिन गेट (Authorized Personnel Only)
          </p>
        </div>

        {/* Vault Form */}
        <form onSubmit={handleVaultUnlock} style={{ padding: "24px" }}>
          {error && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: "10px",
                padding: "11px 14px",
                marginBottom: "18px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#fca5a5",
                fontSize: "12.5px",
                fontWeight: 600,
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              style={{
                background: "rgba(34, 197, 94, 0.12)",
                border: "1px solid rgba(34, 197, 94, 0.35)",
                borderRadius: "10px",
                padding: "11px 14px",
                marginBottom: "18px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "#86efac",
                fontSize: "12.5px",
                fontWeight: 700,
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>✅ वॉल्ट अनलॉक सफल! सुपर एडमिन डैशबोर्ड लोड हो रहा है...</span>
            </div>
          )}

          {/* 1. Mobile Number */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
              1. सुपर एडमिन मोबाइल नंबर (Super Admin Mobile)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10 अंकों का मोबाइल नंबर"
                required
                style={{
                  width: "100%",
                  padding: "11px 14px 11px 38px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  background: "rgba(15, 23, 42, 0.6)",
                  color: "#ffffff",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <Phone size={15} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            </div>
          </div>

          {/* 2. Strong Password */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#cbd5e1", marginBottom: "6px" }}>
              2. सुपर एडमिन मास्टर पासवर्ड (Master Password)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="मास्टर पासवर्ड दर्ज करें"
                required
                style={{
                  width: "100%",
                  padding: "11px 40px 11px 38px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  background: "rgba(15, 23, 42, 0.6)",
                  color: "#ffffff",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <Lock size={15} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* 3. Master Vault Key */}
          <div style={{ marginBottom: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#38bdf8" }}>
                3. मास्टर वॉल्ट सीक्रेट की (Secret Vault Key)
              </label>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>3-Layer Verification</span>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showVaultKey ? "text" : "password"}
                value={vaultPasskey}
                onChange={(e) => setVaultPasskey(e.target.value)}
                placeholder="सीक्रेट वॉल्ट की दर्ज करें"
                required
                style={{
                  width: "100%",
                  padding: "11px 40px 11px 38px",
                  borderRadius: "10px",
                  border: "1px solid rgba(56, 189, 248, 0.4)",
                  background: "rgba(8, 47, 73, 0.4)",
                  color: "#38bdf8",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  outline: "none",
                  boxSizing: "border-box",
                  letterSpacing: showVaultKey ? "0.5px" : "2px",
                }}
              />
              <Key size={15} color="#38bdf8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <button
                type="button"
                onClick={() => setShowVaultKey(!showVaultKey)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#38bdf8",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                {showVaultKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Unlock Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #4f46e5 100%)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 800,
              cursor: loading || success ? "not-allowed" : "pointer",
              boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
          >
            {loading ? (
              <span>वॉल्ट सत्यापित किया जा रहा है...</span>
            ) : success ? (
              <span>✅ अधिकृत! प्रवेश हो रहा है...</span>
            ) : (
              <>
                <span>🔐 वॉल्ट अनलॉक करें (Unlock Master Control)</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          {/* Security Notice Footer */}
          <div
            style={{
              marginTop: "20px",
              padding: "12px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px dashed rgba(255, 255, 255, 0.1)",
              textAlign: "center",
              fontSize: "11px",
              color: "#64748b",
              lineHeight: 1.5,
            }}
          >
            🔒 <b>सुरक्षा सूचना:</b> यह यूआरएल केवल मुख्य व्यवस्थापक (Owner) के लिए है। सार्वजनिक पोर्टल से सुपर एडमिन लॉगिन स्थायी रूप से अक्षम है।
          </div>
        </form>
      </div>
    </div>
  );
}
