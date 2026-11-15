import AppShell from '@/components/AppShell';
import RoleGuard from '@/components/RoleGuard';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <RoleGuard role="parent">{children}</RoleGuard>
    </AppShell>
  );
}
