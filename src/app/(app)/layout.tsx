import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { manilaToday } from "@/lib/dates";
import { Logo } from "@/components/logo";
import { SidebarNav, BottomTabs } from "@/components/shell/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count } = await supabase
    .from("review_items")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("cleared", false)
    .lte("due_at", manilaToday());
  const reviewDue = count ?? 0;

  const name =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Reviewer";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-card p-5 md:flex">
        <Logo href="/dashboard" />
        <div className="mt-8 flex-1">
          <SidebarNav reviewDue={reviewDue} />
        </div>
        <div className="flex items-center gap-3 border-t border-line pt-4">
          <a
            href="/settings"
            className="flex min-w-0 flex-1 items-center gap-3"
            title="Account settings"
          >
            <span className="bg-tint flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-brand">
              {initial}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-600 hover:text-brand">
              {name}
            </span>
          </a>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title="Sign out"
              className="text-ink-400 transition-colors hover:text-ink-900"
            >
              <LogOut size={18} strokeWidth={1.75} />
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-10 md:pb-12 md:pt-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      <BottomTabs reviewDue={reviewDue} />
    </div>
  );
}
