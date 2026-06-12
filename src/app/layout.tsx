import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SyllabusIQ — Master every CPALE topic",
  description:
    "Mastery tracking and self-testing for CPALE reviewers. Know exactly where you stand on every syllabus topic, and always know what to study next.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      {/* suppressHydrationWarning: browser extensions (ClickUp, Grammarly) inject
          attributes into <body> before React hydrates; that's theirs, not ours. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
