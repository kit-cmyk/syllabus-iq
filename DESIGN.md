# SyllabusIQ — UI Design Plan

Companion to [PLAN.md](PLAN.md). Defines the brand system and the layout of every screen in Phases 0–5, so every component is consistent and on-brand from the first commit. Visual direction: clean white canvas, violet→pink gradient as the single accent, soft rounded cards with gentle shadows, generous whitespace, big confident numerals.

---

## 1. Brand foundations (design tokens)

All tokens live in `tailwind.config.ts` + `globals.css` once, in Phase 0. No component ever uses a raw hex value.

### Color

```
--brand-violet:   #6D5BF6      /* primary; icons, links, active states */
--brand-pink:     #C44BD9      /* gradient end only — never used alone */
--brand-gradient: linear-gradient(95deg, #6D5BF6 0%, #C44BD9 100%)

--ink-900: #0F172A    /* headlines */
--ink-600: #475569    /* body text */
--ink-400: #94A3B8    /* captions, placeholders, disabled */

--surface-page: #F8F9FB   /* app background */
--surface-card: #FFFFFF   /* all cards */
--border:       #E8EAF0   /* hairlines, input borders */

--violet-50:  #F0EEFE     /* badge/pill backgrounds, hover tints, selected states */
```

**Semantic colors** (mastery bands + feedback — the only colors besides brand):

```
--mastered:   #10B981  on #ECFDF5   /* green  — score ≥ 85 / correct answers */
--proficient: #6D5BF6  on #F0EEFE   /* violet — 75–84 (passing = brand color, on purpose) */
--developing: #F59E0B  on #FFFBEB   /* amber  — 60–74 */
--learning:   #F43F5E  on #FFF1F2   /* rose   — < 60 / wrong answers */
--notstarted: #94A3B8  on #F1F5F9   /* slate  — untouched topics */
```

Rules: the gradient appears only on (1) primary buttons, (2) one highlighted word per headline, (3) hero stat numerals, (4) the logo tile. Everything else uses flat `--brand-violet` or semantic colors. This restraint is what makes the reference look premium.

### Typography

- **Font:** Inter (variable), system fallback. One font for everything.
- Display (page hero): 40/48 bold, tight tracking, `ink-900`; one keyword may take the gradient via `bg-clip-text`.
- H2 section: 24 semibold · H3 card title: 17 semibold · Body: 15 regular `ink-600` · Caption/label: 13 medium `ink-400`, sometimes uppercase tracking-wide.
- Big numerals (scores, stats): 32–40 bold, tabular-nums.

### Shape, depth, spacing

- Radius: cards **16px**, buttons/inputs **12px**, pills/badges **full**, tiny chips 8px.
- Shadows: cards `0 1px 3px rgb(15 23 42 / .06)`; floating/hover `0 8px 30px rgb(15 23 42 / .10)`. Never harsh borders + heavy shadow together — cards are shadow-only on the gray page background.
- Spacing scale 4px; card padding 24px; section gaps 32–48px. When in doubt, add whitespace.
- Motion: 150ms ease-out on hover/press (slight lift + shadow deepen on interactive cards); 250ms fade/slide for question transitions. Nothing bouncy.

### Logo & app chrome

Logo = 40px rounded-xl tile filled with the brand gradient, white "IQ" glyph or book-check icon, wordmark **SyllabusIQ** in 20px bold `ink-900` beside it.

---

## 2. Core component kit

Built once in `components/ui/`, reused everywhere. No screen introduces a one-off style.

| Component | Spec | Used in |
|---|---|---|
| **ButtonPrimary** | Brand gradient fill, white 15px semibold, 12px radius, h-48, optional leading icon; hover lifts + brightens 5%; loading spinner state | Every CTA |
| **ButtonSecondary** | White fill, `border` hairline, `ink-900` text, same geometry; icon-leading variant (like "Watch Video") | Secondary actions everywhere |
| **ButtonGhost** | Text-only `brand-violet`, used inline ("View all →") | Lists, cards |
| **Card** | White, radius-16, padding-24, soft shadow; `interactive` variant adds hover lift + cursor | The base of every surface |
| **StatBlock** | Big gradient numeral + 13px gray label below (the "5,000+ Members" pattern) | Dashboard, summaries |
| **Pill / Badge** | Full-radius, `violet-50` bg + violet text + optional icon (the "Rated #1" pattern); semantic variants use band colors | Mastery bands, statuses, "stale", streaks |
| **IconBubble** | 44px circle, tinted bg + colored icon (wifi/check pattern from reference) | Feature cards, list rows, empty states |
| **MasteryBar** | 8px full-radius track `border` color; fill = band color; 65/75 pass-line ticks as 2px `ink-400` notches | Topic rows, subject bars |
| **MasteryRing** | Circular progress, band color, numeral centered | Topic detail, readiness header |
| **BandChip** | Pill in band colors with label (Mastered / Proficient / Developing / Learning / Not started) | Everywhere a topic appears |
| **TrendStrip** | Last-10-attempts row of 10px dots, green/rose | Topic detail, summaries |
| **Input / Select / Stepper / SegmentedControl** | h-48, radius-12, hairline border, focus ring `brand-violet` 2px; segmented control = pill group with white active thumb | Auth, quiz setup |
| **ProgressDots / QuestionPalette** | Numbered 36px rounded squares: white=blank, violet=answered, amber=flagged, ring=current | Quiz player, mock exam |
| **TimerChip** | Pill with clock icon; `ink-600` normally, turns rose under 5 min with gentle pulse | Timed quiz, mock |
| **Toast** | Bottom-center card, icon bubble + message | Saves, errors |
| **EmptyState** | Centered IconBubble (large), 17px title, 15px gray line, one primary CTA | Every list/dashboard pre-data |
| **Modal / Sheet** | Radius-16 card on `ink-900/40%` overlay; becomes bottom sheet on mobile | Confirm submit, quiz exit |
| **Skeleton** | `violet-50`-tinted shimmer blocks matching card geometry | All data loads |

Chart styling (Recharts, Phase 3): violet line/area with gradient fill fading to transparent, hairline gray grid, no axis lines, rounded tooltips matching Card.

---

## 3. App shell

**Public pages** (landing, auth): top navbar exactly like the reference — logo left; center links *Subjects · How it works*; right `Log in` text link + gradient **Get Started** button. Footer minimal.

**App** (authenticated): left sidebar 256px, white, hairline right border:
- Logo top.
- Nav items: Dashboard, Subjects, Practice, Mock Exams, Review — 12px-radius rows, 15px medium; active = `violet-50` bg + violet text + violet icon; Review carries a count badge (violet pill).
- Bottom: user avatar chip + name + sign-out.
- **Mobile (<768px):** sidebar becomes a 5-item bottom tab bar (same icons); page padding 16px; all cards full-width single column. Quiz player and mock palette are designed mobile-first (reviewees study on phones).

Page header pattern on every screen: 13px uppercase gray eyebrow (e.g., "FINANCIAL ACCOUNTING & REPORTING") + 28px bold title + optional right-aligned action button. Content on `surface-page` gray, cards white.

---

## 4. Screen blueprints by phase

### Phase 0 — Auth + syllabus browse

**Sign in / Sign up:** split layout. Left 45%: white panel, logo, "Master every topic, **pass the boards**" (gradient on keyword), Google button (ButtonSecondary), divider, email/password inputs, gradient submit. Right 55%: `violet-50` panel with a floating Card collage echoing the reference's hero — a mock MasteryRing card + a mock "FAR · Proficient" topic row card, slightly overlapping. Sets the brand promise before first login. Mobile: form only.

**Subjects index:** 6 interactive Cards in a 3×2 grid (1-col mobile). Each: subject code as eyebrow, name H3, topic count caption — and from Phase 2, a MasteryBar + subject score numeral. Pre-data: bar hidden, "Not started" BandChip.

### Phase 1 — Practice quiz loop

**Quiz setup** (single centered Card, max-w-560):
1. Subject — SegmentedControl or select.
2. Topics — checkbox rows (from Phase 2 each row shows its BandChip, making "drill my weak spots" self-evident); "All topics" master toggle.
3. Length — segmented 10 / 20 / 30.
4. Mode — two selectable mini-cards with IconBubbles: **Tutor** (violet book icon, "feedback after each question") / **Timed** (amber clock, "feedback at the end"). Selected card: violet ring + `violet-50` bg.
5. Gradient **Start practice** button, full-width.

**Question player** (the most-used screen — maximal focus):
- Slim top bar: progress "7 / 10" + thin violet progress line; TimerChip (timed mode); ghost exit (confirm modal).
- Centered column max-w-720: caption eyebrow = topic name; question stem 20px medium `ink-900`, line-height 1.6.
- Choices: 4 full-width Cards, radius-12, hairline border, 16px padding, leading A/B/C/D chip (28px rounded square, `violet-50` + violet letter). Hover: violet border tint. Selected: violet ring.
- Tutor-mode feedback (after lock-in): correct choice card flips to green bg/border + check IconBubble; a wrong pick flips rose + cross; **Explanation Card** slides in below — `violet-50` left border-4, lightbulb IconBubble, explanation body. Button becomes **Next →**.
- Keyboard: 1–4 select, Enter confirm. Buttons h-56 on mobile.

**Session summary:**
- Header Card: MasteryRing with session % + verdict line + StatBlocks row (Correct · Wrong · Avg time).
- "By topic" Card: topic rows with mini MasteryBars for this session.
- "Review your misses" list: collapsed question Cards expanding to show choices + explanation (same components as player feedback).
- Footer CTAs: gradient **Practice again** + secondary **Back to dashboard**.

### Phase 2 — Mastery map

**Subject page:** page header + summary strip (subject MasteryRing, questions-seen StatBlock, last-practiced caption). Below, the **mastery map**: one Card containing topic rows —

```
[TOS weight chip 12%]  Topic name            [stale pill?]  [BandChip]  [MasteryBar——|65|75——]  72   [Practice →]
```

Rows are interactive → **Topic detail**: score MasteryRing + band, TrendStrip of last 10 attempts, distinct-seen / coverage caption ("12 of 15 questions seen — 3 more for full coverage"), gradient **Practice this topic**. The coverage caption is how we make the formula explainable in UI.

### Phase 3 — Dashboard (home)

Top-to-bottom on a 12-col grid (stacks on mobile):

1. **Readiness header Card** (full-width, the hero): left — eyebrow "EXAM READINESS", giant gradient numeral (e.g., **71**), status BandChip (PASS green / CONDITIONAL amber / NOT YET slate) + one-line explanation ("TAX is below the 65 floor"). Right — 6 labeled vertical MasteryBars, one per subject, with 65/75 tick lines. This is the screen's "Work Better, Together" moment: one glance = where you stand.
2. **Improvement sections** (left 7 cols): "Focus next" Card — 5 weakest-topic rows, each rose/amber BandChip + mini bar + **Practice now** ghost button. Beneath, collapsed "Not started (N)" list.
3. **Right rail** (5 cols): trend Card (violet gradient area chart, 30 days) above an activity Card (StatBlocks: this week vs last, streak pill with flame icon 🔥 → IconBubble, not emoji).
4. **Review due tile** (Phase 5): violet Card "12 due today" + button.

**Empty state** (new user): readiness card replaced by EmptyState — large gradient IconBubble, "Let's find your baseline", sub "Take a 10-question quiz in any subject to light up your dashboard", gradient CTA. No zeros anywhere.

### Phase 4 — Mock exam

**Mock index:** 6 Cards; unlocked = subject, "70 items · 3 hours", best/last score StatBlock, gradient **Start mock**; locked = grayed with lock IconBubble + "Needs 210 questions in bank — 140 loaded" caption and thin progress bar.

**Exam player:** same question player skeleton, plus:
- Persistent header: subject name, TimerChip (rose pulse < 5 min), **flag** toggle (amber bookmark), palette toggle.
- **QuestionPalette**: right rail desktop / bottom sheet mobile; 70–100 numbered squares (blank/answered/flagged/current), legend row.
- No feedback styling during the exam — choices only show selected state.
- Submit: confirm Modal "3 unanswered · 2 flagged — submit?"; auto-submit at 0:00 with toast.

**Mock results:** hero Card — huge numeral score vs pass line ("78 — above the 75 line" / rose if below 65 floor), green/rose BandChip; per-topic breakdown (mastery-map rows scoped to this mock); time analysis caption (avg s/question vs 154s budget); full review list reusing summary components.

### Phase 5 — Review queue

**Review page:** header Card — "Due today" StatBlock + ladder explainer caption ("Missed questions return at 1 → 3 → 7 → 16 days") + gradient **Start review (12)**. Session = tutor-mode player; each item's footer shows ladder progress as 4 dots (filled = steps cleared) and "Cleared!" green pill at step 4. Top-up items from stale topics carry a slate "Refresher · FAR: Leases" pill so users see why they appeared. Empty state: green check IconBubble, "All clear — nothing due", secondary CTA to practice the weakest topic.

---

## 5. Consistency guardrails

1. Tokens only — no raw hex/px in screens; if a screen needs a new value, the kit grows, not the screen.
2. Gradient = CTA + one headline word + hero numerals + logo. Never on borders, body text, or two elements adjacent to each other.
3. Band colors mean mastery and correctness only; never decorative.
4. One primary button per screen view.
5. Every async surface has Skeleton, EmptyState, and error Toast designed at build time, not retrofitted.
6. All list rows of the same entity (topics, questions, subjects) use the same row component everywhere they appear.
7. Icons: one set (Lucide), 20px default, 1.75 stroke; icons in IconBubbles when featured, naked inline otherwise.
8. Numbers users care about are tabular-nums and never animate-count more than 600ms.

## 6. Build order (mapped to PLAN.md phases)

| Phase | Kit work first | Then screens |
|---|---|---|
| 0 | Tokens, fonts, Button×3, Card, Pill, Input, IconBubble, EmptyState, Skeleton, shell (sidebar/tabs, page header) | Auth, subjects index |
| 1 | SegmentedControl, choice cards, explanation card, ProgressDots, TimerChip, Toast, Modal | Setup, player, summary |
| 2 | MasteryBar, MasteryRing, BandChip, TrendStrip | Mastery map, topic detail |
| 3 | StatBlock, chart styles | Dashboard + empty states |
| 4 | QuestionPalette, flag toggle, lock states | Mock index, exam player, results |
| 5 | Ladder dots, refresher pill | Review page |

Phase 0 ends with a `/styleguide` route rendering the whole kit on one page — the living reference that keeps every later phase on-brand.
