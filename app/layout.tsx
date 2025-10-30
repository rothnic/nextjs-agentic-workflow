import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead Processing Agent",
  description: "AI-powered lead validation, enrichment, and scoring with real-time workflow tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
