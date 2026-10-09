import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1248a5",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://voterdesk.in"),
  title: "VoterDesk - Campaign & Voter Management",
  description: "Manage voter-list imports, booth teams, digital voter slips and live campaign field operations.",
  applicationName: "VoterDesk",
  keywords: ["VoterDesk", "Election Campaign", "Booth Management", "Voter Slip", "मतदाता पर्ची", "Electoral Roll"],
  manifest: "/manifest.json",
  openGraph: {
    title: "VoterDesk - Campaign & Voter Management",
    description: "Manage voter-list imports, booth teams, digital voter slips and live campaign field operations.",
    type: "website",
    siteName: "VoterDesk",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "VoterDesk Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "VoterDesk - Campaign & Voter Management",
    description: "Manage voter-list imports, booth teams, digital voter slips and live campaign field operations.",
    images: ["/icon-512.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VoterDesk",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "format-detection": "telephone=no",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
