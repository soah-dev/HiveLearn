'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Award, CalendarClock, ChartColumn, CircleHelp, CirclePlus, GraduationCap, House, LogOut, LucideIcon, Moon,
  Settings, ShieldCheck, Sparkles, Sun, Target, Trophy,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/cn';
import Logo from '@/components/ui/Logo';
import Avatar from '@/components/ui/Avatar';
import Switch from '@/components/ui/Switch';

interface NavLink {
  href: string;
  label: string;
  /** Shorter label for the phone tab bar. */
  short?: string;
  icon: LucideIcon;
  /** Other path prefixes that belong to this destination (detail screens). */
  also?: string[];
}

const parentLinks: NavLink[] = [
  { href: '/parent/dashboard', label: 'Dashboard', short: 'Home', icon: House, also: ['/parent/assignment'] },
  { href: '/parent/create', label: 'Create', icon: CirclePlus },
  { href: '/parent/presets', label: 'Scheduled', short: 'Schedule', icon: CalendarClock },
  { href: '/parent/analytics', label: 'Reports', icon: ChartColumn },
];

const childLinks: NavLink[] = [
  { href: '/child/dashboard', label: 'Dashboard', short: 'Home', icon: House, also: ['/child/assignment'] },
  { href: '/child/practice', label: 'Practice', icon: Target },
  { href: '/child/sat', label: 'SAT Prep', short: 'SAT', icon: GraduationCap },
  { href: '/child/badges', label: 'Badges', icon: Award },
  { href: '/child/leaderboard', label: 'Leaderboard', short: 'Ranks', icon: Trophy },
];

// Only listed while the viewer is already on an admin page; the API enforces access
const adminLinks: NavLink[] = [
  { href: '/admin/dashboard', label: 'Overview', icon: ShieldCheck },
  { href: '/admin/ai-usage', label: 'AI usage', icon: Sparkles },
];

const secondaryLinks: NavLink[] = [
  { href: '/how-it-works', label: 'How it works', icon: CircleHelp },
  { href: '/settings', label: 'Settings', icon: Settings },
];

// Screens where someone is mid-task (taking or reviewing a quiz). On phones the
// tab bar steps aside there so the page's own action bar owns the bottom edge.
const FOCUS_ROUTES = /^\/(child\/(assignment|practice|sat)|parent\/assignment)\/[^/]+/;

/**
 * App chrome for signed-in pages: a sidebar on desktop; a top bar plus a
 * bottom tab bar on phones. Renders only its children until the user is known,
 * so RoleGuard's loading state and redirects show without chrome.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut, loading } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the account menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (loading || !user) return <>{children}</>;

  const homeHref = user.role === 'parent' ? '/parent/dashboard' : user.role === 'child' ? '/child/dashboard' : '/';
  const links = user.role === 'parent' ? parentLinks : user.role === 'child' ? childLinks : [];
  const onAdmin = pathname.startsWith('/admin');
  const showTabs = links.length > 0 && !FOCUS_ROUTES.test(pathname);

  const isActive = (link: NavLink) =>
    [link.href, ...(link.also || [])].some(p => pathname === p || pathname.startsWith(`${p}/`));

  const sideItem = (link: NavLink, onNavigate?: () => void) => {
    const active = isActive(link);
    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors',
          active ? 'bg-brand-soft font-semibold text-ink' : 'font-medium text-ink-muted hover:bg-muted hover:text-ink'
        )}
      >
        <link.icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-brand-text')} aria-hidden="true" />
        {link.label}
      </Link>
    );
  };

  return (
    <div className="app-shell lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Link href={homeHref} aria-label="HiveExcel home"><Logo /></Link>
        </div>

        <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {links.map(link => sideItem(link))}
          {onAdmin && (
            <>
              <p className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Admin</p>
              {adminLinks.map(link => sideItem(link))}
            </>
          )}
        </nav>

        <div className="space-y-1 border-t border-line px-3 py-3">
          {secondaryLinks.map(link => sideItem(link))}
          <div className="flex h-10 items-center justify-between px-3">
            <span className="flex items-center gap-3 text-sm font-medium text-ink-muted">
              <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
              Dark mode
            </span>
            <Switch checked={darkMode} onChange={toggleDarkMode} label="Dark mode" />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-line p-3 pl-4">
          <Avatar name={user.name} image={user.image} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{user.name || 'Account'}</p>
            <p className="truncate text-xs text-ink-subtle">{user.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-subtle transition-colors hover:bg-bad-soft hover:text-bad-text"
          >
            <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="no-print sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur lg:hidden">
        <Link href={homeHref} aria-label="HiveExcel home"><Logo size="sm" /></Link>
        <div className="flex items-center gap-1" ref={menuRef}>
          <button
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-muted hover:text-ink"
          >
            {darkMode ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-muted"
          >
            <Avatar name={user.name} image={user.image} size="sm" />
          </button>

          {menuOpen && (
            <div role="menu" className="absolute right-3 top-[52px] w-64 animate-enter rounded-2xl border border-line bg-surface p-2 shadow-pop">
              <div className="mb-1 border-b border-line px-3 pb-3 pt-2">
                <p className="truncate text-sm font-semibold text-ink">{user.name || 'Account'}</p>
                <p className="truncate text-xs text-ink-subtle">{user.email}</p>
              </div>
              {onAdmin && adminLinks.map(link => sideItem(link, () => setMenuOpen(false)))}
              {secondaryLinks.map(link => sideItem(link, () => setMenuOpen(false)))}
              <button
                role="menuitem"
                onClick={() => { setMenuOpen(false); signOut(); }}
                className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-bad-text transition-colors hover:bg-bad-soft"
              >
                <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className={cn(showTabs && 'pb-20 lg:pb-0')}>{children}</div>

      {/* Phone tab bar */}
      {showTabs && (
        <nav
          aria-label="Primary"
          className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
            {links.map(link => {
              const active = isActive(link);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className="flex h-16 flex-col items-center justify-center gap-1"
                  >
                    <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', active ? 'bg-brand-soft text-brand-text' : 'text-ink-subtle')}>
                      <link.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className={cn('text-[11px] leading-none', active ? 'font-semibold text-ink' : 'font-medium text-ink-muted')}>
                      {link.short || link.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
