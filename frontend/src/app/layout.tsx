import { ReactNode } from "react";
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";

import "./globals.css";

const montserrat = Montserrat({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "n.Solve | ness. Vulnerability Lifecycle Manager",
  description: "Professional vulnerability lifecycle management platform powered by ness.",
  keywords: ["vulnerability", "security", "pentest", "lifecycle", "management", "ness"],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className="dark"
      suppressHydrationWarning
    >
      <head>
        <style>{`
          :root {
            --font-montserrat: ${montserrat.style.fontFamily};
          }
        `}</style>
      </head>
      <body className={`${montserrat.className} min-h-screen antialiased bg-[#0B0C0E] text-[#EEF1F6]`}>
        <PreferencesStoreProvider themeMode="dark" themePreset="default">
          {children}
          <Toaster 
            theme="dark"
            toastOptions={{
              style: {
                background: '#111317',
                border: '1px solid #1B2030',
                color: '#EEF1F6',
              },
            }}
          />
        </PreferencesStoreProvider>
      </body>
    </html>
  );
}
