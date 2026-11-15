import AppShell from '@/components/AppShell';
import RoleGuard from '@/components/RoleGuard';

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <RoleGuard role="child">{children}</RoleGuard>
    </AppShell>
  );
}
