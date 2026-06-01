# SyllabusIQ

Adaptive board exam progress tracker for Philippine professionals. Built as an offline-first PWA with Next.js 16, Supabase, and the Claude API.

## Features

- **Syllabus Tree** — hierarchical coverage tracker (Exam → Subject → Domain → Topic)
- **Mastery Tracking** — EWMA-based scoring from quiz sessions
- **Dashboard** — PASSING/CONDITIONAL/FAILING status per CPALE rules + Leak Detector
- **Scheduler** — weekly study plan with automatic pace warnings
- **AI Question Bank Parser** — paste a quiz → AI extracts Q&A → auto-logs sessions
- **Gamification** — XP, levels, streaks, achievements, confetti
- **Push Notifications** — daily reminders, pace warnings, streak milestones
- **Offline-first** — Dexie.js (IndexedDB) + sync queue, works in poor connectivity

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project. Copy your project URL and anon key.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your@email.com
```

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

### 3. Run database migrations

In Supabase Dashboard → SQL Editor, run in order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rpc_functions.sql`

### 4. Seed the CPALE exam template

```bash
npx ts-node supabase/seed/seed-api.ts
```

Or paste the JSON from `supabase/seed/cpale-template.json` into the Supabase SQL editor.

### 5. Configure Google OAuth

In Supabase Dashboard → Authentication → Providers → Google:
- Enable Google provider, add OAuth Client ID and Secret
- Callback URL: `https://your-project.supabase.co/auth/v1/callback`

### 6. Generate TypeScript types (recommended)

```bash
npx supabase gen types typescript --project-id your-project-id > src/types/database.ts
```

### 7. Run

```bash
npm run dev
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Offline DB | Dexie.js (IndexedDB) |
| UI | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| State | Zustand |
| AI | Claude API (claude-sonnet-4-6) |
| Push | Web Push API + VAPID |

## Brand Colors

| Name | Hex | Usage |
|---|---|---|
| Imperial Blue | `#03256c` | Sidebar, dark backgrounds |
| Persian Blue | `#2541b2` | Primary buttons |
| Ocean Deep | `#1768ac` | Hover states |
| Sky Surge | `#06bee1` | Accents, mastery rings, CTAs |
