'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpenText, ChartColumn, ClipboardCheck, ClipboardList, LucideIcon, Mail, Pencil, SquarePen, Target, Trophy, UserPlus, UserRound, Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AppShell from '@/components/AppShell';
import Page from '@/components/ui/Page';
import Logo from '@/components/ui/Logo';
import Hexagon from '@/components/ui/Hexagon';
import { buttonClass } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Choice';

interface Step {
  title: string;
  description: string;
  icon: LucideIcon;
}

const parentSteps: Step[] = [
  {
    title: 'Create your account',
    description: 'Sign up with email or Google and choose the Parent role. It only takes a minute.',
    icon: UserRound,
  },
  {
    title: 'Invite your child',
    description: 'Add your child by email from your dashboard. They get a link to create their own account, already linked to yours.',
    icon: UserPlus,
  },
  {
    title: 'Create assignments',
    description: 'Pick a subject, topic, grade level, and difficulty. Tailored questions are generated instantly — review and edit before assigning.',
    icon: SquarePen,
  },
  {
    title: 'Review results',
    description: 'Assignments are automatically reviewed with scores and explanations, or you can grade them yourself with personal feedback.',
    icon: ClipboardCheck,
  },
  {
    title: 'Track progress',
    description: 'View analytics dashboards with score trends, subject breakdowns, and streaks to see how your child is improving over time.',
    icon: ChartColumn,
  },
];

const childSteps: Step[] = [
  {
    title: 'Join from your invite',
    description: 'Open the invite link your parent emailed you and choose a password. Your accounts are linked automatically.',
    icon: Mail,
  },
  {
    title: 'View your assignments',
    description: 'Your dashboard shows all pending assignments with the subject, difficulty, and whether they are timed.',
    icon: ClipboardList,
  },
  {
    title: 'Complete the quiz',
    description: 'Answer each question at your own pace — or race the clock on timed quizzes. You can save progress and come back later.',
    icon: Pencil,
  },
  {
    title: 'Get your results',
    description: 'See your score, read detailed explanations for each question, and learn from any mistakes right away.',
    icon: Target,
  },
  {
    title: 'Study a topic',
    description: 'Pick any topic to get a short lesson with the key ideas and worked examples, then practice it with questions on what you just learned.',
    icon: BookOpenText,
  },
  {
    title: 'Practice on your own',
    description: "Don't wait for assignments — start practice sessions anytime to earn extra points and badges while keeping your streak alive.",
    icon: Zap,
  },
  {
    title: 'Earn points & badges',
    description: 'Every assignment and practice session earns you points. Build streaks, unlock badges, and climb the family leaderboard.',
    icon: Trophy,
  },
];

export default function HowItWorksPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<'parent' | 'child'>(() => (user?.role === 'child' ? 'child' : 'parent'));
  const steps = tab === 'parent' ? parentSteps : childSteps;
  const signedIn = !loading && !!user;
  const homeHref = user?.role === 'parent' ? '/parent/dashboard' : user?.role === 'child' ? '/child/dashboard' : '/';

  const content = (
    <>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">How it works</h1>
        <p className="mt-2 text-ink-muted">Get started in minutes. Here&apos;s what to expect.</p>
      </header>

      <Segmented
        label="Show steps for"
        value={tab}
        onChange={setTab}
        options={[{ value: 'parent', label: 'For parents' }, { value: 'child', label: 'For students' }]}
      />

      <ol className="mt-8">
        {steps.map((step, i) => (
          <li key={`${tab}-${i}`} className="relative flex gap-4 pb-8 last:pb-0 sm:gap-5">
            {/* Connector to the next step */}
            {i < steps.length - 1 && <span className="absolute bottom-0 left-6 top-12 w-px bg-line" aria-hidden="true" />}
            <Hexagon size={48} tone="soft">
              <step.icon className="h-5 w-5" aria-hidden="true" />
            </Hexagon>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Step {i + 1}</p>
              <h2 className="font-display text-lg font-semibold text-ink">{step.title}</h2>
              <p className="mt-1 leading-relaxed text-ink-muted">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10">
        <Link href={homeHref} className={buttonClass({ size: 'lg' })}>
          {signedIn ? 'Back to dashboard' : 'Get started'}
        </Link>
      </div>
    </>
  );

  // Signed in: inside the app chrome. Signed out (or still checking): a public page.
  if (signedIn) {
    return (
      <AppShell>
        <Page width="narrow">{content}</Page>
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="HiveExcel home"><Logo /></Link>
        <Link href="/" className={buttonClass({ variant: 'secondary', size: 'sm' })}>Sign in</Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">{content}</main>
    </div>
  );
}
