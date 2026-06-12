import { requireUser } from "@/lib/queries";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" />
      <SettingsForm
        email={user.email ?? ""}
        fullName={(user.user_metadata?.full_name as string | undefined) ?? ""}
      />
    </>
  );
}
