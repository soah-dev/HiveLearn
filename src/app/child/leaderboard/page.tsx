'use client';

import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/PageHeader';
import Leaderboard from '@/components/Leaderboard';
import Page, { PageLoader } from '@/components/ui/Page';

export default function LeaderboardPage() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <Page width="narrow">
      <PageHeader title="Leaderboard" subtitle="See how you stack up against your family, or against everyone." />
      <Leaderboard highlightId={user?.id} emptyMessage="Complete assignments to earn points and get on the board." />
    </Page>
  );
}
