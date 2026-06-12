import Link from "next/link";
import {
  Star,
  Target,
  TrendingUp,
  ListChecks,
  CalendarCheck,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Card } from "@/components/ui/card";
import { IconBubble } from "@/components/ui/icon-bubble";
import { StatBlock } from "@/components/ui/stat-block";
import { MasteryRing } from "@/components/ui/mastery-ring";
import { MasteryBar } from "@/components/ui/mastery-bar";
import { BandChip } from "@/components/ui/band";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-card">
      <header className="border-b border-line">
        <nav className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
          <Logo />
          <div className="hidden items-center gap-8 text-[15px] font-medium text-ink-600 md:flex">
            <a href="#how" className="hover:text-ink-900">How it works</a>
            <a href="#subjects" className="hover:text-ink-900">Subjects</a>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-[15px] font-semibold text-ink-900">
              Log in
            </Link>
            <ButtonLink href="/signup">Get Started</ButtonLink>
          </div>
        </nav>
      </header>

      <main className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-20 lg:grid-cols-2">
        <div>
          <Pill>
            <Star size={14} className="fill-brand text-brand" />
            Built for the Philippine CPA Licensure Exam
          </Pill>
          <h1 className="mt-5 text-[44px] font-bold leading-[1.1] tracking-tight text-ink-900">
            Master Every Topic,
            <br />
            <span className="text-brand-gradient">Pass the Boards</span>
          </h1>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed">
            Know exactly where you stand on every CPALE syllabus topic. Practice
            with targeted quizzes, watch your mastery grow, and always know what
            to study next.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <ButtonLink href="/signup">
              <CalendarCheck size={18} />
              Start Reviewing Free
            </ButtonLink>
            <ButtonLink href="#how" variant="secondary">
              How it works
            </ButtonLink>
          </div>
          <div className="mt-12 flex gap-12">
            <StatBlock gradient value="6" label="Board subjects" />
            <StatBlock gradient value="69" label="Syllabus topics tracked" />
            <StatBlock gradient value="75%" label="Pass line, made visible" />
          </div>
        </div>

        {/* Floating-card collage echoing the brand reference */}
        <div className="relative hidden h-[520px] lg:block" id="how">
          <Card className="absolute left-0 top-8 w-64 shadow-float">
            <div className="text-[13px] font-medium uppercase tracking-wide text-ink-400">
              FAR readiness
            </div>
            <div className="mt-3 flex justify-center">
              <MasteryRing score={78} label="of 100" size={120} />
            </div>
          </Card>
          <Card className="absolute right-0 top-0 flex w-72 items-center gap-3 shadow-float">
            <IconBubble>
              <Target size={20} strokeWidth={1.75} />
            </IconBubble>
            <div>
              <div className="text-[15px] font-semibold text-ink-900">Topic mastery</div>
              <div className="text-[13px] text-ink-400">Scored on the 75 pass line</div>
            </div>
          </Card>
          <Card className="absolute right-6 top-44 w-80 shadow-float">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[15px] font-semibold text-ink-900">Leases</div>
              <BandChip band="proficient" />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <MasteryBar score={78} className="flex-1" />
              <span className="text-[15px] font-bold text-ink-900 tabular-nums">78</span>
            </div>
          </Card>
          <Card className="absolute bottom-24 left-8 flex w-72 items-center gap-3 shadow-float">
            <IconBubble className="bg-mastered-bg text-mastered">
              <TrendingUp size={20} strokeWidth={1.75} />
            </IconBubble>
            <div>
              <div className="text-[15px] font-semibold text-ink-900">Improvement first</div>
              <div className="text-[13px] text-ink-400">Weakest topics, one tap away</div>
            </div>
          </Card>
          <Card className="absolute bottom-0 right-10 flex w-64 items-center gap-3 shadow-float">
            <IconBubble className="bg-developing-bg text-developing">
              <ListChecks size={20} strokeWidth={1.75} />
            </IconBubble>
            <div>
              <div className="text-[15px] font-semibold text-ink-900">TOS-aligned</div>
              <div className="text-[13px] text-ink-400">Official exam weighting</div>
            </div>
          </Card>
        </div>
      </main>

      <section id="subjects" className="border-t border-line bg-page">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-[24px] font-semibold text-ink-900">
            All six board subjects, every TOS topic
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["FAR", "Financial Accounting & Reporting"],
              ["AFAR", "Advanced Financial Accounting & Reporting"],
              ["MAS", "Management Advisory Services"],
              ["AUD", "Auditing"],
              ["TAX", "Taxation"],
              ["RFBT", "Regulatory Framework for Business Transactions"],
            ].map(([code, name]) => (
              <Card key={code}>
                <div className="text-[13px] font-medium uppercase tracking-wide text-ink-400">
                  {code}
                </div>
                <div className="mt-1 text-[17px] font-semibold text-ink-900">{name}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-[13px] text-ink-400">
          <span>© 2026 SyllabusIQ</span>
          <span className="flex gap-5">
            <Link href="/privacy" className="hover:text-brand">Privacy</Link>
            <Link href="/terms" className="hover:text-brand">Terms</Link>
            <span className="hidden sm:inline">Made for CPALE reviewees</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
