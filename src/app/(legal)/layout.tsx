import Link from "next/link";
import { Logo } from "@/components/logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-card">
      <header className="border-b border-line">
        <nav className="mx-auto flex h-[72px] max-w-3xl items-center justify-between px-6">
          <Logo />
          <Link href="/login" className="text-[15px] font-semibold text-ink-900">
            Log in
          </Link>
        </nav>
      </header>
      <main className="prose-siq mx-auto max-w-3xl px-6 py-12">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-3xl items-center gap-6 px-6 py-8 text-[13px] text-ink-400">
          <span>© 2026 SyllabusIQ</span>
          <Link href="/privacy" className="hover:text-brand">Privacy</Link>
          <Link href="/terms" className="hover:text-brand">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
