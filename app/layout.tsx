import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";
import BottomNavigation from "@/components/BottomNavigation";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import RegisterServiceWorker from "./register-sw";

export const metadata: Metadata = {
  title: "Petorium - Short Video Platform",
  description: "A modern short-form video content platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Petorium",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <RegisterServiceWorker />
          <WebVitalsReporter />
          <Navbar />
          <main className="pb-16 md:pb-0">{children}</main>
          <BottomNavigation />
          <PWAInstallPrompt />
        </Providers>
      </body>
    </html>
  );
}

