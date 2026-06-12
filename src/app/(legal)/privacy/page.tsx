export const metadata = { title: "Privacy Policy — SyllabusIQ" };

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-[32px] font-bold text-ink-900">Privacy Policy</h1>
      <p className="text-[13px] text-ink-400">Last updated: June 12, 2026</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data</strong> — your name, email address, and password (stored hashed by our authentication provider, Supabase).</li>
        <li><strong>Study data</strong> — your quiz answers, scores, topic mastery, review schedule, and study activity. This is the product: it exists so the app can show you your own progress.</li>
      </ul>

      <h2>What we use it for</h2>
      <p>
        Only to operate SyllabusIQ for you: computing your mastery scores,
        readiness estimates, and review queue. We do not sell your data, share it
        with advertisers, or use it for any purpose unrelated to your review.
      </p>

      <h2>Where it lives</h2>
      <p>
        Data is stored with Supabase (Postgres) with row-level security: your
        study records are readable and writable only by your own account. The
        app is hosted on Vercel.
      </p>

      <h2>Your rights</h2>
      <p>
        Consistent with the Philippine Data Privacy Act of 2012 (RA 10173), you
        may request a copy of your data or ask us to delete your account and all
        associated records. Email{" "}
        <a href="mailto:kit@assembledsystems.com">kit@assembledsystems.com</a>{" "}
        and we&apos;ll process it promptly.
      </p>

      <h2>Cookies</h2>
      <p>
        We use only the session cookies required to keep you signed in. No
        third-party tracking or analytics cookies.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes materially, we&apos;ll note the new date above
        and flag it in the app.
      </p>
    </>
  );
}
