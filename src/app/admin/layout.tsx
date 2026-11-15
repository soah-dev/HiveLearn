import AppShell from '@/components/AppShell';
import RoleGuard from '@/components/RoleGuard';

// Admin authorization is enforced by the API (ADMIN_EMAILS); this only requires sign-in.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <RoleGuard>{children}</RoleGuard>
    </AppShell>
  );
}
