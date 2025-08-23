import type { Metadata } from "next";
import { Work_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { GlobalNav } from "@/components/navigation/global-nav";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { Providers } from "@/lib/providers";
import { Toaster } from "sonner";

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "triberspace",
  description: "A new dimension.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark overflow-hidden">
      <body
        className={`${workSans.variable} ${geistMono.variable} font-sans antialiased h-screen overflow-hidden`}
      >
        <Providers>
          <div className="flex h-full flex-col">
            <GlobalNav />
            <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
              <div className="flex flex-1 overflow-hidden">
                <AppSidebar />
                <main className="flex-1 overflow-y-auto">
                  {children}
                </main>
              </div>
              <MobileBottomNav className="md:hidden" />
            </div>
          </div>
        </Providers>
        <Toaster theme="dark" />
      </body>
    </html>
  );
}
