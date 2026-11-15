'use client';

import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import Page, { PageLoader } from '@/components/ui/Page';
import Card, { SectionHeader } from '@/components/ui/Card';
import BadgeMedal from '@/components/ui/BadgeMedal';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: string;
}

interface EarnedBadge {
  id: string;
  badgeId: string;
  earnedAt: string;
  badge: Badge;
}

export default function BadgesPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (token) {
      apiFetch('/api/gamification', token)
        .then(data => {
          setAllBadges(data.allBadges || []);
          setEarnedBadges(data.earnedBadges || []);
          setDataLoading(false);
        })
        .catch(() => setDataLoading(false));
    }
  }, [user, token, loading, router]);

  if (loading || dataLoading) return <PageLoader />;

  const earnedIds = new Set(earnedBadges.map(b => b.badgeId));
  const locked = allBadges.filter(b => !earnedIds.has(b.id));
  const progress = allBadges.length > 0 ? (earnedBadges.length / allBadges.length) * 100 : 0;

  return (
    <Page width="medium">
      <PageHeader title="Badges" subtitle="Every badge is a cell in your hive. Fill them in as you learn." />

      {/* Progress */}
      <Card className="mb-8">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-ink">
            <span className="text-2xl font-semibold tracking-tight">{earnedBadges.length}</span>
            <span className="text-ink-muted"> of {allBadges.length} earned</span>
          </p>
          <p className="text-sm font-medium tabular-nums text-ink-muted">{Math.round(progress)}%</p>
        </div>
        <div
          className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={allBadges.length}
          aria-valuenow={earnedBadges.length}
          aria-label="Badges earned"
        >
          <div className="h-full rounded-full bg-honey transition-[width] duration-700 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </Card>

      {earnedBadges.length > 0 && (
        <section className="mb-10" aria-labelledby="earned-heading">
          <SectionHeader id="earned-heading" title="Earned" count={earnedBadges.length} />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {earnedBadges.map(eb => (
              <li key={eb.id} className="rounded-2xl border border-line bg-surface p-4 text-center">
                <BadgeMedal criteria={eb.badge.criteria} earned size={76} />
                <p className="mt-3 font-display text-sm font-semibold text-ink">{eb.badge.name}</p>
                <p className="mt-1 text-xs text-ink-muted">{eb.badge.description}</p>
                <p className="mt-2 text-xs font-medium text-honey-text">{new Date(eb.earnedAt).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {locked.length > 0 && (
        <section aria-labelledby="locked-heading">
          <SectionHeader id="locked-heading" title="Still to earn" count={locked.length} />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {locked.map(badge => (
              <li key={badge.id} className="rounded-2xl border border-dashed border-line-strong p-4 text-center">
                <BadgeMedal criteria={badge.criteria} earned={false} size={76} />
                <p className="mt-3 font-display text-sm font-semibold text-ink-muted">{badge.name}</p>
                <p className="mt-1 text-xs text-ink-subtle">{badge.description}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink-subtle">
                  <Lock className="h-3 w-3" aria-hidden="true" /> Locked
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
