'use client';

import { useState } from 'react';
import { GraduationCap, LucideIcon, UsersRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import AuthLayout from '@/components/AuthLayout';
import { PageLoader } from '@/components/ui/Page';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Hexagon from '@/components/ui/Hexagon';

type Role = 'parent' | 'child';

const roles: Array<{ value: Role; label: string; text: string; icon: LucideIcon }> = [
  { value: 'parent', label: 'Parent', text: 'Create assignments and follow progress', icon: UsersRound },
  { value: 'child', label: 'Student', text: 'Do assignments, practice and earn badges', icon: GraduationCap },
];

export default function OnboardingPage() {
  const { user, token, refreshUser, loading } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <PageLoader />;

  if (user?.role) {
    router.push(user.role === 'parent' ? '/parent/dashboard' : '/child/dashboard');
    return null;
  }

  const handleSubmit = async () => {
    if (!role) return;
    setSubmitting(true);
    setError('');

    try {
      await apiFetch('/api/auth/onboarding', token, {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      await refreshUser();
      router.push(role === 'parent' ? '/parent/dashboard' : '/child/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Welcome to HiveExcel</h1>
      <p className="mt-2 text-ink-muted">One question before we set up your account: who are you?</p>

      <div role="radiogroup" aria-label="I am a" className="mt-8 space-y-3">
        {roles.map(r => {
          const active = role === r.value;
          return (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setRole(r.value)}
              className={cn(
                'flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors',
                active ? 'border-brand bg-brand-soft' : 'border-line-strong bg-surface hover:border-ink-subtle'
              )}
            >
              <Hexagon size={48} tone={active ? 'brand' : 'muted'}>
                <r.icon className="h-5 w-5" aria-hidden="true" />
              </Hexagon>
              <span>
                <span className="block font-display text-lg font-semibold text-ink">{r.label}</span>
                <span className="block text-sm text-ink-muted">{r.text}</span>
              </span>
            </button>
          );
        })}
      </div>

      {role === 'child' && (
        <Alert tone="info" className="mt-4">
          Ask your parent to send you an invite from their dashboard, then check your email for the invite link.
        </Alert>
      )}

      {error && <Alert className="mt-4">{error}</Alert>}

      <Button size="lg" block className="mt-6" onClick={handleSubmit} disabled={!role} loading={submitting}>
        Continue
      </Button>
    </AuthLayout>
  );
}
