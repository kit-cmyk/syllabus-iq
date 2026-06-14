import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles email-confirmation (and future OAuth) redirects.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  // only same-origin paths — never redirect off-site
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Seed the exam date captured at signup into user_stats (once; idempotent).
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const examDate = user?.user_metadata?.exam_date as string | null | undefined;
      if (user && examDate) {
        await supabase
          .from("user_stats")
          .upsert({ user_id: user.id, exam_date: examDate }, { onConflict: "user_id" });
      }
      return NextResponse.redirect(`${origin}${target}`);
    }
  }
  return NextResponse.redirect(`${origin}/login`);
}
