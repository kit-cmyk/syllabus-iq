import { Award, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/queries";
import {
  BADGES,
  LEVEL_TITLES,
  levelFromXp,
  levelProgress,
  xpForLevel,
  MAX_LEVEL,
} from "@/lib/gamification";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { cn } from "@/lib/cn";

export default async function AchievementsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: stats }, { data: earned }] = await Promise.all([
    supabase
      .from("user_stats")
      .select("xp, level")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_badges")
      .select("badge_id, earned_at")
      .eq("user_id", user.id),
  ]);

  const xp = stats?.xp ?? 0;
  const level = stats?.level ?? levelFromXp(xp);
  const earnedAt = new Map((earned ?? []).map((b) => [b.badge_id, b.earned_at]));

  return (
    <>
      <PageHeader eyebrow="Achievements" title="Your journey" />

      <Card className="mb-6 flex flex-wrap items-center gap-6">
        <ProgressRing fraction={levelProgress(xp)} size={96} stroke={8}>
          <span className="text-[28px] font-bold text-ink-900 tabular-nums">{level}</span>
        </ProgressRing>
        <div>
          <div className="text-[20px] font-bold text-ink-900">{LEVEL_TITLES[level]}</div>
          <div className="text-[14px] text-ink-400 tabular-nums">
            {xp.toLocaleString()} XP
            {level < MAX_LEVEL &&
              ` — ${(xpForLevel(level + 1) - xp).toLocaleString()} more to ${LEVEL_TITLES[level + 1]}`}
          </div>
          <div className="mt-1 text-[12px] text-ink-400">
            XP comes from answering (5–10 each), clearing reviews (40), leveling
            topics up (100–200), mocks (150), and your daily goal (50).
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BADGES.map((badge) => {
          const when = earnedAt.get(badge.id);
          return (
            <Card
              key={badge.id}
              className={cn("flex items-center gap-4", !when && "opacity-70")}
            >
              <span
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-full",
                  when ? "bg-developing-bg text-developing" : "bg-notstarted-bg text-notstarted"
                )}
              >
                {when ? (
                  <Award size={22} strokeWidth={1.75} />
                ) : (
                  <Lock size={20} strokeWidth={1.75} />
                )}
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-ink-900">{badge.name}</div>
                <div className="text-[13px] text-ink-400">{badge.description}</div>
                {when && (
                  <div className="mt-0.5 text-[11px] font-medium text-developing">
                    Earned{" "}
                    {new Intl.DateTimeFormat("en-PH", {
                      timeZone: "Asia/Manila",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(when))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
