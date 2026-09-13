'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

interface RoleGuardProps {
  /** Role required to view this segment; omit to only require a signed-in user. */
  role?: 'parent' | 'child';
  children: ReactNode;
}

/**
 * Client-side route guard for a whole app segment. Redirects signed-out users
 * (and users with the wrong role) to the landing page and renders nothing for
 * them, so pages under the segment don't each need their own redirect effect.
 * APIs enforce authorization independently; this is UX, not security.
 */
export default function RoleGuard({ role, children }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const allowed = !!user && (!role || user.role === role);

  useEffect(() => {
    if (!loading && !allowed) {
      router.replace(user && !user.role ? '/onboarding' : '/');
    }
  }, [loading, allowed, user, router]);

  if (loading || !allowed) {
    return (
      <div className="p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
