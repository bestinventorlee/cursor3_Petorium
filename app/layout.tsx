import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "@/components/Navbar";
import BottomNavigation from "@/components/BottomNavigation";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import RegisterServiceWorker from "./register-sw";
import { DM_Sans, Syne } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});

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
  themeColor: "#FF6B6B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${dmSans.variable} ${syne.variable} font-sans antialiased bg-[#050505] text-[#f5f5f5]`}
      >
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

