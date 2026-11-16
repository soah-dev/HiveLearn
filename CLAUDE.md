# HiveExcel - Project Context & Setup Guide

## Overview

HiveExcel is a parent-kid homework collaboration web app. Parents generate assignments (powered by Gemini API), children complete them on their own device, and results are reviewed with gamification (points, streaks, badges, leaderboards).

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: Prisma ORM v6 + PostgreSQL (Supabase)
- **Auth**: Firebase Auth (Google sign-in + email/password) + Firebase Admin SDK v14 for server-side token verification (requires Node 20+)
- **AI**: Gemini API (@google/generative-ai SDK) for question generation and auto-review
- **Styling**: Tailwind CSS driven by design tokens (see "Design System"); class-based dark mode
- **Icons**: lucide-react (no emoji in the UI)
- **Charts**: Recharts for progress analytics, themed via `src/components/charts/chartTheme.tsx`
- **Deployment target**: Vercel

## Project Structure

```
homework-hub/
├── prisma/
│   ├── schema.prisma          # 8 models: User, ParentChild, Assignment, Question, Answer, Gamification, Badge, EarnedBadge
│   ├── seed.ts                # Seeds 14 badges
│   └── migrations/            # PostgreSQL migrations, baselined as 0_init (Sept 2026) — use `prisma migrate dev` / `migrate deploy`
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with Providers wrapper
│   │   ├── providers.tsx      # ThemeProvider + AuthProvider
│   │   ├── page.tsx           # Landing page (login/signup + Google sign-in)
│   │   ├── onboarding/        # Role selection (parent/child) + invite code
│   │   ├── parent/
│   │   │   ├── dashboard/     # Children list, stats, recent assignments
│   │   │   ├── create/        # AI-powered assignment creation with preview/edit
│   │   │   ├── assignment/[id]/ # View/review submissions
│   │   │   └── analytics/[childId]/ # Recharts dashboards
│   │   ├── child/
│   │   │   ├── dashboard/     # Pending assignments, stats, streak
│   │   │   ├── assignment/[id]/ # Take quiz (with timer) / view results
│   │   │   ├── badges/        # Badge collection (earned + locked)
│   │   │   └── leaderboard/   # Family leaderboard
│   │   ├── settings/          # Profile, dark mode toggle, manage linked accounts
│   │   └── api/
│   │       ├── auth/login/    # POST - Firebase token → create/fetch user
│   │       ├── auth/me/       # GET - Get current user
│   │       ├── auth/onboarding/ # POST - Set role, join via invite code
│   │       ├── parent/invite/ # POST/GET - Generate/list invite codes
│   │       ├── parent/children/ # GET - List linked children
│   │       ├── assignments/   # POST (create) / GET (list)
│   │       ├── assignments/[id]/ # GET/PATCH single assignment
│   │       ├── assignments/[id]/start/ # POST - Child starts assignment
│   │       ├── assignments/[id]/submit/ # POST - Child submits answers
│   │       ├── assignments/[id]/save-progress/ # POST - Save without submitting
│   │       ├── assignments/[id]/review/ # POST - AI auto-review or parent review
│   │       ├── ai/generate/   # POST - Gemini API question generation
│   │       ├── gamification/  # GET - Points, badges data
│   │       ├── leaderboard/   # GET - Family leaderboard
│   │       └── analytics/[childId]/ # GET - Score trends, subject breakdown
│   ├── components/
│   │   ├── AppShell.tsx       # App chrome: sidebar (desktop), top bar + bottom tabs (phone)
│   │   ├── AuthLayout.tsx     # Frame for signed-out screens (brand panel + form)
│   │   ├── PageHeader.tsx     # Page title row (title, subtitle, actions, back)
│   │   ├── StatCard.tsx       # StatGrid + StatCard: hairline-divided stat tiles
│   │   ├── AssignmentRow.tsx  # One assignment as a list row (use inside ListCard)
│   │   ├── Leaderboard.tsx    # Family/global ranking, shared by child + parent
│   │   ├── EmptyState.tsx, Modal.tsx, LoadingSpinner.tsx, QuizProgress.tsx
│   │   ├── ui/                # Primitives: Button, Card/ListCard/SectionHeader, Field (Input/Select/Textarea),
│   │   │                      #   Pill/Score, Alert, Switch, Choice (Segmented/Chips), Avatar, Hexagon,
│   │   │                      #   SubjectIcon, BadgeMedal, DifficultyMeter, Page, Logo, Spinner
│   │   ├── quiz/              # QuestionCard + AnswerOption, shared by every quiz and review screen
│   │   ├── charts/            # ChartCard (chart + table view) and chartTheme (colours, axes, tooltip)
│   │   └── sat/               # SAT module header, question nav, question view, timer, score card
│   ├── contexts/
│   │   ├── AuthContext.tsx     # Firebase auth state, Google + email/password sign-in
│   │   └── ThemeContext.tsx    # Dark mode with localStorage persistence
│   └── lib/
│       ├── firebase.ts        # Firebase client SDK init
│       ├── firebase-admin.ts  # Firebase Admin SDK (lazy init to avoid build errors)
│       ├── auth.ts            # Server-side auth helper (verifyIdToken → Prisma user)
│       ├── prisma.ts          # Prisma client singleton
│       └── api.ts             # Fetch helper that attaches Bearer token
├── .env.local                 # Environment variables (gitignored)
├── tailwind.config.ts         # Maps design tokens to utilities; darkMode: 'class'
└── package.json
```

## Auth Architecture

- Client: Firebase Auth SDK handles Google sign-in and email/password
- Server: API routes extract `Authorization: Bearer <token>`, verify via Firebase Admin SDK, then look up user in Prisma by `firebaseUid`
- AuthContext exposes: `signInWithGoogle()`, `signInWithEmail()`, `signUpWithEmail()`, `signOut()`, `refreshUser()`
- `firebase-admin.ts` uses lazy initialization via Proxy to avoid crashing at Next.js build time when env vars are placeholders

## Design System ("Hive": purple brand, honey rewards)

The look lives in one place. Follow these rules so screens stay calm and consistent:

- **Tokens, not palette classes.** Colours are CSS variables in `src/app/globals.css` (light under `:root`, dark under `.dark`), mapped to Tailwind utilities in `tailwind.config.ts`: `canvas` / `surface` / `muted` (backgrounds), `line` / `line-strong` (borders), `ink` / `ink-muted` / `ink-subtle` (text), `brand` (+ `-hover`, `-soft`, `-line`, `-ink`, `-text`) for the purple brand, `honey` (+ `-soft`, `-ink`, `-text`) for rewards, and `good` / `warn` / `bad` / `info` (+ `-soft`, `-text`) for status. Never use raw Tailwind colours (`gray-500`, `indigo-600`) or `dark:` variants in components; the tokens already switch with the theme.
- **Colour has to mean something.** Brand (purple) = the primary action, navigation, selection, progress and links. Honey = rewards only: points, streaks, earned badges, top leaderboard ranks (`Pill tone="honey"`, `Hexagon tone="honey"`, `StatCard accent="honey"`). Status colours are reserved for state (correct/incorrect, needs review, errors). Subjects are told apart by icon (`SubjectIcon`), difficulty by `DifficultyMeter`, never by colour.
- **One primary button per view.** `Button variant="primary"` (purple fill, white text) is the main action; everything else is `secondary`, `subtle`, `ghost` or `danger`. Links that look like buttons use `buttonClass()`.
- **Build from the primitives** in `src/components/ui/` instead of restyling by hand: pages are `<Page>` + `<PageHeader>`, lists are `<ListCard>` rows, forms use `<Field>` with `<Input>`/`<Select>`/`<Textarea>`, toggles are `<Switch>`, either/or choices are `<Segmented>` (views) or `<Chips>` (form values), messages are `<Alert>`.
- **Shape and type.** The hexagon (`Hexagon`) is the brand shape for icons, numbers and badges. Radii: cards `rounded-2xl`, controls `rounded-xl`. Headings use `font-display` (Bricolage Grotesque); body and figures use the default sans (DM Sans); timers use `font-mono`. Sentence case for labels and buttons.
- **Motion.** Only `animate-enter` / `animate-sheet-up` for overlays. No decorative floating or bouncing.
- **Navigation** is defined in `AppShell.tsx` (link lists per role). On phones the bottom tab bar hides on quiz/review detail routes (`FOCUS_ROUTES`) so the page's own action bar owns the bottom edge.
- **Charts** take colours, axes and tooltips from `chartTheme.tsx`. The three series colours are validated colour-blind-safe as a set in both themes; don't add a fourth by eye. Every chart sits in a `ChartCard` with a table view.
- **Emails** (`src/lib/email.ts`) repeat the light-theme hex values, because email clients can't read CSS variables. Update them when the tokens change.
- Tailwind only scans `src/app`, `src/components`, `src/contexts` and `src/pages`. Markup with class names anywhere else needs adding to `content` in `tailwind.config.ts`.

## Gamification System

- **Points**: Easy=10, Medium=20, Hard=30 base. Score bonuses: 90%+=50%, 80%+=25%, 70%+=10%. Timed quiz: +5 flat.
- **Streaks**: Consecutive days with completed assignments
- **Badges**: 14 badges evaluated after each review (first_assignment, perfect_score, streak_7/30, mastery per subject, speed_demon, hardmode_hero, points_1000, all_rounder)
- **Leaderboard**: Family siblings ranked by total/weekly points

## Environment Variables (.env.local)

```
# Firebase Client (public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Firebase Admin (server-side only)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# AI
GEMINI_API_KEY=

# Database (PostgreSQL via Supabase)
DATABASE_URL=postgresql://...  # Supabase pooled connection string
DIRECT_URL=postgresql://...    # Supabase direct connection string
```

## Setup on a New Machine

```bash
# 1. Clone / copy the project
cd homework-hub

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local  # or create .env.local manually with values above

# 4. Generate Prisma client and apply migrations
npx prisma generate
npx prisma migrate deploy

# 5. Seed badges
npx tsx prisma/seed.ts

# 6. Start dev server
npm run dev
```

## Key Design Decisions

- **Prisma v6** (not v7) used because v7 requires adapter-based initialization incompatible with current setup
- **firebase-admin.ts** uses a Proxy pattern for lazy initialization so the app builds even with placeholder env vars
- **PostgreSQL** via Supabase (pooled + direct connections). Migrations were baselined to `0_init` from the live schema; use `prisma migrate dev --name <change>` locally and `prisma migrate deploy` in production. The production DB must have `0_init` marked applied once: `npx prisma migrate resolve --applied 0_init`
- All API routes use `getAuthUser()` from `src/lib/auth.ts` for consistent auth checking; parent→child access goes through `getLinkedChild()`, admin routes through `requireAdmin()` (ADMIN_EMAILS)
- Route segments `parent/`, `child/`, `admin/`, `settings/` have layouts that render the `AppShell` and a `RoleGuard`, so pages don't need their own redirect effects
- Shared Gemini question generation (prompt, validation, retry) lives in `src/lib/question-generation.ts`; per-user daily quotas in `src/lib/ai-quota.ts`
- Calendar-day logic (streaks, preset schedules) goes through `src/lib/dates.ts` (America/Chicago)
- Lint: `npm run lint` (ESLint 9 flat config in `eslint.config.mjs`). Tests: `npm test` (Vitest, `tests/`)
- Question generation and auto-review both call Gemini API (@google/generative-ai SDK)
- Dark mode uses Tailwind `class` strategy with localStorage persistence; components get both themes for free through the design tokens
- Shared option lists (subjects, grades, difficulties) and `subjectLabel()` live in `src/lib/subjects.ts`

## Next Steps for Testing & Improvement

### Immediate (to get app running)
1. Create a Firebase project and enable Google + Email/Password auth
2. Add real Firebase credentials to `.env.local`
3. Add Gemini API key to `.env.local`
4. Run `npm run dev` and test the full flow

### Testing Checklist
- [ ] Sign up with email/password, verify onboarding flow
- [ ] Sign in with Google, verify onboarding flow
- [ ] Parent: generate invite code, child: join with invite code
- [ ] Parent: create assignment (all question types, difficulties, timed/untimed)
- [ ] Child: start, answer, save progress, submit assignment
- [ ] AI auto-review: verify scoring, explanations, points awarded
- [ ] Parent review: manual grading with comments
- [ ] Verify badge awarding after review
- [ ] Verify streak tracking across days
- [ ] Check leaderboard with multiple children
- [ ] Check analytics charts populate correctly
- [ ] Test dark mode toggle and persistence
- [ ] Test timer auto-submit on timed quizzes
- [ ] Test mobile responsiveness

### Improvements to Consider
- [ ] Add loading/error states to all data fetches
- [ ] Add form validation (zod or similar)
- [ ] Replace `<img>` tags with Next.js `<Image>` component
- [x] Mobile navigation (bottom tab bar in `AppShell`)
- [ ] Add pagination for assignment lists
- [ ] Add assignment due dates
- [ ] Add push notifications (or email) when assignments are assigned/reviewed
- [ ] Add ability for parent to override AI review scores
- [ ] Add password reset flow
- [ ] Add user profile editing (name, avatar)
- [ ] Write unit tests for API routes
- [ ] Write E2E tests with Playwright

### Production Deployment
1. Deploy to Vercel: `npx vercel` and add all env vars in dashboard
2. Optional: replace Firebase Auth with Supabase Auth if using Supabase DB
3. Add rate limiting to AI generation endpoint
4. Add row-level security if using Supabase

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
