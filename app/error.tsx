"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("VoterDesk Application Error:", error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
      padding: "24px",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        maxWidth: "480px",
        width: "100%",
        background: "#ffffff",
        borderRadius: "16px",
        padding: "36px 28px",
        boxShadow: "0 20px 40px rgba(239, 68, 68, 0.12)",
        border: "1px solid #fecaca",
        textAlign: "center",
      }}>
        <div style={{
          fontSize: "56px",
          lineHeight: "1",
          marginBottom: "16px",
        }}>
          ⚠️
        </div>
        <h2 style={{
          fontSize: "20px",
          fontWeight: "800",
          color: "#991b1b",
          marginBottom: "8px",
        }}>
          कुछ गलत हो गया / Something Went Wrong
        </h2>
        <p style={{
          fontSize: "14px",
          color: "#64748b",
          lineHeight: "1.6",
          marginBottom: "24px",
        }}>
          एप्लिकेशन में अस्थायी तकनीकी समस्या आई है। कृपया दोबारा प्रयास करें।<br />
          An unexpected application error occurred. Please try again.
        </p>
        <div style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}>
          <button
            onClick={() => reset()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ef4444",
              color: "#ffffff",
              padding: "11px 22px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "700",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)",
            }}
          >
            🔄 पुनः प्रयास करें (Try Again)
          </button>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f1f5f9",
              color: "#334155",
              padding: "11px 22px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "700",
              textDecoration: "none",
              border: "1px solid #cbd5e1",
            }}
          >
            🏠 मुख्य पृष्ठ (Home)
          </Link>
        </div>
      </div>
    </div>
  );
}
