import { Star, Wifi, Check } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { BandChip } from "@/components/ui/band";
import { IconBubble } from "@/components/ui/icon-bubble";
import { StatBlock } from "@/components/ui/stat-block";
import { MasteryBar } from "@/components/ui/mastery-bar";
import { MasteryRing } from "@/components/ui/mastery-ring";
import { TrendStrip } from "@/components/ui/trend-strip";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Band } from "@/lib/types";

const BANDS: Band[] = ["not-started", "learning", "developing", "proficient", "mastered"];

/** Living reference for the kit (DESIGN.md §6) — every component on one page. */
export default function Styleguide() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-12">
      <Logo />

      <section>
        <h2 className="mb-4 text-[24px] font-semibold text-ink-900">Typography</h2>
        <h1 className="text-[40px] font-bold tracking-tight text-ink-900">
          Display headline with <span className="text-brand-gradient">one gradient word</span>
        </h1>
        <h2 className="mt-2 text-[24px] font-semibold text-ink-900">Section heading</h2>
        <h3 className="mt-2 text-[17px] font-semibold text-ink-900">Card title</h3>
        <p className="mt-2 text-[15px]">Body text in ink-600 with relaxed leading.</p>
        <p className="mt-1 text-[13px] font-medium uppercase tracking-wide text-ink-400">
          Eyebrow caption
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-[24px] font-semibold text-ink-900">Buttons</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost link →</Button>
          <Button disabled>Disabled</Button>
          <ButtonLink href="#">Link as button</ButtonLink>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[24px] font-semibold text-ink-900">Pills & bands</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Pill>
            <Star size={14} className="fill-brand text-brand" /> Brand pill
          </Pill>
          {BANDS.map((b) => (
            <BandChip key={b} band={b} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[24px] font-semibold text-ink-900">Mastery visuals</h2>
        <div className="flex flex-wrap items-center gap-10">
          {[15, 45, 68, 78, 92].map((s) => (
            <MasteryRing key={s} score={s} size={84} />
          ))}
        </div>
        <div className="mt-6 max-w-md space-y-4">
          {[15, 45, 68, 78, 92].map((s) => (
            <MasteryBar key={s} score={s} />
          ))}
        </div>
        <div className="mt-6">
          <TrendStrip results={[true, true, false, true, false, true, true, true, false, true]} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[24px] font-semibold text-ink-900">Cards & stats</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="flex items-center gap-3">
            <IconBubble>
              <Wifi size={20} strokeWidth={1.75} />
            </IconBubble>
            <div>
              <div className="text-[15px] font-semibold text-ink-900">Feature card</div>
              <div className="text-[13px] text-ink-400">Icon bubble pattern</div>
            </div>
          </Card>
          <Card interactive className="flex items-center gap-3">
            <IconBubble className="bg-mastered-bg text-mastered">
              <Check size={20} strokeWidth={1.75} />
            </IconBubble>
            <div>
              <div className="text-[15px] font-semibold text-ink-900">Interactive card</div>
              <div className="text-[13px] text-ink-400">Hover lifts</div>
            </div>
          </Card>
          <Card>
            <StatBlock gradient value="5,000+" label="Gradient stat" />
          </Card>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[24px] font-semibold text-ink-900">Forms</h2>
        <div className="max-w-sm space-y-4">
          <div>
            <Label htmlFor="sg-input">Label</Label>
            <Input id="sg-input" placeholder="Placeholder text" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[24px] font-semibold text-ink-900">States</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-4/5" />
          </Card>
          <Card>
            <EmptyState
              icon={<Star size={28} strokeWidth={1.75} />}
              title="Empty state"
              body="One-line explanation with a single clear action."
              action={<Button>Do the thing</Button>}
            />
          </Card>
        </div>
      </section>
    </div>
  );
}
