import Navbar from '@/components/Navbar';
import RoleGuard from '@/components/RoleGuard';

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <RoleGuard role="child">{children}</RoleGuard>
    </>
  );
}
