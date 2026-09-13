import Navbar from '@/components/Navbar';
import RoleGuard from '@/components/RoleGuard';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <RoleGuard role="parent">{children}</RoleGuard>
    </>
  );
}
