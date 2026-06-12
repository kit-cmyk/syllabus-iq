import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { MasteryRing } from "@/components/ui/mastery-ring";
import { MasteryBar } from "@/components/ui/mastery-bar";
import { BandChip } from "@/components/ui/band";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[45%_55%]">
      <div className="flex flex-col bg-card px-8 py-10 lg:px-16">
        <Logo />
        <div className="flex flex-1 flex-col justify-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* Brand panel: a preview of what's inside (DESIGN.md Phase 0 blueprint) */}
      <div className="relative hidden items-center justify-center bg-tint lg:flex">
        <div className="relative h-[420px] w-[420px]">
          <Card className="absolute left-0 top-0 w-60 shadow-float">
            <div className="text-[13px] font-medium uppercase tracking-wide text-ink-400">
              Exam readiness
            </div>
            <div className="mt-3 flex justify-center">
              <MasteryRing score={76} label="of 100" size={120} />
            </div>
          </Card>
          <Card className="absolute bottom-16 right-0 w-72 shadow-float">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[15px] font-semibold text-ink-900">
                FAR · Leases
              </div>
              <BandChip band="proficient" />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <MasteryBar score={78} className="flex-1" />
              <span className="text-[15px] font-bold text-ink-900 tabular-nums">
                78
              </span>
            </div>
          </Card>
          <Card className="absolute bottom-0 left-10 w-56 shadow-float">
            <div className="text-[15px] font-semibold text-ink-900">
              Master every topic,
            </div>
            <div className="text-[15px] font-semibold text-brand-gradient">
              pass the boards.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
