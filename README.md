# HiveExcel

Parent–child homework collaboration app. Parents generate AI-powered assignments, children complete them, and results feed a gamification layer (points, streaks, badges, leaderboards). Also includes self-serve practice, offline-work logging, scheduled assignment presets, Digital-SAT practice tests, and weekly parent email reports.

Stack: Next.js 16 (App Router, TypeScript) · Prisma 6 + PostgreSQL (Supabase) · Firebase Auth · Gemini · Tailwind · Recharts · Resend · Vercel.

See `CLAUDE.md` for the full architecture and route map.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # fill in values
npx prisma generate
npx prisma migrate deploy           # or `prisma db push` for a scratch DB
npm run seed                        # badges
npm run dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma generate` + production build |
| `npm run lint` | ESLint (flat config in `eslint.config.mjs`) |
| `npm test` | Unit tests (Vitest) for scoring, streaks, validation |
| `npm run seed` | Upsert the badge catalogue |

## Database migrations

Migrations live in `prisma/migrations` and were baselined from the live schema. For a schema change:

```bash
npx prisma migrate dev --name describe_change   # local
npx prisma migrate deploy                        # production
```

## Deployment

Deployed on Vercel from `main`. Set every variable from `.env.local.example` in the Vercel project. `vercel.json` schedules the weekly report cron.
