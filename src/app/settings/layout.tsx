import AppShell from '@/components/AppShell';
import RoleGuard from '@/components/RoleGuard';

// Settings is shared by parents and children, so it only requires sign-in.
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <RoleGuard>{children}</RoleGuard>
    </AppShell>
  );
}
