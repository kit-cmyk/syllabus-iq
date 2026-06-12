import Link from "next/link";
import { Sparkles, Flame, Clock, RotateCcw, Settings, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser, getSyllabusOverview } from "@/lib/queries";
import { manilaToday } from "@/lib/dates";
import { readinessStatus, PASS_LINE, SUBJECT_FLOOR } from "@/lib/mastery";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { BandChip } from "@/components/ui/band";
import { MasteryBar } from "@/components/ui/mastery-bar";
import { StatBlock } from "@/components/ui/stat-block";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";

const STATUS_META = {
  PASS: { label: "On track to pass", cls: "bg-mastered-bg text-mastered" },
  CONDITIONAL: { label: "Conditional zone", cls: "bg-developing-bg text-developing" },
  NOT_YET: { label: "Not there yet", cls: "bg-notstarted-bg text-notstarted" },
} as const;

function manilaDay(d: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
    new Date(d)
  );
}

function sinceISO(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

/** Request-time activity stats (server component; clock reads live here, not in render math). */
function activityStats(attempts: { created_at: string }[]) {
  const nowMs = Date.now();
  const ageMs = (a: { created_at: string }) => nowMs - new Date(a.created_at).getTime();
  const week = attempts.filter((a) => ageMs(a) < 7 * 86400_000).length;
  const prevWeek = attempts.filter(
    (a) => ageMs(a) >= 7 * 86400_000 && ageMs(a) < 14 * 86400_000
  ).length;

  const daysWithActivity = new Set(attempts.map((a) => manilaDay(a.created_at)));
  let streak = 0;
  for (let i = 0; ; i++) {
    const day = manilaDay(new Date(nowMs - i * 86400_000));
    if (daysWithActivity.has(day)) streak++;
    else if (i === 0) continue; // today can still be earned
    else break;
  }
  return { week, prevWeek, streak };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [
    subjects,
    { data: recentAttempts },
    { data: snapshots },
    { data: openSessions },
    { count: reviewDueCount },
    { data: mockRows },
  ] = await Promise.all([
    getSyllabusOverview(user.id),
    supabase
      .from("attempts")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", sinceISO(60))
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("readiness_snapshots")
      .select("day, overall")
      .eq("user_id", user.id)
      .order("day", { ascending: true })
      .limit(60),
    // latest unfinished session, so an abandoned quiz is never orphaned
    supabase
      .from("quiz_sessions")
      .select("id, type, subject_id, question_count, started_at")
      .eq("user_id", user.id)
      .is("completed_at", null)
      .order("started_at", { ascending: false })
      .limit(1),
    supabase
      .from("review_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("cleared", false)
      .lte("due_at", manilaToday()),
    supabase
      .from("quiz_sessions")
      .select("subject_id, score_pct")
      .eq("user_id", user.id)
      .eq("type", "mock")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false }),
  ]);

  const reviewDue = reviewDueCount ?? 0;
  const lastMock = new Map<string, number>();
  for (const m of mockRows ?? []) {
    if (!lastMock.has(m.subject_id))
      lastMock.set(m.subject_id, Math.round(Number(m.score_pct)));
  }

  const open = openSessions?.[0] ?? null;
  let openInfo: { href: string; label: string; progress: string } | null = null;
  if (open) {
    const { count: answeredCount } = await supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("session_id", open.id);
    const subjCode = subjects.find((s) => s.id === open.subject_id)?.code;
    openInfo = {
      href: open.type === "mock" ? `/mocks/${open.id}` : `/quiz/${open.id}`,
      label:
        open.type === "mock"
          ? `${subjCode ?? ""} mock exam in progress`
          : open.type === "review"
            ? "Review session in progress"
            : `${subjCode ?? ""} practice in progress`,
      progress: `${answeredCount ?? 0} of ${open.question_count} answered`,
    };
  }

  const firstName =
    ((user.user_metadata?.full_name as string | undefined) ?? "Reviewer").split(" ")[0];

  const hasAnyAttempt = (recentAttempts ?? []).length > 0 ||
    subjects.some((s) => s.attempted);

  const settingsLink = (
    <Link href="/settings" title="Settings" className="text-ink-400 hover:text-brand">
      <Settings size={20} strokeWidth={1.75} />
    </Link>
  );

  const resumeBanner = openInfo && (
    <Link href={openInfo.href}>
      <Card interactive className="mb-5 flex items-center gap-4 border border-brand/30 bg-tint/40">
        <span className="bg-brand-gradient flex size-11 shrink-0 items-center justify-center rounded-full text-white">
          <ArrowRight size={20} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-ink-900">{openInfo.label}</div>
          <div className="text-[13px] text-ink-600">
            {openInfo.progress} — pick up where you left off
          </div>
        </div>
        <span className="shrink-0 text-[13px] font-semibold text-brand">Continue →</span>
      </Card>
    </Link>
  );

  if (!hasAnyAttempt) {
    return (
      <>
        <PageHeader eyebrow={`Welcome, ${firstName}`} title="Dashboard" action={settingsLink} />
        {resumeBanner}
        <Card>
          <EmptyState
            icon={<Sparkles size={28} strokeWidth={1.75} />}
            title="Let's find your baseline"
            body="Take a 10-question quiz in any subject to light up your dashboard — mastery scores, readiness, and your weakest topics all start from your first session."
            action={<ButtonLink href="/practice">Take your first quiz</ButtonLink>}
          />
        </Card>
      </>
    );
  }

  // ----- readiness -----
  const subjectScores = subjects.map((s) => s.readiness);
  const overall = Math.round(
    subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length
  );
  const status = readinessStatus(subjectScores);
  const blocking = subjects.filter((s) => s.readiness < SUBJECT_FLOOR);
  const statusDetail =
    status === "PASS"
      ? "Average above 75 with every subject clear of the 65 floor."
      : blocking.length > 0
        ? `${blocking.map((s) => s.code).join(", ")} ${blocking.length === 1 ? "is" : "are"} below the 65 floor.`
        : "Lift more subjects past the 75 line to reach passing.";

  // ----- improvement sections -----
  const allTopics = subjects.flatMap((s) =>
    s.topics.map((t) => ({ ...t, subjectCode: s.code }))
  );
  const weakest = allTopics
    .filter((t) => t.band !== "not-started")
    .sort((a, b) => a.mastery - b.mastery || Number(b.stale) - Number(a.stale))
    .slice(0, 5);
  const notStartedCount = allTopics.filter((t) => t.band === "not-started").length;

  // ----- activity -----
  const { week, prevWeek, streak } = activityStats(recentAttempts ?? []);

  return (
    <>
      <PageHeader eyebrow={`Welcome back, ${firstName}`} title="Dashboard" action={settingsLink} />

      {resumeBanner}

      {/* Readiness header */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-start gap-8">
          <div>
            <div className="text-[13px] font-medium uppercase tracking-wide text-ink-400">
              Exam readiness
            </div>
            <div className="text-brand-gradient text-[56px] font-bold leading-none tabular-nums">
              {overall}
            </div>
            <span
              className={cn(
                "mt-2 inline-flex rounded-full px-3 py-1 text-[13px] font-semibold",
                STATUS_META[status].cls
              )}
            >
              {STATUS_META[status].label}
            </span>
            <p className="mt-2 max-w-55 text-[13px] text-ink-400">{statusDetail}</p>
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {subjects.map((s) => (
              <Link key={s.id} href={`/subjects/${s.code.toLowerCase()}`} className="group">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] font-semibold text-ink-600 group-hover:text-brand">
                    {s.code}
                  </span>
                  <span className="text-[15px] font-bold text-ink-900 tabular-nums">
                    {s.attempted ? s.readiness : "–"}
                  </span>
                </div>
                <MasteryBar
                  score={s.readiness}
                  hasAttempts={s.attempted}
                  className="mt-1.5"
                />
                {lastMock.has(s.id) && (
                  <div className="mt-1 text-[11px] text-ink-400 tabular-nums">
                    last mock: {lastMock.get(s.id)}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
        <p className="mt-4 border-t border-line pt-3 text-[12px] text-ink-400">
          Pass needs a {PASS_LINE} average with no subject below {SUBJECT_FLOOR}. Untouched
          topics count as zero — readiness is earned, not assumed.
        </p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Focus next */}
        <Card className="lg:col-span-7">
          <h3 className="text-[17px] font-semibold text-ink-900">Focus next</h3>
          <p className="text-[13px] text-ink-400">
            Your weakest attempted topics — highest payoff per hour of review.
          </p>
          <div className="mt-4 space-y-2">
            {weakest.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-[var(--radius-control)] border border-line p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase text-ink-400">
                      {t.subjectCode}
                    </span>
                    {t.stale && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-developing-bg px-2 py-0.5 text-[11px] font-medium text-developing">
                        <Clock size={11} /> Stale
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[14px] font-medium text-ink-900">
                    {t.name}
                  </div>
                </div>
                <BandChip band={t.band} />
                <span className="w-7 text-right text-[15px] font-bold text-ink-900 tabular-nums">
                  {t.mastery}
                </span>
                <Link
                  href={`/practice?subject=${t.subjectCode.toLowerCase()}&topic=${t.id}`}
                  className="shrink-0 text-[13px] font-semibold text-brand hover:underline"
                >
                  Practice now
                </Link>
              </div>
            ))}
          </div>
          {notStartedCount > 0 && (
            <p className="mt-4 text-[13px] text-ink-400">
              Plus <strong className="text-ink-600">{notStartedCount} topics not started</strong> —{" "}
              <Link href="/subjects" className="font-semibold text-brand">
                see coverage gaps →
              </Link>
            </p>
          )}
        </Card>

        {/* Right rail: review due + trend + activity */}
        <div className="space-y-5 lg:col-span-5">
          {reviewDue > 0 && (
            <Card className="bg-tint/60">
              <div className="flex items-center gap-4">
                <span className="bg-brand flex size-11 shrink-0 items-center justify-center rounded-full text-white">
                  <RotateCcw size={20} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-ink-900">
                    {reviewDue} review{reviewDue === 1 ? "" : "s"} due today
                  </div>
                  <div className="text-[13px] text-ink-600">
                    Questions you missed, back at the right time.
                  </div>
                </div>
                <Link
                  href="/review"
                  className="shrink-0 text-[13px] font-semibold text-brand hover:underline"
                >
                  Review →
                </Link>
              </div>
            </Card>
          )}
          <Card>
            <h3 className="text-[17px] font-semibold text-ink-900">Readiness trend</h3>
            {(snapshots ?? []).length >= 2 ? (
              <Sparkline
                points={(snapshots ?? []).map((s) => Number(s.overall))}
              />
            ) : (
              <p className="mt-2 text-[13px] text-ink-400">
                Your trend line starts after a couple of days of practice. Keep going.
              </p>
            )}
          </Card>
          <Card>
            <h3 className="text-[17px] font-semibold text-ink-900">This week</h3>
            <div className="mt-4 flex items-end gap-8">
              <StatBlock value={week} label="Questions answered" />
              <StatBlock
                value={prevWeek === 0 ? "—" : `${week >= prevWeek ? "+" : ""}${week - prevWeek}`}
                label="vs last week"
              />
              <div className="ml-auto flex items-center gap-2 rounded-full bg-developing-bg px-3.5 py-1.5">
                <Flame size={16} className="text-developing" />
                <span className="text-[15px] font-bold text-developing tabular-nums">
                  {streak}
                </span>
                <span className="text-[13px] font-medium text-developing">
                  day{streak === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/** Dependency-free violet sparkline for the 30-day readiness trend. */
function Sparkline({ points }: { points: number[] }) {
  const w = 320;
  const h = 80;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points.map(
    (p, i) => [i * step, h - ((p - min) / range) * (h - 8) - 4] as const
  );
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h + 4}`} className="mt-3 w-full">
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6d5bf6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6d5bf6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${w},${h + 4} L0,${h + 4} Z`} fill="url(#spark)" />
      <path d={path} fill="none" stroke="#6d5bf6" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
