import Link from 'next/link'
import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <WifiOff className="h-16 w-16 text-muted-foreground mb-6" />
      <h1 className="text-2xl font-bold text-foreground mb-2">You&apos;re offline</h1>
      <p className="text-muted-foreground max-w-sm">
        No internet connection detected. Your study sessions are saved locally and will sync automatically when you reconnect.
      </p>
      <div className="mt-8 space-y-3">
        <p className="text-sm text-muted-foreground">You can still:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>✓ Browse your syllabus tree</li>
          <li>✓ Log study sessions (synced later)</li>
          <li>✓ View your dashboard</li>
        </ul>
      </div>
      <Link
        href="/syllabus"
        className="mt-8 rounded-full bg-brand-persian px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-ocean transition-colors"
      >
        Continue Studying
      </Link>
    </div>
  )
}
