import { requireUser } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: stats } = await supabase
    .from("user_stats")
    .select("daily_goal")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" />
      <SettingsForm
        email={user.email ?? ""}
        fullName={(user.user_metadata?.full_name as string | undefined) ?? ""}
        dailyGoal={stats?.daily_goal ?? 20}
      />
    </>
  );
}
