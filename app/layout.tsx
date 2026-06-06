import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ProfileProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "Etihad Speaking Room AI Trainer",
  description:
    "Turn Your Voice Into Influence. Your personal AI coach for speaking, communication, confidence, and power skills.",
};

export const viewport: Viewport = {
  themeColor: "#05070a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root {
            --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
            --font-mono: "JetBrains Mono", ui-monospace, monospace;
          }
        `}</style>
      </head>
      <body className="lab-bg scanlines min-h-screen">
        <ProfileProvider>{children}</ProfileProvider>
      </body>
    </html>
  );
}
