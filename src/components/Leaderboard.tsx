'use client';

import { useEffect, useState } from 'react';
import { Flame, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import LoadingSpinner from '@/components/LoadingSpinner';
import EmptyState from '@/components/EmptyState';
import Avatar from '@/components/ui/Avatar';
import Hexagon from '@/components/ui/Hexagon';
import Pill from '@/components/ui/Pill';
import { ListCard } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Choice';

interface LeaderboardEntry {
  id: string;
  name: string | null;
  totalPoints: number;
  weeklyPoints: number;
  currentStreak: number;
}

interface LeaderboardProps {
  /** Marks this entry as "You" (the signed-in child). */
  highlightId?: string;
  emptyMessage: string;
}

/** Family / global ranking with its scope and period controls. Used by children and parents. */
export default function Leaderboard({ highlightId, emptyMessage }: LeaderboardProps) {
  const { token } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [scope, setScope] = useState<'family' | 'global'>('family');
  const [view, setView] = useState<'alltime' | 'weekly'>('weekly');
  const [loadedScope, setLoadedScope] = useState<string | null>(null);
  const dataLoading = loadedScope !== scope;

  useEffect(() => {
    if (!token) return;
    apiFetch(`/api/leaderboard?scope=${scope}`, token)
      .then(data => { setLeaderboard(data.leaderboard || []); setLoadedScope(scope); })
      .catch(() => setLoadedScope(scope));
  }, [token, scope]);

  // Global view is weekly-only; all-time ranking is hidden there.
  const effectiveView = scope === 'global' ? 'weekly' : view;

  const sorted = [...leaderboard].sort((a, b) =>
    effectiveView === 'weekly' ? b.weeklyPoints - a.weeklyPoints : b.totalPoints - a.totalPoints
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Who to rank"
          value={scope}
          onChange={setScope}
          options={[{ value: 'family', label: 'Family' }, { value: 'global', label: 'Global' }]}
        />
        {/* All-time ranking only exists for the family view */}
        {scope === 'family' ? (
          <Segmented
            label="Period"
            value={view}
            onChange={setView}
            options={[{ value: 'weekly', label: 'This week' }, { value: 'alltime', label: 'All time' }]}
          />
        ) : (
          <p className="text-sm text-ink-muted">This week&apos;s points</p>
        )}
      </div>

      {dataLoading ? (
        <LoadingSpinner size="md" />
      ) : sorted.length === 0 ? (
        <EmptyState icon={Trophy} title="No rankings yet" description={emptyMessage} />
      ) : (
        <ListCard>
          {sorted.map((entry, i) => {
            const isYou = entry.id === highlightId;
            return (
              <li
                key={entry.id}
                className={cn('flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5', isYou && 'shadow-[inset_3px_0_0_rgb(var(--brand))]')}
              >
                <Hexagon size={34} tone={i === 0 ? 'honey' : i < 3 ? 'honey-soft' : 'muted'}>
                  <span className="text-sm font-bold tabular-nums">{i + 1}</span>
                </Hexagon>
                <Avatar name={entry.name} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    <span className="truncate">{entry.name || 'Student'}</span>
                    {isYou && <Pill tone="brand">You</Pill>}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                    <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                    {entry.currentStreak} day streak
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold leading-tight tabular-nums text-ink">
                    {(effectiveView === 'weekly' ? entry.weeklyPoints : entry.totalPoints).toLocaleString()}
                  </p>
                  <p className="text-xs text-ink-subtle">points</p>
                </div>
              </li>
            );
          })}
        </ListCard>
      )}
    </div>
  );
}
