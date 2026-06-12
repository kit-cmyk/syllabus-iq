"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Library,
  PencilLine,
  Timer,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/cn";

// mobile: false keeps the bottom tab bar at five core destinations;
// Achievements stays reachable on phones via the dashboard card.
const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/subjects", label: "Subjects", icon: Library, mobile: true },
  { href: "/practice", label: "Practice", icon: PencilLine, mobile: true },
  { href: "/mocks", label: "Mock Exams", icon: Timer, mobile: true },
  { href: "/review", label: "Review", icon: RotateCcw, mobile: true },
  { href: "/achievements", label: "Achievements", icon: Trophy, mobile: false },
] as const;

export function SidebarNav({ reviewDue = 0 }: { reviewDue?: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-[var(--radius-control)] px-3.5 py-2.5 text-[15px] font-medium transition-colors",
            pathname.startsWith(href)
              ? "bg-tint text-brand"
              : "text-ink-600 hover:bg-page hover:text-ink-900"
          )}
        >
          <Icon size={20} strokeWidth={1.75} />
          {label}
          {href === "/review" && reviewDue > 0 && (
            <span className="bg-brand ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
              {reviewDue}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

export function BottomTabs({ reviewDue = 0 }: { reviewDue?: number }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-card md:hidden">
      {items.filter((i) => i.mobile).map(({ href, label, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          className={cn(
            "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
            pathname.startsWith(href) ? "text-brand" : "text-ink-400"
          )}
        >
          <span className="relative">
            <Icon size={20} strokeWidth={1.75} />
            {href === "/review" && reviewDue > 0 && (
              <span className="bg-brand absolute -right-2.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-4 text-white tabular-nums">
                {reviewDue}
              </span>
            )}
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
