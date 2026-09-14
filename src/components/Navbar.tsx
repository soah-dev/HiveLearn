'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface NavLink {
  href: string;
  label: string;
}

const parentLinks: NavLink[] = [
  { href: '/parent/dashboard', label: 'Dashboard' },
  { href: '/parent/create', label: 'Create' },
  { href: '/parent/presets', label: 'Scheduled' },
  { href: '/parent/analytics', label: 'Reports' },
];

const childLinks: NavLink[] = [
  { href: '/child/dashboard', label: 'Dashboard' },
  { href: '/child/practice', label: 'Practice' },
  { href: '/child/sat', label: 'SAT Prep' },
  { href: '/child/badges', label: 'Badges' },
  { href: '/child/leaderboard', label: 'Leaderboard' },
];

const secondaryLinks: NavLink[] = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/settings', label: 'Settings' },
];

function Avatar({ name, image, size = 'sm' }: { name: string | null; image: string | null; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm';
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className={`${dim} rounded-full ring-2 ring-indigo-200 dark:ring-indigo-800 object-cover`} />;
  }
  return (
    <span className={`${dim} rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold`}>
      {(name || '?')[0].toUpperCase()}
    </span>
  );
}

export default function Navbar() {
  const { user, signOut, loading } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close the user dropdown on outside click or Escape
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) setUserMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setUserMenuOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenuOpen]);

  if (loading) return null;

  const homeHref = user?.role === 'parent' ? '/parent/dashboard' : user?.role === 'child' ? '/child/dashboard' : '/';
  const links = user?.role === 'parent' ? parentLinks : user?.role === 'child' ? childLinks : [];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const linkClass = (href: string, mobile = false) => {
    const active = isActive(href);
    const base = mobile
      ? 'flex items-center text-sm font-medium px-3 py-2.5 rounded-lg transition-colors'
      : 'text-sm font-medium px-3 py-2 rounded-lg transition-colors';
    return active
      ? `${base} bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold`
      : `${base} text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20`;
  };

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 px-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-14 gap-3">
        <Link href={homeHref} className="text-xl font-extrabold gradient-text tracking-tight flex-shrink-0">
          HiveExcel
        </Link>

        {/* Desktop nav */}
        {user && links.length > 0 && (
          <div className="hidden md:flex items-center gap-1" aria-label="Primary">
            {links.map(link => (
              <Link key={link.href} href={link.href} className={linkClass(link.href)} aria-current={isActive(link.href) ? 'page' : undefined}>
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* Desktop user menu */}
          {user && (
            <div className="relative hidden md:block" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-colors ${
                  userMenuOpen || isActive('/settings') || isActive('/how-it-works')
                    ? 'bg-indigo-50 dark:bg-indigo-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Avatar name={user.name} image={user.image} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[10rem] truncate">{user.name || 'Account'}</span>
                <svg className={`h-4 w-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 p-2 animate-slide-up"
                >
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name || 'Account'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                  {secondaryLinks.map(link => (
                    <Link key={link.href} href={link.href} role="menuitem" onClick={() => setUserMenuOpen(false)} className={linkClass(link.href, true)}>
                      {link.label}
                    </Link>
                  ))}
                  <button
                    role="menuitem"
                    onClick={() => { setUserMenuOpen(false); signOut(); }}
                    className="w-full text-left text-sm font-medium text-red-600 dark:text-red-400 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile hamburger */}
          {user && (
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
            >
              {menuOpen ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && user && (
        <div id="mobile-nav" className="md:hidden pb-3 border-t border-gray-200/50 dark:border-gray-700/50 pt-3 animate-slide-up">
          <div className="flex items-center gap-3 px-3 pb-3 mb-2 border-b border-gray-100 dark:border-gray-800">
            <Avatar name={user.name} image={user.image} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name || 'Account'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {[...links, ...secondaryLinks].map(link => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={linkClass(link.href, true)} aria-current={isActive(link.href) ? 'page' : undefined}>
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => { setMenuOpen(false); signOut(); }}
              className="text-left text-sm font-medium text-red-600 dark:text-red-400 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
