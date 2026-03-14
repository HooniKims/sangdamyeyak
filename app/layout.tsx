import type { Metadata, Viewport } from "next";
import "./globals.css";
import AnnualGradeClassUpdateGate from "@/components/AnnualGradeClassUpdateGate";
import { AuthProvider } from "@/components/AuthContext";
import { LanguageProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "상담 예약 도우미 - 학부모 커뮤니케이션 플랫폼",
  description: "교사와 학부모를 위한 상담 예약 전용 플랫폼",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "상담 예약 도우미",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <AuthProvider>
          <LanguageProvider>
            <AnnualGradeClassUpdateGate />
            {children}
          </LanguageProvider>
        </AuthProvider>
        {/* Service Worker 등록 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw-v2.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
