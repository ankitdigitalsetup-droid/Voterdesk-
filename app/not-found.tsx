import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
      padding: "24px",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        maxWidth: "480px",
        width: "100%",
        background: "#ffffff",
        borderRadius: "16px",
        padding: "36px 28px",
        boxShadow: "0 20px 40px rgba(2, 132, 199, 0.12)",
        border: "1px solid #bae6fd",
        textAlign: "center",
      }}>
        <div style={{
          fontSize: "64px",
          fontWeight: "900",
          color: "#0284c7",
          lineHeight: "1",
          marginBottom: "12px",
        }}>
          404
        </div>
        <h2 style={{
          fontSize: "20px",
          fontWeight: "800",
          color: "#0f172a",
          marginBottom: "8px",
        }}>
          पेज नहीं मिला / Page Not Found
        </h2>
        <p style={{
          fontSize: "14px",
          color: "#64748b",
          lineHeight: "1.6",
          marginBottom: "24px",
        }}>
          आप जिस पेज की तलाश कर रहे हैं वह मौजूद नहीं है या हटा दिया गया है।<br />
          The requested page does not exist or has been moved.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: "#0284c7",
            color: "#ffffff",
            padding: "12px 28px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: "700",
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
            transition: "all 0.2s ease",
          }}
        >
          🏠 मुख्य पृष्ठ पर लौटें (Go to Home)
        </Link>
      </div>
    </div>
  );
}
