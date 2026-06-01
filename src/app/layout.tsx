import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'SyllabusIQ — Board Exam Tracker',
  description: 'Adaptive progress tracker for Philippine board exam reviewers. Track coverage, mastery, and schedule — offline-first PWA.',
  keywords: ['CPALE', 'CPA board exam', 'Philippine board exam', 'study tracker', 'PWA'],
  authors: [{ name: 'SyllabusIQ' }],
  openGraph: {
    title: 'SyllabusIQ',
    description: 'Adaptive board exam progress tracker',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
