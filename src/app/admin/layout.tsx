import Navbar from '@/components/Navbar';
import RoleGuard from '@/components/RoleGuard';

// Admin authorization is enforced by the API (ADMIN_EMAILS); this only requires sign-in.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <RoleGuard>{children}</RoleGuard>
    </>
  );
}
