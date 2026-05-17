# HiveExcel - Project Context & Setup Guide

## Overview

HiveExcel is a parent-kid homework collaboration web app. Parents generate assignments (powered by Gemini API), children complete them on their own device, and results are reviewed with gamification (points, streaks, badges, leaderboards).

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: Prisma ORM v6 + PostgreSQL (Supabase)
- **Auth**: Firebase Auth (Google sign-in + email/password) + Firebase Admin SDK for server-side token verification
- **AI**: Gemini API (@google/generative-ai SDK) for question generation and auto-review
- **Styling**: Tailwind CSS with class-based dark mode
- **Charts**: Recharts for progress analytics
- **Deployment target**: Vercel

## Project Structure

```
homework-hub/
├── prisma/
│   ├── schema.prisma          # 8 models: User, ParentChild, Assignment, Question, Answer, Gamification, Badge, EarnedBadge
│   ├── seed.ts                # Seeds 14 badges
│   └── migrations/            # PostgreSQL migrations (legacy init migration has SQLite syntax — use `prisma db push` for schema changes)
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
│   │   ├── Navbar.tsx         # Role-based nav + dark mode toggle
│   │   ├── LoadingSpinner.tsx # Animated spinner (sm/md/lg)
│   │   ├── StatCard.tsx       # Dashboard stat card
│   │   └── AssignmentCard.tsx # Assignment card with status/difficulty badges
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
├── tailwind.config.ts         # darkMode: 'class' enabled
└── package.json
```

## Auth Architecture

- Client: Firebase Auth SDK handles Google sign-in and email/password
- Server: API routes extract `Authorization: Bearer <token>`, verify via Firebase Admin SDK, then look up user in Prisma by `firebaseUid`
- AuthContext exposes: `signInWithGoogle()`, `signInWithEmail()`, `signUpWithEmail()`, `signOut()`, `refreshUser()`
- `firebase-admin.ts` uses lazy initialization via Proxy to avoid crashing at Next.js build time when env vars are placeholders

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

# 4. Generate Prisma client and sync schema
npx prisma generate
npx prisma db push

# 5. Seed badges
npx tsx prisma/seed.ts

# 6. Start dev server
npm run dev
```

## Key Design Decisions

- **Prisma v6** (not v7) used because v7 requires adapter-based initialization incompatible with current setup
- **firebase-admin.ts** uses a Proxy pattern for lazy initialization so the app builds even with placeholder env vars
- **PostgreSQL** via Supabase (pooled + direct connections). Legacy migrations have SQLite syntax, so use `prisma db push` instead of `prisma migrate dev` for schema changes
- All API routes use `getAuthUser()` from `src/lib/auth.ts` for consistent auth checking
- Question generation and auto-review both call Gemini API (@google/generative-ai SDK)
- Dark mode uses Tailwind `class` strategy with localStorage persistence

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
- [ ] Add mobile hamburger menu to Navbar
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
