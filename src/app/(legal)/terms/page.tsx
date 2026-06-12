export const metadata = { title: "Terms of Service — SyllabusIQ" };

export default function TermsPage() {
  return (
    <>
      <h1 className="text-[32px] font-bold text-ink-900">Terms of Service</h1>
      <p className="text-[13px] text-ink-400">Last updated: June 12, 2026</p>

      <h2>What SyllabusIQ is</h2>
      <p>
        SyllabusIQ is a self-study tool for CPALE reviewees: practice questions,
        study materials, mastery tracking, mock exams, and a review queue. It is
        an independent product — not affiliated with, or endorsed by, the
        Professional Regulation Commission or the Board of Accountancy.
      </p>

      <h2>No guarantee of results</h2>
      <p>
        Readiness scores, mastery bands, and pass estimates are study aids
        computed from your own practice data. They are not predictions or
        guarantees of your actual board exam result.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You&apos;re responsible for keeping your password safe.</li>
        <li>One account per person; don&apos;t share accounts.</li>
        <li>Don&apos;t scrape, redistribute, or resell question content or materials.</li>
      </ul>

      <h2>Content accuracy</h2>
      <p>
        We work to keep questions, explanations, and materials aligned with
        current standards and the official syllabus, but errors can occur.
        Always cross-check against your official review materials. If you spot
        an error, tell us at{" "}
        <a href="mailto:kit@assembledsystems.com">kit@assembledsystems.com</a>.
      </p>

      <h2>Termination</h2>
      <p>
        You may delete your account at any time. We may suspend accounts that
        abuse the service (scraping, sharing, attacking the platform).
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the Republic of the Philippines.</p>
    </>
  );
}
