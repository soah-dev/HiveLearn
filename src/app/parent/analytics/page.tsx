'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChartColumn, ChevronRight, Flame, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Leaderboard from '@/components/Leaderboard';
import Page, { PageLoader } from '@/components/ui/Page';
import { ListCard } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import { Segmented } from '@/components/ui/Choice';

interface Child {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  gamification: { totalPoints: number; currentStreak: number } | null;
}

type Tab = 'analytics' | 'leaderboard';

export default function ReportsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('analytics');
  const [children, setChildren] = useState<Child[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (token) {
      apiFetch('/api/parent/children', token)
        .then(data => {
          setChildren(data.children || []);
          setDataLoading(false);
        })
        .catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router]);

  if (loading || dataLoading) return <PageLoader />;

  return (
    <Page width="medium">
      <PageHeader title="Reports" subtitle="Track progress and see how your children rank" />

      <Segmented
        className="mb-6"
        label="Report"
        value={tab}
        onChange={setTab}
        options={[{ value: 'analytics', label: 'Progress' }, { value: 'leaderboard', label: 'Leaderboard' }]}
      />

      {tab === 'analytics' ? (
        children.length === 0 ? (
          <EmptyState icon={ChartColumn} title="No children linked yet" description="Add a child from your dashboard and their progress reports will appear here." />
        ) : (
          <>
            <p className="mb-3 text-sm text-ink-muted">Select a child to view their progress.</p>
            <ListCard>
              {children.map(child => (
                <li key={child.id}>
                  <Link href={`/parent/analytics/${child.id}`} className="group flex items-center gap-3.5 px-4 py-4 sm:px-5">
                    <Avatar name={child.name || child.email} image={child.image} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-lg font-semibold text-ink group-hover:underline">{child.name || child.email}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-ink-muted">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5" aria-hidden="true" />
                          {(child.gamification?.totalPoints || 0).toLocaleString()} pts
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                          {child.gamification?.currentStreak || 0} day streak
                        </span>
                      </p>
                    </div>
                    <span className="hidden text-sm font-semibold text-brand-text sm:inline">View progress</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ListCard>
          </>
        )
      ) : (
        <Leaderboard emptyMessage="Your children will appear here once they earn points." />
      )}
    </Page>
  );
}
